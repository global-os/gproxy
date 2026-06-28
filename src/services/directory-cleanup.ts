import { and, eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'

/** Remove platform rows that reference a directory tree (e.g. a .gapp bundle). */
export async function cleanupDirectoryAppRefs(
  db: NodePgDatabase<typeof schema>,
  userId: string,
  directoryId: number,
  directoryName: string,
): Promise<void> {
  await db
    .delete(schema.process)
    .where(eq(schema.process.directory_id, directoryId))

  await db
    .delete(schema.task)
    .where(eq(schema.task.directory_id, directoryId))

  await db
    .delete(schema.image)
    .where(eq(schema.image.directory_id, directoryId))

  const globalPcs = await db
    .select({ id: schema.globalPc.id })
    .from(schema.globalPc)
    .where(eq(schema.globalPc.user_id, userId))

  const globalPcIds = globalPcs.map((row) => row.id)
  if (globalPcIds.length > 0) {
    await db
      .delete(schema.globalPcIcon)
      .where(and(
        inArray(schema.globalPcIcon.global_pc_id, globalPcIds),
        eq(schema.globalPcIcon.entry_name, directoryName),
      ))
  }
}