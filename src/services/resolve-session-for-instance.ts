import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { instances, process } from '../db/schema.js'

export async function resolveSessionIdForInstance(
  instanceId: number,
): Promise<number | null> {
  const [row] = await db
    .select({ session_id: process.session_id })
    .from(instances)
    .innerJoin(process, eq(instances.process_id, process.id))
    .where(eq(instances.id, instanceId))
    .limit(1)

  return row?.session_id ?? null
}