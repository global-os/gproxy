import { createHash } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from './index.js'
import { directory, file } from './schema.js'

export type DirEntry = { id: number; name: string; path: string }
export type FileEntry = { name: string; path: string; content: Buffer }

export async function collectTree(
  dirId: number,
  dirPath: string
): Promise<{ dirs: DirEntry[]; files: FileEntry[] }> {
  const dirs: DirEntry[] = []
  const files: FileEntry[] = []
  const queue: { id: number; path: string }[] = [{ id: dirId, path: dirPath }]

  while (queue.length > 0) {
    const { id: currentId, path: currentPath } = queue.shift()!

    const foundFiles = await db
      .select({ name: file.name, content: file.content })
      .from(file)
      .where(eq(file.parent_id, currentId))

    for (const f of foundFiles) {
      files.push({
        name: f.name,
        path: `${currentPath}/${f.name}`,
        content: f.content,
      })
    }

    const subdirs = await db
      .select({ id: directory.id, name: directory.name })
      .from(directory)
      .where(eq(directory.parent_id, currentId))

    for (const d of subdirs) {
      const subPath = `${currentPath}/${d.name}`
      dirs.push({ id: d.id, name: d.name, path: subPath })
      queue.push({ id: d.id, path: subPath })
    }
  }

  return { dirs, files }
}

export async function hashFile(fileId: number): Promise<string> {
  const row = await db
    .select({ content: file.content })
    .from(file)
    .where(eq(file.id, fileId))
    .limit(1)
  if (!row[0]) throw new Error(`File ${fileId} not found`)
  return createHash('sha1').update(row[0].content).digest('hex')
}

export function hashTree(dirs: DirEntry[], files: FileEntry[]): string {
  const hash = createHash('sha1')
  for (const f of files) {
    hash.update(f.name)
    hash.update('\x00')
    hash.update(f.content)
    hash.update('\x00')
  }

  hash.update('\x00\x00\x00\x00')

  for (const d of dirs) {
    hash.update(d.name)
    hash.update('\x00')
  }
  return hash.digest('hex')
}

export async function hashDir(dirId: number): Promise<string> {
  // Pass "" as dirPath because hashTree ignores paths entirely (only uses name+content).
  // The other caller in image.ts passes the real dirName because buildTar needs paths.
  const { dirs, files } = await collectTree(dirId, '')

  return hashTree(dirs, files)
}
