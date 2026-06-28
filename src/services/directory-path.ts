import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'

export async function resolveDirectoryPath(
  db: NodePgDatabase<typeof schema>,
  directoryId: number,
): Promise<string> {
  const segments: string[] = []
  let currentId: number | null = directoryId

  while (currentId !== null) {
    const [row] = await db
      .select({
        name: schema.directory.name,
        parent_id: schema.directory.parent_id,
      })
      .from(schema.directory)
      .where(eq(schema.directory.id, currentId))
      .limit(1)

    if (!row) break
    segments.push(row.name)
    currentId = row.parent_id
  }

  return `/${segments.reverse().join('/')}`
}