import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { normalizeResourceIconPath } from '../gapp/icon-ids.js'
import type { GappManifest } from '../gapp/types.js'
import * as schema from '../db/schema.js'

export async function readGappManifest(
  db: NodePgDatabase<typeof schema>,
  directoryId: number
): Promise<GappManifest | null> {
  const [row] = await db
    .select({ content: schema.file.content })
    .from(schema.file)
    .where(
      and(
        eq(schema.file.parent_id, directoryId),
        eq(schema.file.name, 'gapp.json')
      )
    )
    .limit(1)

  if (!row) return null

  try {
    return JSON.parse(row.content.toString('utf8')) as GappManifest
  } catch {
    return null
  }
}

export async function resolveGappIconPath(
  db: NodePgDatabase<typeof schema>,
  directoryId: number,
  bundleName: string
): Promise<string | undefined> {
  if (!bundleName.endsWith('.gapp')) return undefined

  const manifest = await readGappManifest(db, directoryId)
  const icon = manifest?.icon
  if (typeof icon !== 'string') return undefined
  return normalizeResourceIconPath(icon) ?? undefined
}
