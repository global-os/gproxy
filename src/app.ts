import fs from 'fs'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import path from 'path'
import { serveStatic } from '@hono/node-server/serve-static'
import { getPath } from 'hono/utils/url'
import { eq } from 'drizzle-orm'

import * as schema from './db/schema.js'
import * as middleware from './middleware.js'
import { Env } from './types'
import { replaceDomainInHTML } from './replace.js'
import { pathFromHostnameAndPath } from './utils.js'
import authRoutes from './routes/auth.js'
import fsRoutes from './routes/fs.js'
import { checkAuthTables, pingDatabase, pingPool, pool, probeDrizzleUserLookup, probeUserLookup } from './db/index.js'

const app = new Hono<Env>({
  getPath(request, options) {
    const path = getPath(request)
    const { hostname } = new URL(request.url)

    console.log('getPath called - hostname:', hostname, 'path:', path)

    const resolved = pathFromHostnameAndPath(hostname, path)
    console.log('resolved:', resolved)
    return resolved
  },
})

app.use(logger())

app.get('/www', async (c) => {
  const htmlPath = path.join(process.cwd(), 'src/landing.html')
  const html = fs.readFileSync(htmlPath, 'utf-8')
  return c.html(html)
})

app.get('/www-assets/*', async (c) => {
  const relativePath = c.req.path.replace(/^\/www-assets\//, '')
  const filePath = path.join(process.cwd(), 'src/www/dist', relativePath)
  if (!filePath.startsWith(path.join(process.cwd(), 'src/www/dist')) || !fs.existsSync(filePath)) {
    return c.notFound()
  }
  return c.body(fs.readFileSync(filePath), 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=31536000, immutable',
  })
})

app.get('/www-redirect', (c) => c.redirect('https://www.onetrueos.com', 301))
app.get('/vercel-git-redirect', (c) => c.redirect('https://app.app.onetrueos.com', 301))

app.get('/debug', async (c) => {
  const poolStart = Date.now()
  let poolOk = false, poolMs = 0, poolError: string | undefined, tables: string[] = []

  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10_000)),
    ])
    poolOk = true
    poolMs = Date.now() - poolStart

    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `)
    tables = result.rows.map((r: { table_name: string }) => r.table_name)
  } catch (err) {
    poolMs = Date.now() - poolStart
    poolError = err instanceof Error ? err.message : String(err)
  }

  let migrations: { latest: string | null; count: number } | { error: string } = { latest: null, count: 0 }
  try {
    const m = await pool.query(`SELECT name FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`)
    const count = await pool.query(`SELECT COUNT(*) FROM drizzle.__drizzle_migrations`)
    migrations = { latest: m.rows[0]?.name ?? null, count: parseInt(count.rows[0].count) }
  } catch {
    try {
      const m = await pool.query(`SELECT name FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1`)
      const count = await pool.query(`SELECT COUNT(*) FROM __drizzle_migrations`)
      migrations = { latest: m.rows[0]?.name ?? null, count: parseInt(count.rows[0].count) }
    } catch (err2) {
      migrations = { error: err2 instanceof Error ? err2.message : String(err2) }
    }
  }

  const dbHost = (() => {
    try { return new URL(process.env.DATABASE_URL!.replace(/^postgres(ql)?:\/\/[^@]+@/, 'https://')).hostname } catch { return null }
  })()

  const [userLookup, drizzleUserLookup] = await Promise.all([
    probeUserLookup(),
    probeDrizzleUserLookup(),
  ])

  return c.json({
    pool: { ok: poolOk, ms: poolMs, ...(poolError ? { error: poolError } : {}) },
    userLookup,
    drizzleUserLookup,
    tables,
    migrations,
    env: {
      DATABASE_SSL: process.env.DATABASE_SSL,
      NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      dbHost,
      nodeVersion: process.version,
    },
  }, poolOk ? 200 : 503)
})

app.get('/health', async (c) => {
  const [direct, pooled, authTables, userLookup] = await Promise.all([
    pingDatabase(),
    pingPool(),
    checkAuthTables(),
    probeUserLookup(),
  ])
  const ok = direct.ok && pooled.ok && authTables.ok && userLookup.ok
  return c.json({
    status: ok ? 'ok' : 'degraded',
    database: direct,
    pool: pooled,
    authTables,
    userLookup,
  }, ok ? 200 : 503)
})

app.use(
  '/instance/**',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.selectTargetHost,
  middleware.logRequest
)

app.use(
  '/app/**',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.unlessAuth(middleware.selectTargetHost),
  middleware.unlessAuth(middleware.betterAuthMiddleware),
  middleware.unlessAuth(middleware.setRlsUser),
  middleware.logRequest
)

app.use(
  '/app/api/sessions',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.selectTargetHost,
  middleware.betterAuthMiddleware,
  middleware.logRequest
)

app.basePath('/app/api/auth').route('/', authRoutes)
app.basePath('/app/api/fs').route('/', fsRoutes)

app.get('/app/api/sessions', async (c) => {
  console.log('=== GET /app/api/sessions ===')
  const db = c.get('db')
  const user = c.get('user')

  console.log('db:', !!db)
  console.log('user:', !!user, user?.id)

  if (!user) {
    return Response.json([])
  }

  console.log('get rows')

  const rows = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.user_id, user.id))

  console.log('get rows: ', rows)

  return Response.json(rows)
})

app.post('/app/api/sessions', async (c) => {
  const db = c.get('db')
  const user = c.get('user')

  await db.insert(schema.sessions).values({
    user_id: user!.id,
    name: 'bar',
  })

  return c.body(null, 200)
})

const frontendDist = path.join(process.cwd(), 'src/frontend/dist')

const assetContentTypes: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
}

app.get('/assets/*', async (c) => {
  const relativePath = c.req.path.replace(/^\//, '')
  const filePath = path.join(frontendDist, relativePath)

  if (!filePath.startsWith(frontendDist) || !fs.existsSync(filePath)) {
    console.error('Asset not found:', relativePath, 'cwd:', process.cwd())
    return c.notFound()
  }

  const ext = path.extname(filePath)
  const contentType = assetContentTypes[ext] ?? 'application/octet-stream'

  return c.body(fs.readFileSync(filePath), 200, {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
  })
})

app.use(
  '/static/*',
  serveStatic({
    root: frontendDist,
    rewriteRequestPath: (path) => path.replace(/^\/static/, ''),
  })
)

app.all('/instance/*', async (c) => {
  const targetHost = c.get('targetHost')
  const url = new URL(c.req.url)
  const host = url.host

  const targetUrl = `https://${targetHost}${url.pathname}${url.search}`

  const db = c.get('db')

  try {
    const requestHeaders: Record<string, string> = {}

    c.req.raw.headers.forEach((value, key) => {
      requestHeaders[key] = value
    })

    requestHeaders['host'] = targetHost

    const hasBody = c.req.method !== 'GET' && c.req.method !== 'HEAD'

    const fetchOptions: RequestInit = {
      method: c.req.method,
      headers: requestHeaders,
      redirect: 'manual',
    }

    if (hasBody) {
      const bodyData = await c.req.arrayBuffer()

      if (bodyData.byteLength > 0) {
        fetchOptions.body = bodyData
      }
    }

    const response = await fetch(targetUrl, fetchOptions)

    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('content-length')

    responseHeaders.delete('content-security-policy')
    responseHeaders.delete('content-security-policy-report-only')
    responseHeaders.delete('x-frame-options')
    responseHeaders.delete('strict-transport-security')

    console.log(
      'Set-Cookie headers:',
      response.headers.getSetCookie?.() || 'none'
    )

    const init = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    }

    let nextResponse = new Response(response.body, init)

    if (response.body) {
      const text = await response.text()
      const transformed = replaceDomainInHTML(
        text,
        targetHost,
        host,
        c.get('isLocal')
      )

      nextResponse = new Response(transformed, {
        ...init,
      })
    }

    return nextResponse
  } catch (error) {
    console.error('Proxy error:', error)
    return c.text('Proxy error occurred', 500)
  }
})

;['/app/*', '/app/**', '/app'].forEach((route) => {
  app.get(route, async (c) => {
    console.log('app route')

    const htmlPath = path.join(process.cwd(), 'src/frontend/dist/index.html')
    const html = fs.readFileSync(htmlPath, 'utf-8')

    return c.html(html)
  })
})

export default app
