import fs from 'fs'
import path from 'path'
import { Pool, Client, type PoolConfig } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

import * as schema from './schema.js'

const isServerless = Boolean(process.env.VERCEL)

function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return undefined

  let result = url

  if (process.env.DATABASE_SSL === 'true') {
    result = result.replace(/([?&])sslmode=[^&]*/i, '$1sslmode=require')
    if (!/[?&]sslmode=/i.test(result)) {
      result += (result.includes('?') ? '&' : '?') + 'sslmode=require'
    }
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
    idleTimeoutMillis: isServerless ? 5_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: isServerless,
  }

  if (sslEnabled) {
    try {
      const ca = fs.readFileSync(path.join(process.cwd(), 'certs/ca.pem'), 'utf-8')
      config.ssl = { rejectUnauthorized: true, ca }
    } catch {
      config.ssl = { rejectUnauthorized: false }
    }
  }

  if (process.env.DATABASE_IPV4 === 'true') {
    ;(config as PoolConfig & { family?: number }).family = 4
  }

  return config
}

// Create connection pool
export const pool = new Pool(buildPoolConfig())

export const db = drizzle({ schema, client: pool })

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export async function pingDatabase(timeoutMs = 5_000): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: 'DATABASE_URL is not set' }
  }

  const client = new Client(buildPoolConfig())
  try {
    await Promise.race([
      (async () => { await client.connect(); await client.query('SELECT 1') })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Database ping timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ])
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database connection failed'
    return { ok: false, error: message }
  } finally {
    await client.end().catch(() => {})
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