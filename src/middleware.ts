import { MiddlewareHandler } from 'hono'
import { drizzle } from 'drizzle-orm/node-postgres'
import { db, pool } from './db/index.js'
import { Env } from './types'
import * as schema from './db/schema.js'
import { eq } from 'drizzle-orm'
import { pathFromHostnameAndPath } from './utils'
import { auth } from './auth.js'

export const provideDb: MiddlewareHandler<Env> = async (c, next) => {
  c.set('db', db)
  await next()
}

// Middleware: Parse cookies from header
export const parseCookies: MiddlewareHandler<Env> = async (c, next) => {
  const cookies: Record<string, string> = {}
  const cookieHeader = c.req.header('cookie')

  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const [key, value] = cookie.trim().split('=')
      if (key && value) {
        cookies[key] = value
      }
    })
  }

  c.set('cookies', cookies)
  await next()
}

// Middleware: Select target host based on user cookie
export const selectTargetHost: MiddlewareHandler<Env> = async (c, next) => {
  const cookies = c.get('cookies')

  const url = new URL(c.req.url)
  const initialPart = url.host.split('.')[0]
  const db = c.get('db')

  // const newPath = pathFromHostnameAndPath(url.hostname, c.req.path)
  // console.log('requested path is', newPath)

  const rows = await db
    .select()
    .from(schema.processDomains)
    .where(eq(schema.processDomains.slug, initialPart))

  let targetHost = ''
  if (rows.length === 1) {
    targetHost = rows[0].cleartext
  }

  c.set('isLocal', false)
  if (url.host === 'localhost' || url.host.startsWith('localhost:')) {
    targetHost = 'news.ycombinator.com'
    c.set('isLocal', true)
  }

  c.set('targetHost', targetHost)
  await next()
}

// Middleware: Log the proxied request
export const logRequest: MiddlewareHandler<Env> = async (c, next) => {
  const targetHost = c.get('targetHost')
  console.log(`Proxying: ${c.req.path} -> https://${targetHost}${c.req.path}`)
  await next()
}

export const setRlsUser: MiddlewareHandler<Env> = async (c, next) => {
  const user = c.get('user')
  if (!user) {
    await next()
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT set_config($1, $2, true)', ['app.user_id', user.id])
    c.set('db', drizzle({ client, schema }) as any)
    await next()
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export const betterAuthMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    })
    
    c.set('user', session?.user ?? null)
    c.set('session', session?.session ?? null)
  } catch (error) {
    console.error('Auth error:', error)
    c.set('user', null)
    c.set('session', null)
  }
  
  await next()
}