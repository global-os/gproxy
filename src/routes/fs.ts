import { Hono } from 'hono'
import { and, eq, isNull } from 'drizzle-orm'
import * as middleware from '../middleware.js'
import { Env } from '../types.js'
import * as schema from '../db/schema.js'

const router = new Hono<Env>()

router.use(
  '*',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.betterAuthMiddleware,
  middleware.setRlsUser,
)

router.get('/desktop', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')

  const [usersDir] = await db
    .select({ id: schema.directory.id })
    .from(schema.directory)
    .where(and(
      eq(schema.directory.user_id, user.id),
      eq(schema.directory.name, 'Users'),
      isNull(schema.directory.parent_id),
    ))

  if (!usersDir) return c.json([])

  const [desktopDir] = await db
    .select({ id: schema.directory.id })
    .from(schema.directory)
    .where(and(
      eq(schema.directory.parent_id, usersDir.id),
      eq(schema.directory.name, 'Desktop'),
    ))

  if (!desktopDir) return c.json([])

  const [dirs, files] = await Promise.all([
    db.select({ id: schema.directory.id, name: schema.directory.name })
      .from(schema.directory)
      .where(eq(schema.directory.parent_id, desktopDir.id)),
    db.select({ id: schema.file.id, name: schema.file.name, mime_type: schema.file.mime_type })
      .from(schema.file)
      .where(eq(schema.file.parent_id, desktopDir.id)),
  ])

  return c.json([
    ...dirs.map(d => ({ type: 'directory' as const, id: d.id, name: d.name })),
    ...files.map(f => ({ type: 'file' as const, id: f.id, name: f.name, mime_type: f.mime_type })),
  ])
})

export default router