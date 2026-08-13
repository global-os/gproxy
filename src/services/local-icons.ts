import { and, eq, isNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { isResourceIconPath } from '../gapp/icon-ids.js'
import * as schema from '../db/schema.js'

async function resolveChildDirectoryId(
  db: NodePgDatabase<typeof schema>,
  parentId: number,
  name: string
): Promise<number | null> {
  const [row] = await db
    .select({ id: schema.directory.id })
    .from(schema.directory)
    .where(
      and(
        eq(schema.directory.parent_id, parentId),
        eq(schema.directory.name, name)
      )
    )
    .limit(1)

  return row?.id ?? null
}

export async function resolveLocalIconsDirectoryId(
  db: NodePgDatabase<typeof schema>,
  userId: string
): Promise<number | null> {
  const [resourcesDir] = await db
    .select({ id: schema.directory.id })
    .from(schema.directory)
    .where(
      and(
        eq(schema.directory.user_id, userId),
        eq(schema.directory.name, '.Resources'),
        isNull(schema.directory.parent_id)
      )
    )
    .limit(1)

  if (!resourcesDir) return null

  const iconsDirId = await resolveChildDirectoryId(db, resourcesDir.id, 'icons')
  if (!iconsDirId) return null

  return resolveChildDirectoryId(db, iconsDirId, '16x16')
}

export async function readResourceIconBmp(
  db: NodePgDatabase<typeof schema>,
  userId: string,
  iconPath: string
): Promise<Buffer | null> {
  if (!isResourceIconPath(iconPath)) return null

  const fileName = iconPath.slice(iconPath.lastIndexOf('/') + 1)
  const iconsDirId = await resolveLocalIconsDirectoryId(db, userId)
  if (!iconsDirId) return null

  const [row] = await db
    .select({ content: schema.file.content })
    .from(schema.file)
    .where(
      and(eq(schema.file.parent_id, iconsDirId), eq(schema.file.name, fileName))
    )
    .limit(1)

  if (!row) return null

  return Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content)
}
