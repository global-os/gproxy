import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { appendWorkspaceEvent } from '../events/store.js'
import { LaunchError } from './errors.js'
import { requireWorkspace } from './workspace-access.js'

export type WorkspaceProcessInstanceDto = {
  id: number
  slug: string
  state: 'starting' | 'running'
}

export type WorkspaceProcessWindowDto = {
  id: number
  title: string
}

export type WorkspaceProcessDto = {
  id: number
  workspaceId: number
  directoryId: number
  bundleName: string
  windows: WorkspaceProcessWindowDto[]
  instances: WorkspaceProcessInstanceDto[]
}

export async function listWorkspaceProcesses(
  workspaceId: number,
): Promise<WorkspaceProcessDto[]> {
  const rows = await db
    .select({
      id: schema.process.id,
      directoryId: schema.process.directory_id,
      bundleName: schema.directory.name,
    })
    .from(schema.process)
    .innerJoin(schema.directory, eq(schema.process.directory_id, schema.directory.id))
    .where(eq(schema.process.workspace_id, workspaceId))
    .orderBy(schema.directory.name)

  if (rows.length === 0) return []

  const processIds = rows.map((row) => row.id)

  const [windows, instances] = await Promise.all([
    db
      .select({
        id: schema.workspaceWindow.id,
        processId: schema.workspaceWindow.process_id,
        title: schema.workspaceWindow.title,
      })
      .from(schema.workspaceWindow)
      .where(inArray(schema.workspaceWindow.process_id, processIds))
      .orderBy(schema.workspaceWindow.z_index),
    db
      .select({
        id: schema.instances.id,
        processId: schema.instances.process_id,
        slug: schema.instances.slug,
        state: schema.instances.state,
      })
      .from(schema.instances)
      .where(inArray(schema.instances.process_id, processIds))
      .orderBy(schema.instances.id),
  ])

  const windowsByProcess = new Map<number, WorkspaceProcessWindowDto[]>()
  for (const win of windows) {
    const list = windowsByProcess.get(win.processId) ?? []
    list.push({ id: win.id, title: win.title })
    windowsByProcess.set(win.processId, list)
  }

  const instancesByProcess = new Map<number, WorkspaceProcessInstanceDto[]>()
  for (const inst of instances) {
    if (inst.processId == null) continue
    const list = instancesByProcess.get(inst.processId) ?? []
    list.push({ id: inst.id, slug: inst.slug, state: inst.state })
    instancesByProcess.set(inst.processId, list)
  }

  return rows.map((row) => ({
    id: row.id,
    workspaceId,
    directoryId: row.directoryId,
    bundleName: row.bundleName,
    windows: windowsByProcess.get(row.id) ?? [],
    instances: instancesByProcess.get(row.id) ?? [],
  }))
}

export async function killWorkspaceProcess(
  userId: string,
  workspaceId: number,
  processId: number,
): Promise<void> {
  await requireWorkspace(userId, workspaceId)

  const [proc] = await db
    .select({
      id: schema.process.id,
      bundleName: schema.directory.name,
    })
    .from(schema.process)
    .innerJoin(schema.directory, eq(schema.process.directory_id, schema.directory.id))
    .where(and(
      eq(schema.process.id, processId),
      eq(schema.process.workspace_id, workspaceId),
    ))
    .limit(1)

  if (!proc) {
    throw new LaunchError('Process not found', 404)
  }

  const windows = await db
    .select({ id: schema.workspaceWindow.id })
    .from(schema.workspaceWindow)
    .where(eq(schema.workspaceWindow.process_id, processId))

  await db
    .delete(schema.process)
    .where(eq(schema.process.id, processId))

  await appendWorkspaceEvent(db, {
    type: 'process.killed',
    workspaceId,
    processId,
    windowIds: windows.map((row) => row.id),
    bundleName: proc.bundleName,
  })
}