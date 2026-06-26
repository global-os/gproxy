import { Hono, type Context } from 'hono'
import { auth } from '../auth.js'
import { isDatabaseConfigured } from '../db/index.js'

export type AuthType = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
  }
}

const AUTH_HANDLER_TIMEOUT_MS = 15_000

async function buildAuthRequest(c: Context): Promise<Request> {
  const headers = new Headers(c.req.raw.headers)
  const method = c.req.method

  if (method === 'GET' || method === 'HEAD') {
    return new Request(c.req.url, { method, headers })
  }

  const body = await c.req.arrayBuffer()
  if (body.byteLength === 0) {
    return new Request(c.req.url, { method, headers })
  }

  return new Request(c.req.url, { method, headers, body })
}

async function handleAuth(c: Context) {
  if (!isDatabaseConfigured()) {
    return c.json(
      { message: 'Server misconfigured: database is not configured.' },
      503
    )
  }

  const path = new URL(c.req.url).pathname
  const start = Date.now()
  console.log(`[auth] start ${path} honoPath=${c.req.path}`)

  let request: Request
  try {
    const bodyStart = Date.now()
    request = await buildAuthRequest(c)
    console.log(`[auth] body ready in ${Date.now() - bodyStart}ms: ${path}`)
  } catch (err) {
    console.error(`[auth] body read failed ${path}:`, err)
    return c.json({ message: 'Failed to read request body.' }, 400)
  }

  const interval = setInterval(() => {
    console.log(`[auth] still waiting ${Date.now() - start}ms: ${path}`)
  }, 2_000)

  try {
    const response = await Promise.race([
      auth.handler(request),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), AUTH_HANDLER_TIMEOUT_MS)
      ),
    ])
    clearInterval(interval)
    console.log(`[auth] done ${path} → ${response.status} in ${Date.now() - start}ms`)
    return response
  } catch (err) {
    clearInterval(interval)
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'timeout') {
      console.log(`[auth] timeout after ${AUTH_HANDLER_TIMEOUT_MS}ms: ${path}`)
      return c.json(
        {
          message:
            'Authentication timed out. Check /debug for authProbe timing if this persists.',
        },
        504
      )
    }
    console.error(`[auth] error ${path}:`, message)
    return c.json({ message: 'Authentication failed.' }, 500)
  }
}

const router = new Hono<{ Bindings: AuthType }>({ strict: false })

router.on(['POST', 'GET'], '/*', (c) => handleAuth(c))

export default router