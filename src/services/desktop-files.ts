import { and, eq, isNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'

export function normalizeDesktopFilename(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > 200) return null
  if (trimmed === '.' || trimmed === '..') return null
  if (/[\/\\<>:"|?*\x00-\x1f]/.test(trimmed)) return null
  return trimmed
}

export async function resolveDesktopDirectoryId(
  db: NodePgDatabase<typeof schema>,
  userId: string,
): Promise<number | null> {
  const [usersDir] = await db
    .select({ id: schema.directory.id })
    .from(schema.directory)
    .where(and(
      eq(schema.directory.user_id, userId),
      eq(schema.directory.name, 'Users'),
      isNull(schema.directory.parent_id),
    ))
    .limit(1)

  if (!usersDir) return null

  const [desktopDir] = await db
    .select({ id: schema.directory.id })
    .from(schema.directory)
    .where(and(
      eq(schema.directory.parent_id, usersDir.id),
      eq(schema.directory.name, 'Desktop'),
    ))
    .limit(1)

  return desktopDir?.id ?? null
}

function mimeForFilename(name: string): string {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const map: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.html': 'text/html',
  }
  return map[ext.toLowerCase()] ?? 'text/plain'
}

export async function upsertDesktopFile(
  db: NodePgDatabase<typeof schema>,
  userId: string,
  filename: string,
  content: string,
): Promise<{ id: number; name: string; created: boolean }> {
  const name = normalizeDesktopFilename(filename)
  if (!name) {
    throw new Error('Invalid filename')
  }

  const desktopId = await resolveDesktopDirectoryId(db, userId)
  if (!desktopId) {
    throw new Error('Desktop not found')
  }

  const bytes = Buffer.from(content, 'utf-8')
  const mime_type = mimeForFilename(name)

  const [existing] = await db
    .select({ id: schema.file.id })
    .from(schema.file)
    .where(and(
      eq(schema.file.parent_id, desktopId),
      eq(schema.file.name, name),
    ))
    .limit(1)

  if (existing) {
    await db
      .update(schema.file)
      .set({ content: bytes, mime_type })
      .where(eq(schema.file.id, existing.id))

    return { id: existing.id, name, created: false }
  }

  const [created] = await db
    .insert(schema.file)
    .values({
      name,
      content: bytes,
      mime_type,
      hash_method: 'sha1',
      parent_id: desktopId,
      user_id: userId,
    })
    .returning({ id: schema.file.id })

  return { id: created.id, name, created: true }
}