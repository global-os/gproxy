import fs from 'fs'
import type { HttpBindings } from '@hono/node-server'
import type { IncomingMessage } from 'node:http'
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
import { auth } from './auth.js'
import authRoutes from './routes/auth.js'
import fsRoutes from './routes/fs.js'
import programsRoutes from './routes/programs.js'
import { ensureInstanceReady, touchInstance } from './runtime/instance-manager.js'
import { INSTANCE_MIME, resolveCachedInstanceFile } from './runtime/instance-content.js'
import { instanceSlugFromHostname, stripInstancePrefix } from './runtime/instance-proxy.js'
import { benchmarkScrypt } from './crypto/password.js'
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

  const [userLookup, drizzleUserLookup, scrypt] = await Promise.all([
    probeUserLookup(),
    probeDrizzleUserLookup(),
    benchmarkScrypt(),
  ])

  const authProbeStart = Date.now()
  let authProbe: { ok: boolean; ms: number; url?: string; status?: number; error?: string; body?: string } = {
    ok: false,
    ms: 0,
  }
  const probeUrl = new URL('/api/auth/sign-in/email', c.req.url)
  try {
    const probeRequest = new Request(probeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: probeUrl.origin,
      },
      body: JSON.stringify({ email: 'nobody-probe@example.com', password: 'wrongpassword' }),
    })
    const probeResponse = await Promise.race([
      auth.handler(probeRequest),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('auth probe timeout')), 10_000)
      ),
    ])
    const body = await probeResponse.text()
    authProbe = {
      ok: true,
      ms: Date.now() - authProbeStart,
      status: probeResponse.status,
      url: probeUrl.toString(),
      body: body.slice(0, 200),
    }
  } catch (err) {
    authProbe = {
      ok: false,
      ms: Date.now() - authProbeStart,
      url: probeUrl.toString(),
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const requiredTables = ['instances', 'workspace_window']
  const staleTables = ['process_domains']
  const tableSet = new Set(tables)
  const schema = {
    ok: requiredTables.every(t => tableSet.has(t)) && !staleTables.some(t => tableSet.has(t)),
    missing: requiredTables.filter(t => !tableSet.has(t)),
    stale: staleTables.filter(t => tableSet.has(t)),
  }

  return c.json({
    pool: { ok: poolOk, ms: poolMs, ...(poolError ? { error: poolError } : {}) },
    userLookup,
    drizzleUserLookup,
    scrypt,
    authProbe,
    requestEnv: {
      hasIncoming: Boolean((c.env as HttpBindings | undefined)?.incoming),
      hasRawBody: Buffer.isBuffer(
        ((c.env as HttpBindings | undefined)?.incoming as IncomingMessage & { rawBody?: Buffer })
          ?.rawBody
      ),
    },
    tables,
    schema,
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

app.basePath('/app/api/auth').route('/', authRoutes)

app.use('/instance/**', middleware.provideDb, middleware.setIsLocal, middleware.logRequest)

app.use(
  '/app/**',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.unlessAuth(middleware.betterAuthMiddleware),
  middleware.unlessAuth(middleware.setRlsUser),
  middleware.logRequest
)

app.use(
  '/app/api/sessions',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.betterAuthMiddleware,
  middleware.logRequest
)

app.basePath('/app/api/fs').route('/', fsRoutes)
app.basePath('/app/api').route('/', programsRoutes)

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

  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  await db.insert(schema.sessions).values({
    user_id: user.id,
    name: 'bar',
  })

  const rows = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.user_id, user.id))

  return c.json(rows)
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
  const url = new URL(c.req.url)
  const slug = instanceSlugFromHostname(url.hostname)
  const instanceId = Number.parseInt(slug, 10)

  if (!Number.isFinite(instanceId)) {
    return c.json({ message: 'Invalid instance' }, 400)
  }

  const ready = await ensureInstanceReady(instanceId)
  if (!ready) {
    return c.json({ message: 'Instance not available' }, 502)
  }

  void touchInstance(instanceId).catch(() => {})

  const upstreamPath = stripInstancePrefix(url.pathname, slug)
  const filePath = resolveCachedInstanceFile(instanceId, upstreamPath)
  if (!filePath) {
    return c.notFound()
  }

  const ext = path.extname(filePath)
  const contentType = INSTANCE_MIME[ext] ?? 'application/octet-stream'

  console.log(`[instance] ${c.req.method} ${url.pathname} -> ${filePath}`)

  if (contentType.includes('text/html')) {
    const text = fs.readFileSync(filePath, 'utf-8')
    const transformed = replaceDomainInHTML(text, 'localhost', url.host, c.get('isLocal'))
    return c.html(transformed)
  }

  return c.body(fs.readFileSync(filePath), 200, { 'Content-Type': contentType })
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
