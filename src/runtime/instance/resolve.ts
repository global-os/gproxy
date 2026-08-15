import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as schema from '../../db/schema.js'
import { isValidInstanceSlug } from './slug.js'

// Slug → instance-id cache (positive and negative). Every `/instance/*` request
// resolves its slug here — a webview page load fires dozens of asset requests,
// each one hitting this lookup on the DB, which exhausts the serverless pool
// (max 3) under burst and surfaces as `sorry, too many clients already`. The
// instance slug↔id mapping is effectively immutable (slugs are unguessable and
// assigned once), so caching both hits and misses is safe; the one mutation
// (legacy-slug upgrade) evicts below.
const cache = new Map<string, number | null>()

export async function resolveInstanceIdBySlug(
  slug: string
): Promise<number | null> {
  if (!isValidInstanceSlug(slug)) return null
  if (cache.has(slug)) return cache.get(slug)!

  const [row] = await db
    .select({ id: schema.instances.id })
    .from(schema.instances)
    .where(eq(schema.instances.slug, slug))
    .limit(1)

  const id = row?.id ?? null
  cache.set(slug, id)
  return id
}

export function evictInstanceSlugCache(slug: string): void {
  cache.delete(slug)
}
