import { and, desc, eq, inArray } from 'drizzle-orm'
import { resolveImageMeta } from '../db/image.js'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { PENDING_INSTANCE_CHECKSUM } from '../runtime/instance-constants.js'
import { instancePublicUrl } from '../runtime/constants.js'
import { LaunchError } from './errors.js'

export type CreatedInstance = {
  instanceId: number
  url: string
  restarted: boolean
}

/** Create a new runtime instance for a process (apps may call this multiple times). */
export async function createInstanceForProcess(processId: number): Promise<CreatedInstance> {
  const [processRow] = await db
    .select({
      id: schema.process.id,
      directory_id: schema.process.directory_id,
    })
    .from(schema.process)
    .where(eq(schema.process.id, processId))
    .limit(1)

  if (!processRow) {
    throw new LaunchError('Process not found', 404)
  }

  const meta = await resolveImageMeta(processRow.directory_id)

  const [instanceRow] = await db
    .insert(schema.instances)
    .values({
      process_id: processId,
      image_id: meta?.id ?? null,
      directory_checksum: meta?.directory_checksum ?? PENDING_INSTANCE_CHECKSUM,
      state: 'starting',
    })
    .returning({ id: schema.instances.id })

  return {
    instanceId: instanceRow.id,
    url: instancePublicUrl(instanceRow.id),
    restarted: false,
  }
}

/** Ensure the process has a live primary instance, restarting a stopped one when possible. */
export async function ensurePrimaryInstance(processId: number): Promise<CreatedInstance> {
  const [live] = await db
    .select({ id: schema.instances.id })
    .from(schema.instances)
    .where(and(
      eq(schema.instances.process_id, processId),
      inArray(schema.instances.state, ['running', 'starting']),
    ))
    .orderBy(schema.instances.id)
    .limit(1)

  if (live) {
    return {
      instanceId: live.id,
      url: instancePublicUrl(live.id),
      restarted: false,
    }
  }

  const [stopped] = await db
    .select({ id: schema.instances.id })
    .from(schema.instances)
    .where(and(
      eq(schema.instances.process_id, processId),
      eq(schema.instances.state, 'stopped'),
    ))
    .orderBy(desc(schema.instances.last_used_at))
    .limit(1)

  if (stopped) {
    await db
      .update(schema.instances)
      .set({ state: 'starting', last_used_at: new Date() })
      .where(eq(schema.instances.id, stopped.id))

    return {
      instanceId: stopped.id,
      url: instancePublicUrl(stopped.id),
      restarted: true,
    }
  }

  return createInstanceForProcess(processId)
}

export async function findOrCreateProcess(sessionId: number, directoryId: number) {
  const [existing] = await db
    .select({ id: schema.process.id })
    .from(schema.process)
    .where(and(
      eq(schema.process.session_id, sessionId),
      eq(schema.process.directory_id, directoryId),
    ))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(schema.process)
    .values({
      session_id: sessionId,
      directory_id: directoryId,
    })
    .returning({ id: schema.process.id })

  return created
}