import { and, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as schema from '../../db/schema.js'

const INSERT_CHUNK_SIZE = 40

export async function isBundleCached(
  instanceId: number,
  expectedChecksum?: string,
): Promise<boolean> {
  const [row] = await db
    .select({
      directory_checksum: schema.instanceBundleCache.directory_checksum,
    })
    .from(schema.instanceBundleCache)
    .where(eq(schema.instanceBundleCache.instance_id, instanceId))
    .limit(1)

  if (!row) return false
  if (expectedChecksum && row.directory_checksum !== expectedChecksum) return false
  return true
}

export async function touchBundleCache(instanceId: number): Promise<void> {
  await db
    .update(schema.instanceBundleCache)
    .set({ last_used_at: new Date() })
    .where(eq(schema.instanceBundleCache.instance_id, instanceId))
}

export async function evictBundleCache(instanceId: number): Promise<void> {
  await db
    .delete(schema.instanceBundleFile)
    .where(eq(schema.instanceBundleFile.instance_id, instanceId))
  await db
    .delete(schema.instanceBundleCache)
    .where(eq(schema.instanceBundleCache.instance_id, instanceId))
}

export async function replaceBundleCache(
  instanceId: number,
  checksum: string,
  files: Map<string, Buffer>,
): Promise<number> {
  let byteSize = 0
  for (const content of files.values()) {
    byteSize += content.length
  }

  const fileRows = [...files.entries()].map(([path, content]) => ({
    instance_id: instanceId,
    path,
    content,
  }))

  // A cold cache means every concurrent request for this instance's assets
  // (a webview page load fires 10-20 of them at once, per the pool-exhaustion
  // note elsewhere in this file's callers) can independently decide the
  // cache needs populating and race to get here. Concurrent transactions can
  // both pass the delete step and then collide on the insert — the loser
  // hits a duplicate-key error on the (instance_id, path) primary key.
  // Since every racing caller is inserting the same rows (same source tar,
  // same checksum), onConflictDoNothing makes the loser a no-op instead of a
  // thrown error.
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.instanceBundleFile)
      .where(eq(schema.instanceBundleFile.instance_id, instanceId))
    await tx
      .delete(schema.instanceBundleCache)
      .where(eq(schema.instanceBundleCache.instance_id, instanceId))

    for (let i = 0; i < fileRows.length; i += INSERT_CHUNK_SIZE) {
      await tx
        .insert(schema.instanceBundleFile)
        .values(fileRows.slice(i, i + INSERT_CHUNK_SIZE))
        .onConflictDoNothing()
    }

    await tx.insert(schema.instanceBundleCache).values({
      instance_id: instanceId,
      directory_checksum: checksum,
      last_used_at: new Date(),
      byte_size: byteSize,
    }).onConflictDoNothing()
  })

  return byteSize
}

export async function listBundlePaths(instanceId: number): Promise<string[]> {
  const rows = await db
    .select({ path: schema.instanceBundleFile.path })
    .from(schema.instanceBundleFile)
    .where(eq(schema.instanceBundleFile.instance_id, instanceId))

  return rows.map((row) => row.path)
}

export async function readBundleFile(
  instanceId: number,
  path: string,
): Promise<Buffer | null> {
  const [row] = await db
    .select({ content: schema.instanceBundleFile.content })
    .from(schema.instanceBundleFile)
    .where(and(
      eq(schema.instanceBundleFile.instance_id, instanceId),
      eq(schema.instanceBundleFile.path, path),
    ))
    .limit(1)

  return row?.content ?? null
}