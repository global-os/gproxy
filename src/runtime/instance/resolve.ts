import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as schema from '../../db/schema.js'
import { isValidInstanceSlug } from './slug.js'

export async function resolveInstanceIdBySlug(
  slug: string
): Promise<number | null> {
  if (!isValidInstanceSlug(slug)) return null

  const [row] = await db
    .select({ id: schema.instances.id })
    .from(schema.instances)
    .where(eq(schema.instances.slug, slug))
    .limit(1)

  return row?.id ?? null
}
