import { desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'

export async function resolveWorkspaceIdForInstance(
  instanceId: number
): Promise<number | null> {
  const [row] = await db
    .select({ workspace_id: schema.process.workspace_id })
    .from(schema.instances)
    .innerJoin(
      schema.process,
      eq(schema.instances.process_id, schema.process.id)
    )
    .where(eq(schema.instances.id, instanceId))
    .limit(1)

  if (row) return row.workspace_id

  const [viaWindow] = await db
    .select({ workspace_id: schema.process.workspace_id })
    .from(schema.workspaceWindow)
    .innerJoin(
      schema.process,
      eq(schema.workspaceWindow.process_id, schema.process.id)
    )
    .where(eq(schema.workspaceWindow.instance_id, instanceId))
    .orderBy(desc(schema.workspaceWindow.last_focused_at))
    .limit(1)

  return viaWindow?.workspace_id ?? null
}
