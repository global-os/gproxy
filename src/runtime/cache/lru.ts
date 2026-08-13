import { asc, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as schema from '../../db/schema.js'
import { INSTANCE_CACHE_MAX_BYTES } from './constants.js'
import { evictBundleCache } from './store.js'

/** Evict least-recently-used cached bundles until total size is under budget. */
export async function runBundleCacheEviction(): Promise<void> {
  const [totals] = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.instanceBundleCache.byte_size}), 0)::int`,
    })
    .from(schema.instanceBundleCache)

  let remaining = Number(totals?.total ?? 0)
  if (remaining <= INSTANCE_CACHE_MAX_BYTES) return

  const rows = await db
    .select({
      instance_id: schema.instanceBundleCache.instance_id,
      byte_size: schema.instanceBundleCache.byte_size,
    })
    .from(schema.instanceBundleCache)
    .orderBy(asc(schema.instanceBundleCache.last_used_at))

  for (const row of rows) {
    if (remaining <= INSTANCE_CACHE_MAX_BYTES) break
    await evictBundleCache(row.instance_id)
    remaining -= row.byte_size
    console.log(`[runtime] evicted instance bundle cache ${row.instance_id}`)
  }
}
