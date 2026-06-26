import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const { Pool } = pg

const MIGRATIONS = [
  '20260626000000_instances',
  '20260626120000_drop_proxy_columns',
  '20260627000000_workspace_windows',
]

function splitStatements(sql) {
  return sql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean)
}

async function main() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  })

  try {
    await pool.query('SELECT 1')
    console.log('Connected')

    for (const dir of MIGRATIONS) {
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
    }

    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `)
    console.log('\nTables:', tables.rows.map(r => r.table_name).join(', '))
  } finally {
    await pool.end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})