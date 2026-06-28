import { eq, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'

export type WorkspaceProcessInstanceDto = {
  id: number
  slug: string
  state: 'starting' | 'running' | 'stopped'
}

export type WorkspaceProcessDto = {
  id: number
  workspaceId: number
  directoryId: number
  bundleName: string
  windowCount: number
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
      .select({ processId: schema.workspaceWindow.process_id })
      .from(schema.workspaceWindow)
      .where(inArray(schema.workspaceWindow.process_id, processIds)),
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

  const windowCountByProcess = new Map<number, number>()
  for (const win of windows) {
    windowCountByProcess.set(
      win.processId,
      (windowCountByProcess.get(win.processId) ?? 0) + 1,
    )
  }

  const instancesByProcess = new Map<number, WorkspaceProcessInstanceDto[]>()
  for (const inst of instances) {
    if (inst.processId == null) continue
    const list = instancesByProcess.get(inst.processId) ?? []
    list.push({
      id: inst.id,
      slug: inst.slug,
      state: inst.state,
    })
    instancesByProcess.set(inst.processId, list)
  }

  return rows.map((row) => ({
    id: row.id,
    workspaceId,
    directoryId: row.directoryId,
    bundleName: row.bundleName,
    windowCount: windowCountByProcess.get(row.id) ?? 0,
    instances: instancesByProcess.get(row.id) ?? [],
  }))
}