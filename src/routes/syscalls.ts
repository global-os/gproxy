import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import * as middleware from '../middleware.js'
import { Env } from '../types.js'
import { invokeSyscall } from '../syscalls/index.js'

const router = new Hono<Env>()

router.use(
  '*',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.betterAuthMiddleware,
  middleware.setRlsUser,
)

router.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  let body: { op?: string } & Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ message: 'Invalid JSON body' }, 400)
  }

  const op = body.op?.trim()
  if (!op) return c.json({ message: 'op is required' }, 400)

  const { op: _op, ...args } = body
  const result = await invokeSyscall(
    { db: c.get('db'), userId: user.id },
    op,
    args,
  )

  if (!result.ok) {
    return c.json({ message: result.message }, result.status as ContentfulStatusCode)
  }

  if (result.result === undefined) {
    return c.body(null, 204)
  }

  const status = (result.status ?? 200) as ContentfulStatusCode
  return c.json(result.result, status)
})

export default router