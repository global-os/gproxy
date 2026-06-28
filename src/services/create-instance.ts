import { desc, eq } from 'drizzle-orm'
import { resolveImageMeta } from '../db/image.js'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { PENDING_INSTANCE_CHECKSUM } from '../runtime/instance-constants.js'
import { instancePublicUrl } from '../runtime/constants.js'
import { generateInstanceSlug, isLegacyUuidSlug } from '../runtime/instance-slug.js'
import { LaunchError } from './errors.js'

const SLUG_COLLISION = '23505'

export async function upgradeLegacySlug(instanceId: number, slug: string): Promise<string> {
  if (!isLegacyUuidSlug(slug)) return slug

  for (let attempt = 0; attempt < 8; attempt++) {
    const nextSlug = generateInstanceSlug()
    try {
      const [row] = await db
        .update(schema.instances)
        .set({ slug: nextSlug })
        .where(eq(schema.instances.id, instanceId))
        .returning({ slug: schema.instances.slug })

      if (row) {
        console.log(`[instance] upgraded slug ${instanceId}: ${slug} -> ${row.slug}`)
        return row.slug
      }
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      if (code !== SLUG_COLLISION) throw err
    }
  }

  throw new LaunchError('Failed to assign instance slug', 500)
}

function toCreatedInstance(
  instanceId: number,
  instanceSlug: string,
  restarted: boolean,
): CreatedInstance {
  return {
    instanceId,
    instanceSlug,
    url: instancePublicUrl(instanceSlug),
    restarted,
  }
}

export type CreatedInstance = {
  instanceId: number
  instanceSlug: string
  url: string
  restarted: boolean
}

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
  const slug = generateInstanceSlug()

  const [instanceRow] = await db
    .insert(schema.instances)
    .values({
      slug,
      process_id: processId,
      image_id: meta?.id ?? null,
      directory_checksum: meta?.directory_checksum ?? PENDING_INSTANCE_CHECKSUM,
      state: 'starting',
    })
    .returning({
      id: schema.instances.id,
      slug: schema.instances.slug,
    })

  return toCreatedInstance(instanceRow.id, instanceRow.slug, false)
}

export async function ensurePrimaryInstance(processId: number): Promise<CreatedInstance> {
  const [existing] = await db
    .select({
      id: schema.instances.id,
      slug: schema.instances.slug,
      state: schema.instances.state,
    })
    .from(schema.instances)
    .where(eq(schema.instances.process_id, processId))
    .orderBy(desc(schema.instances.last_used_at))
    .limit(1)

  if (existing) {
    const slug = await upgradeLegacySlug(existing.id, existing.slug)
    const restarted = existing.state === 'running'
    if (existing.state !== 'starting') {
      await db
        .update(schema.instances)
        .set({ state: 'starting', last_used_at: new Date() })
        .where(eq(schema.instances.id, existing.id))
    }
    return toCreatedInstance(existing.id, slug, restarted)
  }

  return createInstanceForProcess(processId)
}