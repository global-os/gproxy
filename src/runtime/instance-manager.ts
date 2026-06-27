import { eq } from 'drizzle-orm'
import { getOrCreateImage } from '../db/image.js'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { PENDING_INSTANCE_CHECKSUM } from './instance-constants.js'
import {
  ensureInstanceContent,
  evictInstanceContent,
  isInstanceContentCached,
} from './instance-content.js'
import { INSTANCE_IDLE_MS, CLEANUP_INTERVAL_MS } from './constants.js'

const activeInstances = new Map<number, number>()

export async function touchInstance(instanceId: number): Promise<void> {
  activeInstances.set(instanceId, Date.now())
  await db
    .update(schema.instances)
    .set({ last_used_at: new Date() })
    .where(eq(schema.instances.id, instanceId))
}

export async function startInstanceRuntime(
  instanceId: number,
  checksum: string,
  tarBytes: Buffer,
): Promise<void> {
  await touchInstance(instanceId)
  await ensureInstanceContent(instanceId, tarBytes, checksum)
}

export async function stopInstanceRuntime(instanceId: number): Promise<void> {
  activeInstances.delete(instanceId)
  await evictInstanceContent(instanceId)
}

export async function runRuntimeCleanup(): Promise<void> {
  const now = Date.now()
  const rows = await db
    .select({
      id: schema.instances.id,
      state: schema.instances.state,
      last_used_at: schema.instances.last_used_at,
    })
    .from(schema.instances)
    .where(eq(schema.instances.state, 'running'))

  for (const row of rows) {
    const lastUsed = row.last_used_at?.getTime() ?? 0
    const lastActive = Math.max(lastUsed, activeInstances.get(row.id) ?? 0)
    if (now - lastActive < INSTANCE_IDLE_MS) continue

    await stopInstanceRuntime(row.id)
    await db
      .update(schema.instances)
      .set({ state: 'stopped' })
      .where(eq(schema.instances.id, row.id))
    console.log(`[runtime] evicted idle instance ${row.id}`)
  }
}

let cleanupTimer: NodeJS.Timeout | undefined

export function startRuntimeMaintenance(): void {
  if (cleanupTimer) return
  void runRuntimeCleanup()
  cleanupTimer = setInterval(() => {
    void runRuntimeCleanup().catch((err) => {
      console.error('[runtime] cleanup failed:', err)
    })
  }, CLEANUP_INTERVAL_MS)
  cleanupTimer.unref?.()
}

async function persistInstanceReady(instanceId: number): Promise<void> {
  await db
    .update(schema.instances)
    .set({
      state: 'running',
      last_used_at: new Date(),
    })
    .where(eq(schema.instances.id, instanceId))
}

/** Ensure instance bundle is extracted and ready to serve. */
export async function ensureInstanceReady(instanceId: number): Promise<boolean> {
  const [row] = await db
    .select({
      id: schema.instances.id,
      state: schema.instances.state,
      directory_checksum: schema.instances.directory_checksum,
      image_id: schema.instances.image_id,
      process_id: schema.instances.process_id,
    })
    .from(schema.instances)
    .where(eq(schema.instances.id, instanceId))
    .limit(1)

  if (!row) return false

  if (isInstanceContentCached(instanceId)) {
    await touchInstance(instanceId)
    if (row.state !== 'running') {
      await persistInstanceReady(instanceId)
    }
    return true
  }

  let imageId = row.image_id
  let checksum = row.directory_checksum

  if (!imageId || checksum === PENDING_INSTANCE_CHECKSUM) {
    const [processRow] = await db
      .select({ directory_id: schema.process.directory_id })
      .from(schema.process)
      .where(eq(schema.process.id, row.process_id))
      .limit(1)

    if (!processRow) return false

    console.log(`[instance] resolving image for ${instanceId} directory ${processRow.directory_id}`)
    const image = await getOrCreateImage(processRow.directory_id)
    imageId = image.id
    checksum = image.directory_checksum
    await db
      .update(schema.instances)
      .set({
        image_id: imageId,
        directory_checksum: checksum,
      })
      .where(eq(schema.instances.id, instanceId))
  }

  if (!imageId) return false

  const [imageRow] = await db
    .select({ tar_bytes: schema.image.tar_bytes })
    .from(schema.image)
    .where(eq(schema.image.id, imageId))
    .limit(1)

  if (!imageRow?.tar_bytes) return false

  await startInstanceRuntime(instanceId, checksum, imageRow.tar_bytes)
  await persistInstanceReady(instanceId)
  return true
}

