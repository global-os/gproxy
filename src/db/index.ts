import { Pool, Client, type PoolConfig } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

import { eq } from 'drizzle-orm'

import * as schema from './schema.js'

const isServerless = Boolean(process.env.VERCEL)

function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return undefined

  let result = url

  if (process.env.DATABASE_SSL === 'true') {
    result = result.replace(/[?&]sslmode=[^&]*/i, '').replace(/\?&/, '?').replace(/[?&]$/, '')
  }

  if (!result.includes('connect_timeout=')) {
    result += (result.includes('?') ? '&' : '?') + 'connect_timeout=10'
  }

  return result
}

function sslModeFromUrl(url: string | undefined): 'disable' | 'require' | null {
  if (!url) return null
  const match = url.match(/(?:^|[?&])sslmode=([^&]+)/i)
  if (!match) return null
  const mode = decodeURIComponent(match[1]).toLowerCase()
  if (mode === 'disable') return 'disable'
  if (['require', 'verify-ca', 'verify-full', 'prefer'].includes(mode)) return 'require'
  return null
}

function buildPoolConfig(): PoolConfig {
  const connectionString = resolveDatabaseUrl()
  const urlSslMode = sslModeFromUrl(connectionString)
  const sslEnabled =
    process.env.DATABASE_SSL === 'true' || urlSslMode === 'require'
      ? true
      : process.env.DATABASE_SSL === 'false' || urlSslMode === 'disable'
        ? false
        : true

  const config: PoolConfig = {
    connectionString,
    max: isServerless ? 1 : 10,
    idleTimeoutMillis: isServerless ? 1_000 : 30_000,
    connectionTimeoutMillis: isServerless ? 5_000 : 10_000,
    allowExitOnIdle: isServerless,
    options: isServerless ? '-c statement_timeout=7000' : undefined,
  }

  if (sslEnabled) {
    config.ssl = { rejectUnauthorized: false }
  }

  if (process.env.DATABASE_IPV4 === 'true') {
    ;(config as PoolConfig & { family?: number }).family = 4
  }

  return config
}

// Create connection pool
export const pool = new Pool(buildPoolConfig())

pool.on('error', (err) => {
  console.error('Pool error:', err.message)
})
pool.on('connect', () => console.log('Pool: new connection established'))
pool.on('acquire', () => console.log('Pool: connection acquired'))
pool.on('remove', () => console.log('Pool: connection removed'))

export const db = drizzle({ schema, client: pool })

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim())
}

type PingResult = { ok: true; ms: number } | { ok: false; error: string; ms: number }

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

export async function pingDatabase(timeoutMs = 5_000): Promise<PingResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: 'DATABASE_URL is not set', ms: 0 }
  }

  const start = Date.now()
  const client = new Client(buildPoolConfig())
  try {
    await withTimeout(
      (async () => {
        await client.connect()
        await client.query('SELECT 1')
      })(),
      timeoutMs,
      'Database ping'
    )
    return { ok: true, ms: Date.now() - start }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database connection failed'
    return { ok: false, error: message, ms: Date.now() - start }
  } finally {
    await client.end().catch(() => {})
  }
}

export async function pingPool(timeoutMs = 5_000): Promise<PingResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: 'DATABASE_URL is not set', ms: 0 }
  }

  const start = Date.now()
  try {
    await withTimeout(pool.query('SELECT 1'), timeoutMs, 'Pool ping')
    return { ok: true, ms: Date.now() - start }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pool query failed'
    return { ok: false, error: message, ms: Date.now() - start }
  }
}

export async function probeDrizzleUserLookup(
  email = 'nobody@example.com',
  timeoutMs = 5_000,
): Promise<PingResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: 'DATABASE_URL is not set', ms: 0 }
  }

  const start = Date.now()
  try {
    await withTimeout(
      db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, email))
        .limit(1),
      timeoutMs,
      'Drizzle user lookup',
    )
    return { ok: true, ms: Date.now() - start }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Drizzle user lookup failed'
    return { ok: false, error: message, ms: Date.now() - start }
  }
}

export async function probeUserLookup(
  email = 'nobody@example.com',
  timeoutMs = 5_000,
): Promise<PingResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: 'DATABASE_URL is not set', ms: 0 }
  }

  const start = Date.now()
  try {
    await withTimeout(
      pool.query('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [email]),
      timeoutMs,
      'User lookup',
    )
    return { ok: true, ms: Date.now() - start }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'User lookup failed'
    return { ok: false, error: message, ms: Date.now() - start }
  }
}

export async function checkAuthTables(timeoutMs = 5_000): Promise<PingResult & { tables?: { user: boolean; account: boolean; session: boolean } }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: 'DATABASE_URL is not set', ms: 0 }
  }

  const start = Date.now()
  try {
    const result = await withTimeout(
      pool.query<{ user: boolean; account: boolean; session: boolean }>(
        `SELECT
          to_regclass('public.user') IS NOT NULL AS "user",
          to_regclass('public.account') IS NOT NULL AS account,
          to_regclass('public.session') IS NOT NULL AS session`
      ),
      timeoutMs,
      'Auth table check'
    )
    const tables = result.rows[0]
    const ok = Boolean(tables?.user && tables?.account && tables?.session)
    if (!ok) {
      return {
        ok: false,
        error: 'Auth tables are missing. Run drizzle-kit push against this database.',
        ms: Date.now() - start,
        tables,
      }
    }
    return { ok: true, ms: Date.now() - start, tables }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Auth table check failed'
    return { ok: false, error: message, ms: Date.now() - start }
  }
}

// Test connection on startup
export async function testConnection() {
  console.log('testing conn')

  const result = await pingDatabase(3_000)
  if (!result.ok) {
    console.error('Database connection failed:', result.error)
    return
  }

  console.log('Connected to db successfully')
}