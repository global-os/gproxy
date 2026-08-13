import { and, asc, eq, gt } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { workspaceEventWakeBus } from './bus.js'
import type { WorkspaceEventPayload, WorkspaceEventRecord } from './types.js'

function rowToRecord(row: {
  id: number
  workspace_id: number
  type: string
  payload: string
  created_at: Date
}): WorkspaceEventRecord | null {
  let payload: WorkspaceEventPayload
  try {
    payload = JSON.parse(row.payload) as WorkspaceEventPayload
  } catch {
    return null
  }
  if (!payload || payload.type !== row.type) return null
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    ...payload,
  }
}

export async function appendWorkspaceEvent(
  db: NodePgDatabase<typeof schema>,
  event: WorkspaceEventPayload
): Promise<WorkspaceEventRecord> {
  const [row] = await db
    .insert(schema.workspaceEvent)
    .values({
      workspace_id: event.workspaceId,
      type: event.type,
      payload: JSON.stringify(event),
    })
    .returning({
      id: schema.workspaceEvent.id,
      workspace_id: schema.workspaceEvent.workspace_id,
      type: schema.workspaceEvent.type,
      payload: schema.workspaceEvent.payload,
      created_at: schema.workspaceEvent.created_at,
    })

  workspaceEventWakeBus.wake(event.workspaceId)

  const record = rowToRecord(row)
  if (!record) throw new Error('Failed to persist workspace event')
  return record
}

export async function listWorkspaceEventsAfter(
  db: NodePgDatabase<typeof schema>,
  workspaceId: number,
  afterId: number,
  limit = 50
): Promise<WorkspaceEventRecord[]> {
  const rows = await db
    .select({
      id: schema.workspaceEvent.id,
      workspace_id: schema.workspaceEvent.workspace_id,
      type: schema.workspaceEvent.type,
      payload: schema.workspaceEvent.payload,
      created_at: schema.workspaceEvent.created_at,
    })
    .from(schema.workspaceEvent)
    .where(
      and(
        eq(schema.workspaceEvent.workspace_id, workspaceId),
        gt(schema.workspaceEvent.id, afterId)
      )
    )
    .orderBy(asc(schema.workspaceEvent.id))
    .limit(limit)

  const records: WorkspaceEventRecord[] = []
  for (const row of rows) {
    const record = rowToRecord(row)
    if (record) records.push(record)
  }
  return records
}
