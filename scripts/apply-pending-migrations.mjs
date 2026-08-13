import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const { Pool } = pg

/** First migration managed by this deploy pipeline (older dirs were applied via drizzle-kit push). */
const AUTO_MIGRATE_SINCE = '20260626000000_instances'

function listMigrations() {
  const drizzleDir = path.join(process.cwd(), 'drizzle')
  return fs
    .readdirSync(drizzleDir)
    .filter((name) =>
      fs.existsSync(path.join(drizzleDir, name, 'migration.sql'))
    )
    .sort()
    .filter((name) => name >= AUTO_MIGRATE_SINCE)
}

function splitStatements(sql) {
  return sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildPoolConfig(url) {
  const config = { connectionString: url }
  if (process.env.DATABASE_SSL === 'true') {
    config.ssl = { rejectUnauthorized: false }
  }
  return config
}

async function ensureMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

async function loadAppliedMigrations(pool) {
  const result = await pool.query('SELECT name FROM app_migrations')
  return new Set(result.rows.map((row) => row.name))
}

async function main() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    if (process.env.VERCEL) {
      console.error(
        'DATABASE_URL is required for Vercel builds (set it in project env vars).'
      )
      process.exit(1)
    }
    console.warn('[migrate] Skipping: DATABASE_URL is not set')
    return
  }

  const migrations = listMigrations()
  if (migrations.length === 0) {
    console.log('[migrate] No eligible migration.sql files found')
    return
  }

  const pool = new Pool(buildPoolConfig(url))

  try {
    await pool.query('SELECT 1')
    await ensureMigrationTable(pool)
    const applied = await loadAppliedMigrations(pool)
    console.log(
      `[migrate] Connected (${migrations.length} eligible, ${applied.size} already recorded)`
    )

    for (const dir of migrations) {
      if (applied.has(dir)) {
        console.log(`\n=== ${dir} === SKIP (recorded)`)
        continue
      }

      const file = path.join('drizzle', dir, 'migration.sql')
      const sql = fs.readFileSync(file, 'utf8')
      console.log(`\n=== ${dir} ===`)
      for (const statement of splitStatements(sql)) {
        try {
          await pool.query(statement)
          console.log('OK:', statement.split('\n')[0].slice(0, 80))
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (/already exists|duplicate/i.test(msg)) {
            console.log('SKIP (exists):', msg)
          } else {
            throw err
          }
        }
      }

      await pool.query('INSERT INTO app_migrations (name) VALUES ($1)', [dir])
      console.log('RECORDED:', dir)
    }

    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `)
    console.log(
      '\n[migrate] Tables:',
      tables.rows.map((r) => r.table_name).join(', ')
    )
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[migrate] Failed:', err)
  process.exit(1)
})
