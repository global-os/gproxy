import { Hono } from 'hono'
import { desc } from 'drizzle-orm'
import * as middleware from '../middleware.js'
import * as schema from '../db/schema.js'
import { Env } from '../types.js'
import { isAdminEmail } from '../constants/admin.js'

const router = new Hono<Env>()

router.use('*', middleware.provideDb, middleware.parseCookies, middleware.betterAuthMiddleware)

router.get('/users', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)
  if (!isAdminEmail(user.email)) return c.json({ message: 'Forbidden' }, 403)

  const db = c.get('db')
  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      emailVerified: schema.user.emailVerified,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .orderBy(desc(schema.user.createdAt))

  return c.json({ count: users.length, users })
})

export default router
