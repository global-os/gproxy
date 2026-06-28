import { and, eq, isNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { resolveDirectoryPath } from './directory-path.js'

export type FileIndexEntry = {
  type: 'directory' | 'file'
  id: number
  name: string
  path: string
  mime_type?: string
  launchable: boolean
}

async function walkDirectory(
  db: NodePgDatabase<typeof schema>,
  directoryId: number,
  directoryPath: string,
  entries: FileIndexEntry[],
): Promise<void> {
  entries.push({
    type: 'directory',
    id: directoryId,
    name: directoryPath.slice(directoryPath.lastIndexOf('/') + 1) || directoryPath,
    path: directoryPath,
    launchable: directoryPath.endsWith('.gapp'),
  })

  const [dirs, files] = await Promise.all([
    db
      .select({ id: schema.directory.id, name: schema.directory.name })
      .from(schema.directory)
      .where(eq(schema.directory.parent_id, directoryId)),
    db
      .select({
        id: schema.file.id,
        name: schema.file.name,
        mime_type: schema.file.mime_type,
      })
      .from(schema.file)
      .where(eq(schema.file.parent_id, directoryId)),
  ])

  for (const file of files) {
    entries.push({
      type: 'file',
      id: file.id,
      name: file.name,
      path: `${directoryPath}/${file.name}`,
      mime_type: file.mime_type,
      launchable: false,
    })
  }

  for (const dir of dirs) {
    const childPath = `${directoryPath}/${dir.name}`
    await walkDirectory(db, dir.id, childPath, entries)
  }
}

export async function buildUserFileIndex(
  db: NodePgDatabase<typeof schema>,
  userId: string,
): Promise<FileIndexEntry[]> {
  const roots = await db
    .select({ id: schema.directory.id })
    .from(schema.directory)
    .where(and(
      eq(schema.directory.user_id, userId),
      isNull(schema.directory.parent_id),
    ))

  const entries: FileIndexEntry[] = []

  for (const root of roots) {
    const path = await resolveDirectoryPath(db, root.id)
    await walkDirectory(db, root.id, path, entries)
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path))
}