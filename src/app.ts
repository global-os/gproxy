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
  middleware.selectTargetHost,
  middleware.betterAuthMiddleware,
  middleware.setRlsUser,
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

app.use(
  '/static/*',
  serveStatic({
    root: path.join(process.cwd(), 'src/frontend/dist'),
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
