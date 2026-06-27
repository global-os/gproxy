import { MiddlewareHandler } from 'hono'
import { drizzle } from 'drizzle-orm/node-postgres'
import { db, pool } from './db/index.js'
import { Env } from './types'
import * as schema from './db/schema.js'
import { auth } from './auth.js'

export const isAuthApiPath = (path: string) =>
  path.startsWith('/app/api/auth') || path.startsWith('/api/auth')

export const unlessAuth =
  (mw: MiddlewareHandler<Env>): MiddlewareHandler<Env> =>
  async (c, next) => {
    if (isAuthApiPath(c.req.path)) return next()
    return mw(c, next)
  }

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

export const setIsLocal: MiddlewareHandler<Env> = async (c, next) => {
  const url = new URL(c.req.url)
  c.set('isLocal', url.host === 'localhost' || url.host.startsWith('localhost:'))
  await next()
}

export const logRequest: MiddlewareHandler<Env> = async (c, next) => {
  if (!isAuthApiPath(c.req.path) && c.req.path.startsWith('/instance/')) {
    console.log(`Instance request: ${c.req.method} ${c.req.path}`)
  }
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
  const headers = c.req.raw.headers
  let lastError: unknown

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const session = await auth.api.getSession({ headers })
      c.set('user', session?.user ?? null)
      c.set('session', session?.session ?? null)
      await next()
      return
    } catch (error) {
      lastError = error
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
      }
    }
  }

  console.error('Auth error:', lastError)
  c.set('user', null)
  c.set('session', null)
  await next()
}