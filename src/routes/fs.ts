import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import * as middleware from '../middleware.js'
import { Env } from '../types.js'
import * as schema from '../db/schema.js'
import { resolveDesktopDirectoryId } from '../services/desktop-files.js'

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
  const desktopId = await resolveDesktopDirectoryId(db, user.id)
  if (!desktopId) return c.json([])

  const [dirs, files] = await Promise.all([
    db.select({ id: schema.directory.id, name: schema.directory.name })
      .from(schema.directory)
      .where(eq(schema.directory.parent_id, desktopId)),
    db.select({ id: schema.file.id, name: schema.file.name, mime_type: schema.file.mime_type })
      .from(schema.file)
      .where(eq(schema.file.parent_id, desktopId)),
  ])

  return c.json([
    ...dirs.map(d => ({ type: 'directory' as const, id: d.id, name: d.name })),
    ...files.map(f => ({ type: 'file' as const, id: f.id, name: f.name, mime_type: f.mime_type })),
  ])
})

export default router