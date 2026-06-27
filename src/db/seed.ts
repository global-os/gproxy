import fs from 'fs'
import path from 'path'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from './index.js'
import { user, directory, file } from './schema.js'

const FIXTURE_EMAIL = 'peterson@sent.com'

type SyncStats = {
  directoriesCreated: number
  filesCreated: number
  filesUpdated: number
}

export async function seedUserFixtures() {
  const [userRow] = await db.select({ id: user.id }).from(user).where(eq(user.email, FIXTURE_EMAIL))
  if (!userRow) {
    console.log(`Seed: ${FIXTURE_EMAIL} not found, skipping`)
    return
  }

  const fixtureBase = path.resolve(process.cwd(), 'fixtures/by-user', FIXTURE_EMAIL)
  if (!fs.existsSync(fixtureBase)) {
    console.log(`Seed: no fixtures at ${fixtureBase}, skipping`)
    return
  }

  const stats: SyncStats = {
    directoriesCreated: 0,
    filesCreated: 0,
    filesUpdated: 0,
  }

  await syncWalk(fixtureBase, null, userRow.id, stats)

  const changes =
    stats.directoriesCreated + stats.filesCreated + stats.filesUpdated
  if (changes === 0) {
    console.log(`Seed: fixtures already up to date for ${FIXTURE_EMAIL}`)
    return
  }

  console.log(
    `Seed: synced fixtures for ${FIXTURE_EMAIL} `
    + `(+${stats.directoriesCreated} dirs, +${stats.filesCreated} files, `
    + `~${stats.filesUpdated} updated)`,
  )
}

async function syncWalk(
  fsPath: string,
  parentId: number | null,
  userId: string,
  stats: SyncStats,
) {
  for (const entry of fs.readdirSync(fsPath, { withFileTypes: true })) {
    const fullPath = path.join(fsPath, entry.name)
    const name = entry.name === '~' ? 'Users' : entry.name

    if (entry.isDirectory()) {
      const dirId = await ensureDirectory(parentId, name, userId, stats)
      await syncWalk(fullPath, dirId, userId, stats)
      continue
    }

    await ensureFile(parentId!, entry.name, fs.readFileSync(fullPath), userId, stats)
  }
}

async function ensureDirectory(
  parentId: number | null,
  name: string,
  userId: string,
  stats: SyncStats,
): Promise<number> {
  const where = parentId === null
    ? and(
      eq(directory.user_id, userId),
      isNull(directory.parent_id),
      eq(directory.name, name),
    )
    : and(eq(directory.parent_id, parentId), eq(directory.name, name))

  const [existing] = await db
    .select({ id: directory.id })
    .from(directory)
    .where(where)
    .limit(1)

  if (existing) return existing.id

  const [created] = await db
    .insert(directory)
    .values({ name, parent_id: parentId, user_id: userId })
    .returning({ id: directory.id })

  stats.directoriesCreated += 1
  return created.id
}

async function ensureFile(
  parentId: number,
  name: string,
  content: Buffer,
  userId: string,
  stats: SyncStats,
) {
  const mime_type = mimeFor(path.extname(name))

  const [existing] = await db
    .select({ id: file.id, content: file.content })
    .from(file)
    .where(and(eq(file.parent_id, parentId), eq(file.name, name)))
    .limit(1)

  if (!existing) {
    await db.insert(file).values({
      name,
      content,
      mime_type,
      hash_method: 'sha1',
      parent_id: parentId,
      user_id: userId,
    })
    stats.filesCreated += 1
    return
  }

  const existingContent = Buffer.isBuffer(existing.content)
    ? existing.content
    : Buffer.from(existing.content)

  if (existingContent.equals(content)) return

  await db
    .update(file)
    .set({ content, mime_type })
    .where(eq(file.id, existing.id))

  stats.filesUpdated += 1
}

function mimeFor(ext: string): string {
  const map: Record<string, string> = {
    '.app': 'text/html',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.cljs': 'text/plain',
  }
  return map[ext.toLowerCase()] ?? 'application/octet-stream'
}