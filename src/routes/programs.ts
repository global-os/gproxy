import { Hono } from 'hono'
import * as middleware from '../middleware.js'
import { LaunchError, launchProgram } from '../services/launch-program.js'
import { requireWorkspace } from '../services/workspace-access.js'
import { clearWorkspaceLogs, listWorkspaceLogs } from '../services/workspace-logger.js'
import { killWorkspaceProcess, listWorkspaceProcesses } from '../services/process-service.js'
import { deleteWindow, listWorkspaceWindows } from '../services/window-service.js'
import { Env } from '../types.js'

const router = new Hono<Env>()

router.use(
  '*',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.betterAuthMiddleware,
)

router.get('/workspaces/:workspaceId/logs', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  const workspaceId = Number.parseInt(c.req.param('workspaceId'), 10)
  if (!Number.isFinite(workspaceId)) {
    return c.json({ message: 'Invalid workspace id' }, 400)
  }

  try {
    await requireWorkspace(user.id, workspaceId)
    const logs = await listWorkspaceLogs(workspaceId)
    return c.json(logs)
  } catch (err) {
    if (err instanceof LaunchError) {
      return c.json({ message: err.message }, err.status as 404)
    }
    console.error('[workspace-logs]', err)
    return c.json({ message: 'Failed to load workspace logs' }, 500)
  }
})

router.delete('/workspaces/:workspaceId/logs', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  const workspaceId = Number.parseInt(c.req.param('workspaceId'), 10)
  if (!Number.isFinite(workspaceId)) {
    return c.json({ message: 'Invalid workspace id' }, 400)
  }

  try {
    await requireWorkspace(user.id, workspaceId)
    await clearWorkspaceLogs(workspaceId)
    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof LaunchError) {
      return c.json({ message: err.message }, err.status as 404)
    }
    console.error('[workspace-logs]', err)
    return c.json({ message: 'Failed to clear workspace logs' }, 500)
  }
})

router.get('/workspaces/:workspaceId/processes', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  const workspaceId = Number.parseInt(c.req.param('workspaceId'), 10)
  if (!Number.isFinite(workspaceId)) {
    return c.json({ message: 'Invalid workspace id' }, 400)
  }

  try {
    await requireWorkspace(user.id, workspaceId)
    const processes = await listWorkspaceProcesses(workspaceId)
    return c.json(processes)
  } catch (err) {
    if (err instanceof LaunchError) {
      return c.json({ message: err.message }, err.status as 404)
    }
    console.error('[workspace-processes]', err)
    return c.json({ message: 'Failed to load processes' }, 500)
  }
})

router.delete('/workspaces/:workspaceId/processes/:processId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  const workspaceId = Number.parseInt(c.req.param('workspaceId'), 10)
  const processId = Number.parseInt(c.req.param('processId'), 10)
  if (!Number.isFinite(workspaceId) || !Number.isFinite(processId)) {
    return c.json({ message: 'Invalid workspace or process id' }, 400)
  }

  try {
    await killWorkspaceProcess(user.id, workspaceId, processId)
    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof LaunchError) {
      return c.json({ message: err.message }, err.status as 404)
    }
    console.error('[kill-process]', err)
    return c.json({ message: 'Failed to kill process' }, 500)
  }
})

router.get('/workspaces/:workspaceId/windows', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  const workspaceId = Number.parseInt(c.req.param('workspaceId'), 10)
  if (!Number.isFinite(workspaceId)) {
    return c.json({ message: 'Invalid workspace id' }, 400)
  }

  try {
    await requireWorkspace(user.id, workspaceId)
    const windows = await listWorkspaceWindows(workspaceId)
    return c.json(windows)
  } catch (err) {
    if (err instanceof LaunchError) {
      return c.json({ message: err.message }, err.status as 404)
    }
    console.error('[windows]', err)
    return c.json({ message: 'Failed to load windows' }, 500)
  }
})

router.delete('/workspaces/:workspaceId/windows/:windowId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  const workspaceId = Number.parseInt(c.req.param('workspaceId'), 10)
  const windowId = Number.parseInt(c.req.param('windowId'), 10)
  if (!Number.isFinite(workspaceId) || !Number.isFinite(windowId)) {
    return c.json({ message: 'Invalid workspace or window id' }, 400)
  }

  try {
    await requireWorkspace(user.id, workspaceId)
    const removed = await deleteWindow(workspaceId, windowId)
    if (!removed) return c.json({ message: 'Window not found' }, 404)
    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof LaunchError) {
      return c.json({ message: err.message }, err.status as 404)
    }
    console.error('[windows]', err)
    return c.json({ message: 'Failed to close window' }, 500)
  }
})

router.post('/workspaces/:workspaceId/launch', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  const workspaceId = Number.parseInt(c.req.param('workspaceId'), 10)
  if (!Number.isFinite(workspaceId)) {
    return c.json({ message: 'Invalid workspace id' }, 400)
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
      workspaceId,
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