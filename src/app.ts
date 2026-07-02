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
import globalPcRoutes from './routes/global-pc.js'
import syscallsRoutes from './routes/syscalls.js'
import programsRoutes from './routes/programs.js'
import adminRoutes from './routes/admin.js'
import webviewRoutes from './routes/webviews.js'
import visitsRoutes from './routes/visits.js'
import { resolveWebviewBySlug } from './runtime/webview/resolve.js'
import { proxyWebviewRequest } from './runtime/webview/proxy.js'
import { ensureGlobalPcForUser } from './services/global-pc.js'
import { isBundleCached } from './runtime/cache/store.js'
import { resolveInstanceBundleFile } from './runtime/cache/serve.js'
import { scheduleInstancePrepare } from './runtime/instance/background.js'
import { ensureInstanceReady, touchInstance } from './runtime/instance/manager.js'
import { instanceLoadingPage } from './runtime/instance/loading-page.js'
import { getInstancePrepareStatus } from './runtime/instance/prepare-progress.js'
import { resolveInstanceIdBySlug } from './runtime/instance/resolve.js'
import { INSTANCE_MIME } from './runtime/tar/mime.js'
import { instanceSlugFromHostname, stripInstancePrefix } from './runtime/urls.js'
import { getBuildVersion } from './build-version.js'
import { frontendDistRoot, readFrontendFile, resolveFrontendFile } from './frontend-paths.js'
import { resolveStorybookFile } from './storybook-paths.js'
import { benchmarkScrypt } from './crypto/password.js'
import { checkAppTables, checkAuthTables, pingDatabase, pingPool, pool, probeDrizzleUserLookup, probeUserLookup } from './db/index.js'
import { checkConfig, checkFrontendBundle, checkProxyUrl, probeAuthHandler } from './health-checks.js'
import { LaunchError } from './services/errors.js'
import { deleteWorkspace } from './services/workspace-access.js'
import { readRegistryLib } from './gapp/resolve-lib-deps.js'

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
  const html = fs
    .readFileSync(htmlPath, 'utf-8')
    .replace('<!-- GLOBALOS_VERSION -->', getBuildVersion().label)
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
  const config = checkConfig()
  const frontend = checkFrontendBundle()
  const proxy = checkProxyUrl()

  const [direct, pooled, authTables, appTables, userLookup, authProbe] = await Promise.all([
    pingDatabase(),
    pingPool(),
    checkAuthTables(),
    checkAppTables(),
    probeUserLookup(),
    probeAuthHandler(c.req.url),
  ])

  const ok =
    config.ok &&
    frontend.ok &&
    proxy.ok &&
    direct.ok &&
    pooled.ok &&
    authTables.ok &&
    appTables.ok &&
    userLookup.ok &&
    authProbe.ok

  return c.json(
    {
      status: ok ? 'ok' : 'degraded',
      config,
      frontend,
      proxy,
      database: direct,
      pool: pooled,
      authTables,
      appTables,
      userLookup,
      authProbe,
    },
    ok ? 200 : 503
  )
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
  '/app/api/workspaces',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.betterAuthMiddleware,
  middleware.logRequest
)

app.use(
  '/app/api/visits',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.betterAuthMiddleware,
  middleware.logRequest
)

app.basePath('/app/api/fs').route('/', fsRoutes)
app.basePath('/app/api/global-pc').route('/', globalPcRoutes)
app.basePath('/app/api/syscalls').route('/', syscallsRoutes)
app.basePath('/app/api/admin').route('/', adminRoutes)
app.basePath('/app/api/webviews').route('/', webviewRoutes)
app.basePath('/app/api/visits').route('/', visitsRoutes)
app.basePath('/app/api').route('/', programsRoutes)

app.get('/app/api/workspaces', async (c) => {
  const db = c.get('db')
  const user = c.get('user')

  if (!user) {
    return Response.json([])
  }

  const rows = await db
    .select()
    .from(schema.workspace)
    .where(eq(schema.workspace.user_id, user.id))

  return Response.json(rows)
})

app.post('/app/api/workspaces', async (c) => {
  const db = c.get('db')
  const user = c.get('user')

  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const globalPcId = await ensureGlobalPcForUser(db, user.id)

  await db.insert(schema.workspace).values({
    user_id: user.id,
    global_pc_id: globalPcId,
    name: 'bar',
  })

  const rows = await db
    .select()
    .from(schema.workspace)
    .where(eq(schema.workspace.user_id, user.id))

  return c.json(rows)
})

app.delete('/app/api/workspaces/:workspaceId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  const workspaceId = Number.parseInt(c.req.param('workspaceId'), 10)
  if (!Number.isFinite(workspaceId)) {
    return c.json({ message: 'Invalid workspace id' }, 400)
  }

  try {
    await deleteWorkspace(user.id, workspaceId)
    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof LaunchError) {
      return c.json({ message: err.message }, err.status as 404)
    }
    console.error('[workspaces] delete failed:', err)
    return c.json({ message: 'Failed to delete workspace' }, 500)
  }
})

const assetContentTypes: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
}

const storybookContentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

app.use(
  '/storybook',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.betterAuthMiddleware,
  middleware.requireAdmin,
)

app.get('/storybook', (c) => c.redirect('/storybook/'))

app.get('/storybook/*', async (c) => {
  const relativePath = c.req.path.replace(/^\/storybook\/?/, '') || 'index.html'
  const filePath = resolveStorybookFile(relativePath)

  if (!filePath) {
    return c.notFound()
  }

  const ext = path.extname(filePath)
  const contentType = storybookContentTypes[ext] ?? 'application/octet-stream'

  return c.body(fs.readFileSync(filePath), 200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
})

app.get('/assets/*', async (c) => {
  const relativePath = c.req.path.replace(/^\//, '')
  const filePath = resolveFrontendFile(relativePath)

  if (!filePath) {
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
    root: frontendDistRoot,
    rewriteRequestPath: (path) => path.replace(/^\/static/, ''),
  })
)

app.all('/instance/*', async (c) => {
  const url = new URL(c.req.url)
  const slug = instanceSlugFromHostname(url.hostname)
  const instanceId = await resolveInstanceIdBySlug(slug)

  const upstreamPath = stripInstancePrefix(url.pathname, slug)

  if (instanceId === null) {
    const webview = await resolveWebviewBySlug(slug)
    if (!webview) return c.json({ message: 'Not found' }, 404)
    console.log(`[webview-route] slug=${slug} path=${upstreamPath} cookies=${c.req.raw.headers.get('cookie') ? c.req.raw.headers.get('cookie')!.split(';').length : 0}`)
    return proxyWebviewRequest(webview.domain, upstreamPath, c.req.raw)
  }

  if (upstreamPath === '/_status') {
    scheduleInstancePrepare(instanceId)
    const cached = await isBundleCached(instanceId)
    return c.json(getInstancePrepareStatus(instanceId, cached))
  }

  // Platform libs: /platform/libs/{name}@{version}.js — served from the registry,
  // never bundled into the instance tar. Versioned URLs are immutable.
  const libMatch = upstreamPath.match(/^\/platform\/libs\/([a-z][a-z0-9-]*)@(\d+\.\d+\.\d+)\.js$/)
  if (libMatch) {
    const [, name, version] = libMatch
    const content = await readRegistryLib(name, version)
    if (!content) return c.notFound()
    return c.body(new Uint8Array(content), 200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  }

  const wantsHtml =
    upstreamPath === '/' ||
    upstreamPath === '/index.html' ||
    upstreamPath.endsWith('/')

  scheduleInstancePrepare(instanceId)

  const cached = await isBundleCached(instanceId)
  if (!cached && wantsHtml) {
    return c.html(instanceLoadingPage())
  }

  const ready = await ensureInstanceReady(instanceId)
  if (!ready) {
    if (wantsHtml) return c.html(instanceLoadingPage())
    return c.json({ message: 'Instance starting' }, 503, { 'Retry-After': '2' })
  }

  void touchInstance(instanceId).catch(() => {})

  const file = await resolveInstanceBundleFile(instanceId, upstreamPath)
  if (!file) {
    return c.notFound()
  }

  const ext = path.extname(file.path)
  const contentType = INSTANCE_MIME[ext] ?? 'application/octet-stream'

  console.log(`[instance] ${c.req.method} ${url.pathname} -> ${file.path}`)

  if (contentType.includes('text/html')) {
    const text = file.data.toString('utf-8')
    const transformed = replaceDomainInHTML(text, 'localhost', url.host, c.get('isLocal'))
    return c.html(transformed)
  }

  return c.body(new Uint8Array(file.data), 200, { 'Content-Type': contentType })
})

;['/app/*', '/app/**', '/app'].forEach((route) => {
  app.get(route, async (c) => {
    console.log('app route')

    const html = readFrontendFile('index.html')
    if (!html) {
      console.error('Frontend index.html missing from public/ and dist/')
      return c.text('Frontend bundle missing', 500)
    }

    return c.html(html, 200, {
      'Cache-Control': 'no-cache',
    })
  })
})

export default app
