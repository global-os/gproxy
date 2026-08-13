import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'

export type GlobalPcRow = {
  id: number
  user_id: string
  name: string
}

export async function getGlobalPcForUser(
  db: NodePgDatabase<typeof schema>,
  userId: string
): Promise<GlobalPcRow | null> {
  const [row] = await db
    .select({
      id: schema.globalPc.id,
      user_id: schema.globalPc.user_id,
      name: schema.globalPc.name,
    })
    .from(schema.globalPc)
    .where(eq(schema.globalPc.user_id, userId))
    .limit(1)

  return row ?? null
}

export async function ensureGlobalPcForUser(
  db: NodePgDatabase<typeof schema>,
  userId: string,
  name = 'My Global PC'
): Promise<number> {
  const existing = await getGlobalPcForUser(db, userId)
  if (existing) return existing.id

  const [created] = await db
    .insert(schema.globalPc)
    .values({ user_id: userId, name })
    .returning({ id: schema.globalPc.id })

  return created.id
}

export async function resolveGlobalPcIdForWorkspace(
  db: NodePgDatabase<typeof schema>,
  userId: string,
  workspaceId: number
): Promise<number> {
  const [row] = await db
    .select({
      global_pc_id: schema.workspace.global_pc_id,
    })
    .from(schema.workspace)
    .where(
      and(
        eq(schema.workspace.id, workspaceId),
        eq(schema.workspace.user_id, userId)
      )
    )
    .limit(1)

  if (!row) {
    throw new Error('Workspace not found')
  }

  if (row.global_pc_id != null) return row.global_pc_id

  const globalPcId = await ensureGlobalPcForUser(db, userId)
  await db
    .update(schema.workspace)
    .set({ global_pc_id: globalPcId })
    .where(eq(schema.workspace.id, workspaceId))

  return globalPcId
}
