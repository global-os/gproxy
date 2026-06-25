import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

import * as schema from './schema.js'

const isServerless = Boolean(process.env.VERCEL)

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4, // force IPv4 — Supabase direct connection returns IPv6 which may be unreachable locally
  max: isServerless ? 1 : 10,
  idleTimeoutMillis: isServerless ? 5_000 : 30_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: isServerless,
}

// Create connection pool
export const pool = new Pool(dbConfig)

export const db = drizzle({ schema, client: pool })

// Test connection on startup
export async function testConnection() {
  console.log('testing conn')

  try {
    const result = await Promise.race([
      pool.query('SELECT 1'),
      new Promise((res) => {
        setTimeout(() => {
          res('timeout')
        }, 3000)
      }),
    ])

    if (result === 'timeout') {
      console.error('Database connection failed -- timed out')
    } else {
      console.log('Connected to db successfully')
    }
  } catch (error) {
    console.error('Database connection failed:', error)
    throw error
  }
}
