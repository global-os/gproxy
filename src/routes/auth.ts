import { Hono, type Context } from 'hono'
import { auth } from '../auth.js'
import { isDatabaseConfigured, pingPool } from '../db/index.js'

export type AuthType = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
  }
}

const AUTH_HANDLER_TIMEOUT_MS = 8_000

async function handleAuth(c: Context) {
  if (!isDatabaseConfigured()) {
    return c.json(
      { message: 'Server misconfigured: database is not configured.' },
      503
    )
  }

  const poolCheck = await pingPool(3_000)
  if (!poolCheck.ok) {
    console.error(`[auth] pool unavailable: ${poolCheck.error}`)
    return c.json(
      {
        message:
          'Database connection pool is not responding. Check /health for pool and auth table status.',
      },
      503
    )
  }

  const path = new URL(c.req.url).pathname
  const start = Date.now()
  console.log(`[auth] start ${path}`)

  const interval = setInterval(() => {
    console.log(`[auth] still waiting ${Date.now() - start}ms: ${path}`)
  }, 2_000)

  const timeoutResponse = new Promise<Response>((resolve) => {
    setTimeout(() => {
      clearInterval(interval)
      console.log(`[auth] timeout after ${AUTH_HANDLER_TIMEOUT_MS}ms: ${path}`)
      resolve(
        Response.json(
          { message: 'Authentication timed out waiting for the database. Check /health — pool and auth table checks must pass.' },
          { status: 504 }
        )
      )
    }, AUTH_HANDLER_TIMEOUT_MS)
  })

  const result = await Promise.race([
    auth.handler(c.req.raw)
      .then(r => { clearInterval(interval); console.log(`[auth] done ${path} → ${r.status} in ${Date.now() - start}ms`); return r })
      .catch(err => { clearInterval(interval); console.error(`[auth] error ${path}:`, err?.message ?? err); return Response.json({ message: 'Authentication failed.' }, { status: 500 }) }),
    timeoutResponse,
  ])
  return result
}

const router = new Hono<{ Bindings: AuthType }>({ strict: false })

router.on(['POST', 'GET'], '/*', (c) => handleAuth(c))

export default router