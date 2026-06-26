import { Hono } from 'hono'
import { auth } from '../auth.js'
import { isDatabaseConfigured } from '../db/index.js'

export type AuthType = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
  }
}

const AUTH_HANDLER_TIMEOUT_MS = 15_000

const router = new Hono<{ Bindings: AuthType }>({ strict: false })

router.on(['POST', 'GET'], '/*', async (c) => {
  if (!isDatabaseConfigured()) {
    return c.json(
      { message: 'Server misconfigured: database is not configured.' },
      503
    )
  }

  const path = new URL(c.req.url).pathname
  const start = Date.now()
  console.log(`[auth] start ${path} honoPath=${c.req.path}`)

  const interval = setInterval(() => {
    console.log(`[auth] still waiting ${Date.now() - start}ms: ${path}`)
  }, 2_000)

  try {
    const response = await Promise.race([
      auth.handler(c.req.raw),
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
            'Authentication timed out. Check /debug authProbe — if that is fast, the request body stream may be stuck.',
        },
        504
      )
    }
    console.error(`[auth] error ${path}:`, message)
    return c.json({ message: 'Authentication failed.' }, 500)
  }
})

export default router