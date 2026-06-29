import { eq } from 'drizzle-orm'
import * as schema from '../db/schema.js'
import { createNamedProcess, getProcessById } from '../services/process.js'
import { createWindow } from '../services/window-service.js'
import { requireWorkspace } from '../services/workspace-access.js'
import type { SyscallContext, SyscallHandler } from './types.js'

function parseWorkspaceArg(args: Record<string, unknown>): number | null {
  const raw = args['_workspaceId']
  const n = typeof raw === 'string' ? parseInt(raw, 10) : typeof raw === 'number' ? raw : NaN
  return Number.isFinite(n) ? n : null
}

function parseProcessArg(args: Record<string, unknown>): number | null {
  const raw = args['_processId']
  const n = typeof raw === 'string' ? parseInt(raw, 10) : typeof raw === 'number' ? raw : NaN
  return Number.isFinite(n) ? n : null
}

/** window.open — create a new process + srcdoc window. */
export const windowOpen: SyscallHandler = async (ctx, args) => {
  const workspaceId = parseWorkspaceArg(args)
  if (workspaceId == null) return { ok: false, message: 'Missing _workspaceId', status: 400 }

  const name = typeof args['name'] === 'string' ? args['name'].trim() : ''
  if (!name) return { ok: false, message: 'name is required', status: 400 }

  const srcdoc = typeof args['srcdoc'] === 'string' ? args['srcdoc'] : null
  if (!srcdoc) return { ok: false, message: 'srcdoc is required', status: 400 }

  const width = typeof args['width'] === 'number' ? args['width'] : 720
  const height = typeof args['height'] === 'number' ? args['height'] : 480

  try {
    await requireWorkspace(ctx.userId, workspaceId)
  } catch {
    return { ok: false, message: 'Workspace not found', status: 404 }
  }

  const process = await createNamedProcess(ctx.db, workspaceId, name)
  const win = await createWindow({
    workspaceId,
    processId: process.id,
    title: name,
    bundleName: name,
    srcdoc,
    width,
    height,
  })

  return { ok: true, result: win }
}

/** window.open.process — create a srcdoc window within the caller's existing process. */
export const windowOpenProcess: SyscallHandler = async (ctx, args) => {
  const workspaceId = parseWorkspaceArg(args)
  if (workspaceId == null) return { ok: false, message: 'Missing _workspaceId', status: 400 }

  const processId = parseProcessArg(args)
  if (processId == null) return { ok: false, message: 'Missing _processId', status: 400 }

  const srcdoc = typeof args['srcdoc'] === 'string' ? args['srcdoc'] : null
  if (!srcdoc) return { ok: false, message: 'srcdoc is required', status: 400 }

  const width = typeof args['width'] === 'number' ? args['width'] : 720
  const height = typeof args['height'] === 'number' ? args['height'] : 480

  try {
    await requireWorkspace(ctx.userId, workspaceId)
  } catch {
    return { ok: false, message: 'Workspace not found', status: 404 }
  }

  const process = await getProcessById(ctx.db, processId)
  if (!process || process.workspace_id !== workspaceId) {
    return { ok: false, message: 'Process not found', status: 404 }
  }

  const title = typeof args['title'] === 'string' && args['title'].trim()
    ? args['title'].trim()
    : (process.bundle_name ?? 'Window')

  const bundleName = typeof args['title'] === 'string' && args['title'].trim()
    ? args['title'].trim()
    : (process.bundle_name ?? 'Window')

  const win = await createWindow({
    workspaceId,
    processId,
    title,
    bundleName,
    srcdoc,
    width,
    height,
  })

  return { ok: true, result: win }
}
