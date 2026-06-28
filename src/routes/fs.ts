import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import * as middleware from '../middleware.js'
import { Env } from '../types.js'
import * as schema from '../db/schema.js'
import { resolveDesktopDirectoryId } from '../services/desktop-files.js'
import { resolveDesktopEntryIcon } from '../services/global-pc-icons.js'
import { ensureGlobalPcForUser, resolveGlobalPcIdForWorkspace } from '../services/global-pc.js'
import { buildUserFileIndex } from '../services/file-index.js'
import { readResourceIconBmp } from '../services/local-icons.js'

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
  const workspaceIdRaw = c.req.query('workspaceId')
  let globalPcId: number
  if (workspaceIdRaw) {
    const workspaceId = Number.parseInt(workspaceIdRaw, 10)
    if (!Number.isFinite(workspaceId)) {
      return c.json({ error: 'Invalid workspaceId' }, 400)
    }
    try {
      globalPcId = await resolveGlobalPcIdForWorkspace(db, user.id, workspaceId)
    } catch {
      return c.json({ error: 'Workspace not found' }, 404)
    }
  } else {
    globalPcId = await ensureGlobalPcForUser(db, user.id)
  }

  const desktopId = await resolveDesktopDirectoryId(db, user.id)
  if (!desktopId) return c.json({ globalPcId, items: [] })

  const [dirs, files] = await Promise.all([
    db.select({ id: schema.directory.id, name: schema.directory.name })
      .from(schema.directory)
      .where(eq(schema.directory.parent_id, desktopId)),
    db.select({ id: schema.file.id, name: schema.file.name, mime_type: schema.file.mime_type })
      .from(schema.file)
      .where(eq(schema.file.parent_id, desktopId)),
  ])

  const desktopDirs = await Promise.all(dirs.map(async (d) => {
    const icon = d.name.endsWith('.gapp')
      ? await resolveDesktopEntryIcon(db, globalPcId, d.id, d.name)
      : undefined
    return {
      type: 'directory' as const,
      id: d.id,
      name: d.name,
      ...(icon ? { icon } : {}),
    }
  }))

  return c.json({
    globalPcId,
    items: [
      ...desktopDirs,
      ...files.map(f => ({ type: 'file' as const, id: f.id, name: f.name, mime_type: f.mime_type })),
    ],
  })
})

router.get('/index', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  const entries = await buildUserFileIndex(db, user.id)
  return c.json({ entries })
})

router.get('/icons', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const iconPath = c.req.query('path')
  if (!iconPath) return c.json({ error: 'path is required' }, 400)

  const db = c.get('db')
  const bmp = await readResourceIconBmp(db, user.id, iconPath)
  if (!bmp) return c.notFound()

  return c.body(new Uint8Array(bmp), 200, {
    'Content-Type': 'image/bmp',
    'Cache-Control': 'private, max-age=3600',
  })
})

export default router