import { and, eq, isNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'

export async function findOrCreateProcess(
  db: NodePgDatabase<typeof schema>,
  workspaceId: number,
  directoryId: number,
) {
  const [existing] = await db
    .select({ id: schema.process.id })
    .from(schema.process)
    .where(and(
      eq(schema.process.workspace_id, workspaceId),
      eq(schema.process.directory_id, directoryId),
    ))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(schema.process)
    .values({
      workspace_id: workspaceId,
      directory_id: directoryId,
    })
    .returning({ id: schema.process.id })

  return created
}

/** Create a srcdoc process (no backing .gapp directory). */
export async function createNamedProcess(
  db: NodePgDatabase<typeof schema>,
  workspaceId: number,
  bundleName: string,
) {
  const [created] = await db
    .insert(schema.process)
    .values({ workspace_id: workspaceId, bundle_name: bundleName })
    .returning({ id: schema.process.id })

  return created
}

export async function getProcessById(
  db: NodePgDatabase<typeof schema>,
  processId: number,
) {
  const [row] = await db
    .select({
      id: schema.process.id,
      workspace_id: schema.process.workspace_id,
      bundle_name: schema.process.bundle_name,
    })
    .from(schema.process)
    .where(and(
      eq(schema.process.id, processId),
      isNull(schema.process.directory_id),
    ))
    .limit(1)

  return row ?? null
}