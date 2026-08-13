import { desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'

export type WorkspaceLogLevel = 'info' | 'warn' | 'error'

export type WorkspaceLogRow = {
  id: number
  workspaceId: number
  level: string
  source: string
  message: string
  detail: string | null
  createdAt: Date
}

export type WorkspaceLogWriter = ReturnType<typeof createWorkspaceLogWriter>

export function createWorkspaceLogWriter(workspaceId: number) {
  return {
    async info(source: string, message: string, detail?: string) {
      await appendLog(workspaceId, 'info', source, message, detail)
    },
    async warn(source: string, message: string, detail?: string) {
      await appendLog(workspaceId, 'warn', source, message, detail)
    },
    async error(source: string, message: string, detail?: string) {
      await appendLog(workspaceId, 'error', source, message, detail)
    },
  }
}

async function appendLog(
  workspaceId: number,
  level: WorkspaceLogLevel,
  source: string,
  message: string,
  detail?: string
) {
  await db.insert(schema.workspaceLog).values({
    workspace_id: workspaceId,
    level,
    source,
    message,
    detail: detail ?? null,
  })
}

export async function listWorkspaceLogs(
  workspaceId: number
): Promise<WorkspaceLogRow[]> {
  const rows = await db
    .select()
    .from(schema.workspaceLog)
    .where(eq(schema.workspaceLog.workspace_id, workspaceId))
    .orderBy(desc(schema.workspaceLog.created_at))
    .limit(200)

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    level: row.level,
    source: row.source,
    message: row.message,
    detail: row.detail,
    createdAt: row.created_at,
  }))
}

export async function clearWorkspaceLogs(workspaceId: number): Promise<void> {
  await db
    .delete(schema.workspaceLog)
    .where(eq(schema.workspaceLog.workspace_id, workspaceId))
}
