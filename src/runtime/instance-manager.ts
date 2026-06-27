import { eq } from 'drizzle-orm'
import { getOrCreateImage } from '../db/image.js'
import { createSessionLogWriter } from '../services/session-logger.js'
import { resolveSessionIdForInstance } from '../services/resolve-session-for-instance.js'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { PENDING_INSTANCE_CHECKSUM } from './instance-constants.js'
import {
  ensureInstanceContent,
  evictInstanceContent,
  isInstanceContentCached,
} from './instance-content.js'
import { INSTANCE_IDLE_MS, CLEANUP_INTERVAL_MS } from './constants.js'
import {
  setInstancePrepareFailed,
  setInstancePrepareProgress,
  setInstancePrepareReady,
} from './instance-prepare-progress.js'

const activeInstances = new Map<number, number>()
const preparing = new Map<number, Promise<boolean>>()

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

export async function isInstanceDbReady(instanceId: number): Promise<boolean> {
  const [row] = await db
    .select({ state: schema.instances.state })
    .from(schema.instances)
    .where(eq(schema.instances.id, instanceId))
    .limit(1)

  return row?.state === 'running'
}

async function loadInstanceReady(instanceId: number): Promise<boolean> {
  setInstancePrepareProgress(instanceId, 'starting', 'Preparing app…')

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

  if (!row) {
    setInstancePrepareFailed(instanceId, 'Instance not found')
    return false
  }

  if (isInstanceContentCached(instanceId, row.directory_checksum)) {
    await touchInstance(instanceId)
    if (row.state !== 'running') {
      await persistInstanceReady(instanceId)
    }
    setInstancePrepareReady(instanceId)
    return true
  }

  if (isInstanceContentCached(instanceId)) {
    await evictInstanceContent(instanceId)
  }

  let imageId = row.image_id
  let checksum = row.directory_checksum

  if (!imageId || checksum === PENDING_INSTANCE_CHECKSUM) {
    const [processRow] = await db
      .select({ directory_id: schema.process.directory_id })
      .from(schema.process)
      .where(eq(schema.process.id, row.process_id))
      .limit(1)

    if (!processRow) {
      setInstancePrepareFailed(instanceId, 'App process not found')
      return false
    }

    const sessionId = await resolveSessionIdForInstance(instanceId)
    const sessionLog = sessionId ? createSessionLogWriter(sessionId) : null

    console.log(`[instance] resolving image for ${instanceId} directory ${processRow.directory_id}`)
    setInstancePrepareProgress(instanceId, 'resolving-image', 'Resolving app bundle…')
    const image = await getOrCreateImage(processRow.directory_id, {
      onProgress: (message) => {
        setInstancePrepareProgress(instanceId, 'building-snapshot', message)
      },
      compile:
        sessionId && sessionLog
          ? {
              sessionId,
              log: sessionLog,
            }
          : undefined,
    })
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

  if (!imageId) {
    setInstancePrepareFailed(instanceId, 'App bundle image not found')
    return false
  }

  setInstancePrepareProgress(instanceId, 'loading-tar', 'Loading bundle from database…')
  const loadStart = Date.now()
  const [imageRow] = await db
    .select({ tar_bytes: schema.image.tar_bytes })
    .from(schema.image)
    .where(eq(schema.image.id, imageId))
    .limit(1)

  if (!imageRow?.tar_bytes) {
    setInstancePrepareFailed(instanceId, 'App bundle archive is missing')
    return false
  }

  console.log(
    `[instance] loaded tar for ${instanceId} (${imageRow.tar_bytes.length} bytes) +${Date.now() - loadStart}ms`,
  )

  setInstancePrepareProgress(instanceId, 'extracting-tar', 'Extracting tar…')
  const extractStart = Date.now()
  await startInstanceRuntime(instanceId, checksum, imageRow.tar_bytes)
  console.log(`[instance] parsed tar for ${instanceId} +${Date.now() - extractStart}ms`)
  await persistInstanceReady(instanceId)
  setInstancePrepareReady(instanceId)
  return true
}

/** Ensure instance bundle is parsed and ready to serve. */
export async function ensureInstanceReady(instanceId: number): Promise<boolean> {
  const inflight = preparing.get(instanceId)
  if (inflight) return inflight

  const work = loadInstanceReady(instanceId).catch(async (err) => {
    const message = err instanceof Error ? err.message : 'Failed to prepare app'
    const detail =
      err && typeof err === 'object' && 'detail' in err
        ? String((err as { detail?: string }).detail ?? '')
        : undefined
    setInstancePrepareFailed(instanceId, message)
    console.error(`[instance] prepare failed for ${instanceId}:`, err)
    const sessionId = await resolveSessionIdForInstance(instanceId)
    if (sessionId) {
      const log = createSessionLogWriter(sessionId)
      await log.error('instance', message, detail || undefined)
    }
    return false
  }).finally(() => {
    preparing.delete(instanceId)
  })
  preparing.set(instanceId, work)
  return work
}

