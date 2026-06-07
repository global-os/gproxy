import dotenv from 'dotenv'

import fs from 'fs'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import path from 'path'
import { serveStatic } from '@hono/node-server/serve-static'
import { getPath } from 'hono/utils/url'
import { serve } from '@hono/node-server'

import * as schema from './db/schema.js'
import { testConnection } from './db/index.js'
import * as middleware from './middleware.js'
import { Env } from './types'
import { replaceDomainInHTML } from './replace.js'
import { pathFromHostnameAndPath } from './utils.js'
import authRoutes from './routes/auth.js'
import { eq } from 'drizzle-orm'

dotenv.config() // Loads .env from root

const app = new Hono<Env>({
  getPath(request, options) {
    const path = getPath(request)
    const { hostname } = new URL(request.url)

    console.log('getPath called - hostname:', hostname, 'path:', path)

    try {
      const resolved = pathFromHostnameAndPath(hostname, path)
      console.log('resolved:', resolved)
      return resolved
    } catch (e) {
      console.error('getPath error:', e)
      throw e
    }
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
    // Build clean headers
    const requestHeaders: Record<string, string> = {}

    // Copy only safe headers
    const safeHeaders = [
      'accept',
      'accept-language',
      'accept-encoding',
      'user-agent',
      'referer',
      'cache-control',
      'cookie', // Forward cookies to target
      'content-type', // Important for POST requests
    ]

    c.req.raw.headers.forEach((value, key) => {
      // if (safeHeaders.includes(key.toLowerCase())) {
      requestHeaders[key] = value
      // }
    })

    // Set the correct host
    requestHeaders['host'] = targetHost

    // Handle request body for POST/PUT/PATCH
    const hasBody = c.req.method !== 'GET' && c.req.method !== 'HEAD'

    const fetchOptions: RequestInit = {
      method: c.req.method,
      headers: requestHeaders,
      redirect: 'manual',
    }

    if (hasBody) {
      // Read the body as an ArrayBuffer instead of streaming
      const bodyData = await c.req.arrayBuffer()

      if (bodyData.byteLength > 0) {
        fetchOptions.body = bodyData
      }
    }

    const response = await fetch(targetUrl, fetchOptions)

    // Node's fetch automatically decompresses, so remove encoding headers
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('content-length') // Wrong after decompression

    // Remove security headers that break proxying
    responseHeaders.delete('content-security-policy')
    responseHeaders.delete('content-security-policy-report-only')
    responseHeaders.delete('x-frame-options')
    responseHeaders.delete('strict-transport-security')

    // Handle set-cookie specially (it can have multiple values)
    // Note: For cookies to work across domains, we'd need to rewrite them

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

    // If you have a Response object
    if (response.body) {
      const text = await response.text()
      const transformed = replaceDomainInHTML(
        text,
        targetHost,
        host,
        c.get('isLocal')
      )

      // Create new response with transformed body
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

    // Just serve the index.html that Vite built
    const htmlPath = path.join(process.cwd(), 'src/frontend/dist/index.html')
    const html = fs.readFileSync(htmlPath, 'utf-8')

    return c.html(html)
  })
})

async function main() {
  await testConnection()

  serve(
    {
      fetch: (request, ...args) => {
        console.log('=== FETCH CALLED ===')
        console.log('Request URL:', request.url)
        console.log('Request method:', request.method)
        return app.fetch(request, ...args)
      },
      port: Number(process.env.PORT) || 3000,
    },
    (info) => {
      console.log(`Server running on http://localhost:${info.port}`)
    }
  )
}

main()

export default app
