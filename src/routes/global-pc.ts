import { Hono } from 'hono'
import * as middleware from '../middleware.js'
import { Env } from '../types.js'
import {
  ensureGlobalPcForUser,
  getGlobalPcForUser,
  resolveGlobalPcIdForWorkspace,
} from '../services/global-pc.js'
import {
  getGlobalPcIconMap,
  resetGlobalPcIcons,
  setGlobalPcIcon,
} from '../services/global-pc-icons.js'

const router = new Hono<Env>()

router.use(
  '*',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.betterAuthMiddleware,
  middleware.setRlsUser
)

router.get('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const db = c.get('db')
  let globalPc = await getGlobalPcForUser(db, user.id)
  if (!globalPc) {
    const id = await ensureGlobalPcForUser(db, user.id)
    globalPc = { id, user_id: user.id, name: 'My Global PC' }
  }

  return c.json({
    id: globalPc.id,
    name: globalPc.name,
  })
})

router.get('/icons', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const workspaceIdRaw = c.req.query('workspaceId')
  const db = c.get('db')

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

  const icons = await getGlobalPcIconMap(db, globalPcId)
  return c.json({ globalPcId, icons })
})

router.patch('/icons', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const body = (await c.req.json().catch(() => null)) as {
    workspaceId?: number
    entryName?: string
    iconId?: string
  } | null

  if (!body?.entryName || !body?.iconId) {
    return c.json({ error: 'entryName and iconId are required' }, 400)
  }

  const db = c.get('db')
  let globalPcId: number
  if (body.workspaceId != null) {
    globalPcId = await resolveGlobalPcIdForWorkspace(
      db,
      user.id,
      body.workspaceId
    )
  } else {
    globalPcId = await ensureGlobalPcForUser(db, user.id)
  }

  try {
    await setGlobalPcIcon(db, globalPcId, body.entryName, body.iconId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid icon'
    return c.json({ error: message }, 400)
  }

  return c.json({
    ok: true,
    globalPcId,
    entryName: body.entryName,
    iconId: body.iconId,
  })
})

router.delete('/icons', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const workspaceIdRaw = c.req.query('workspaceId')
  const db = c.get('db')

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

  await resetGlobalPcIcons(db, globalPcId)
  return c.json({ ok: true, globalPcId })
})

export default router
