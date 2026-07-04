import { eq } from 'drizzle-orm'
import { getOrCreateImage } from '../../db/image.js'
import { hashDir } from '../../db/file.js'
import { createWorkspaceLogWriter } from '../../services/workspace-logger.js'
import { resolveWorkspaceIdForInstance } from '../../services/resolve-workspace-for-instance.js'
import { db } from '../../db/index.js'
import * as schema from '../../db/schema.js'
import { CLEANUP_INTERVAL_MS } from '../cache/constants.js'
import { runBundleCacheEviction } from '../cache/lru.js'
import { ensureInstanceBundleCached } from '../cache/populate.js'
import {
  evictBundleCache,
  isBundleCached,
  touchBundleCache,
} from '../cache/store.js'
import { imageCacheKey } from '../../gapp/compiler-version.js'
import { PENDING_INSTANCE_CHECKSUM } from './constants.js'
import {
  setInstancePrepareFailed,
  setInstancePrepareProgress,
  setInstancePrepareReady,
} from './prepare-progress.js'

const preparing = new Map<number, Promise<boolean>>()

export async function touchInstance(instanceId: number): Promise<void> {
  await db
    .update(schema.instances)
    .set({ last_used_at: new Date() })
    .where(eq(schema.instances.id, instanceId))

  if (await isBundleCached(instanceId)) {
    await touchBundleCache(instanceId)
  }
}

export async function startInstanceRuntime(
  instanceId: number,
  checksum: string,
  tarBytes: Buffer,
): Promise<void> {
  await touchInstance(instanceId)
  await ensureInstanceBundleCached(instanceId, tarBytes, checksum)
}

let cleanupTimer: NodeJS.Timeout | undefined

export function startRuntimeMaintenance(): void {
  if (cleanupTimer) return
  void runBundleCacheEviction()
  cleanupTimer = setInterval(() => {
    void runBundleCacheEviction().catch((err) => {
      console.error('[runtime] cache eviction failed:', err)
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

  if (row.process_id == null) {
    setInstancePrepareFailed(instanceId, 'Instance has no process')
    return false
  }

  const [processRow] = await db
    .select({ directory_id: schema.process.directory_id })
    .from(schema.process)
    .where(eq(schema.process.id, row.process_id))
    .limit(1)

  if (!processRow) {
    setInstancePrepareFailed(instanceId, 'App process not found')
    return false
  }

  if (processRow.directory_id === null) {
    setInstancePrepareFailed(instanceId, 'Process has no app directory')
    return false
  }

  let imageId = row.image_id
  let checksum = row.directory_checksum

  // Detect stale image: verify the stored checksum matches the current directory,
  // AND that the image was actually built under the current compiler/build SHA.
  // This must run before the bundle cache check — the cache uses the stored checksum
  // and would incorrectly serve a stale bundle if the directory has since changed.
  //
  // Directory-content staleness alone isn't enough: getOrCreateImage's own
  // cache_key is scoped to imageCacheKey(sha, dirHash), correctly rebuilding
  // when the compiler changes even if the .gapp's own files haven't — but that
  // only helps if getOrCreateImage actually gets called again. Once an
  // instance's image_id is set, it was previously reused forever as long as
  // the directory hash matched, silently pinning it to whatever compileGappTree
  // output existed the first time this instance's image was built — a fix to
  // compileGappTree (or the registry it reads from) would never reach an
  // already-launched instance until its .gapp directory *also* happened to
  // change, even though a correctly-recompiled image was one getOrCreateImage
  // call away. Comparing the image's own stored cache_key here closes that gap.
  if (imageId && checksum !== PENDING_INSTANCE_CHECKSUM) {
    const currentHash = await hashDir(processRow.directory_id)
    if (currentHash !== checksum) {
      console.log(`[instance] directory changed for ${instanceId}, rebuilding image`)
      imageId = null
      checksum = PENDING_INSTANCE_CHECKSUM
    } else {
      const [imageMeta] = await db
        .select({ cache_key: schema.image.cache_key })
        .from(schema.image)
        .where(eq(schema.image.id, imageId))
        .limit(1)
      if (imageMeta?.cache_key !== imageCacheKey(checksum)) {
        console.log(`[instance] image cache_key stale for ${instanceId} (build changed), rebuilding image`)
        imageId = null
        checksum = PENDING_INSTANCE_CHECKSUM
      }
    }
  }

  // Bundle cache key includes build SHA so compiler changes bust the cache automatically.
  const bundleCacheKey = checksum !== PENDING_INSTANCE_CHECKSUM ? imageCacheKey(checksum) : null

  if (bundleCacheKey !== null && await isBundleCached(instanceId, bundleCacheKey)) {
    await touchInstance(instanceId)
    if (row.state !== 'running') {
      await persistInstanceReady(instanceId)
    }
    setInstancePrepareReady(instanceId)
    return true
  }

  if (await isBundleCached(instanceId)) {
    await evictBundleCache(instanceId)
  }

  if (!imageId || checksum === PENDING_INSTANCE_CHECKSUM) {
    const workspaceId = await resolveWorkspaceIdForInstance(instanceId)
    const workspaceLog = workspaceId ? createWorkspaceLogWriter(workspaceId) : null

    console.log(`[instance] resolving image for ${instanceId} directory ${processRow.directory_id}`)
    setInstancePrepareProgress(instanceId, 'resolving-image', 'Resolving app bundle…')
    const image = await getOrCreateImage(processRow.directory_id, {
      onProgress: (message) => {
        setInstancePrepareProgress(instanceId, 'building-snapshot', message)
      },
      compile:
        workspaceId && workspaceLog
          ? {
              workspaceId,
              log: workspaceLog,
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
  await startInstanceRuntime(instanceId, imageCacheKey(checksum), imageRow.tar_bytes)
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
    const workspaceId = await resolveWorkspaceIdForInstance(instanceId)
    if (workspaceId) {
      const log = createWorkspaceLogWriter(workspaceId)
      await log.error('instance', message, detail || undefined)
    }
    return false
  }).finally(() => {
    preparing.delete(instanceId)
  })
  preparing.set(instanceId, work)
  return work
}