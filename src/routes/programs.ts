import { Hono } from 'hono'
import * as middleware from '../middleware.js'
import { LaunchError, launchProgram } from '../services/launch-program.js'
import { requireWorkspaceSession } from '../services/session-access.js'
import { listSessionWindows } from '../services/window-service.js'
import { Env } from '../types.js'

const router = new Hono<Env>()

router.use(
  '*',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.betterAuthMiddleware,
)

router.get('/sessions/:sessionId/windows', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  const sessionId = Number.parseInt(c.req.param('sessionId'), 10)
  if (!Number.isFinite(sessionId)) {
    return c.json({ message: 'Invalid session id' }, 400)
  }

  try {
    await requireWorkspaceSession(user.id, sessionId)
    const windows = await listSessionWindows(sessionId)
    return c.json(windows)
  } catch (err) {
    if (err instanceof LaunchError) {
      return c.json({ message: err.message }, err.status as 404)
    }
    console.error('[windows]', err)
    return c.json({ message: 'Failed to load windows' }, 500)
  }
})

router.post('/sessions/:sessionId/launch', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  const sessionId = Number.parseInt(c.req.param('sessionId'), 10)
  if (!Number.isFinite(sessionId)) {
    return c.json({ message: 'Invalid session id' }, 400)
  }

  let body: { directoryId?: number; directoryName?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ message: 'Invalid JSON body' }, 400)
  }

  const directoryId = Number(body.directoryId)
  if (!Number.isFinite(directoryId)) {
    return c.json({ message: 'directoryId is required' }, 400)
  }

  try {
    const result = await launchProgram({
      userId: user.id,
      sessionId,
      directoryId,
      directoryName: body.directoryName ?? 'app',
    })
    return c.json(result)
  } catch (err) {
    if (err instanceof LaunchError) {
      return c.json({ message: err.message }, err.status as 400 | 404)
    }
    console.error('[launch]', err)
    const cause = err && typeof err === 'object' && 'cause' in err
      ? (err as { cause: unknown }).cause
      : err
    const detail = cause instanceof Error ? cause.message : undefined
    const message =
      detail?.includes('does not exist') || detail?.includes('column')
        ? 'Database schema is out of date. Run scripts/apply-pending-migrations.mjs against production.'
        : 'Failed to launch program'
    return c.json({ message, ...(detail ? { detail } : {}) }, 500)
  }
})

export default router