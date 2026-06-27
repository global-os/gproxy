import fs from 'fs'
import path from 'path'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from './index.js'
import {
  user,
  directory,
  file,
  image,
  instances,
  process as processTable,
  workspaceWindow,
} from './schema.js'

const FIXTURE_EMAIL = 'peterson@sent.com'

export async function seedUserFixtures() {
  const [userRow] = await db.select({ id: user.id }).from(user).where(eq(user.email, FIXTURE_EMAIL))
  if (!userRow) {
    console.log(`Seed: ${FIXTURE_EMAIL} not found, skipping`)
    return
  }

  await db.delete(file).where(eq(file.user_id, userRow.id))

  const roots = await db
    .select({ id: directory.id })
    .from(directory)
    .where(and(eq(directory.user_id, userRow.id), isNull(directory.parent_id)))

  const allDirIds: number[] = []
  for (const root of roots) {
    allDirIds.push(...(await collectDirTreeIds(root.id)))
  }

  if (allDirIds.length > 0) {
    const processRows = await db
      .select({ id: processTable.id })
      .from(processTable)
      .where(inArray(processTable.directory_id, allDirIds))
    const processIds = processRows.map((row) => row.id)

    if (processIds.length > 0) {
      await db.delete(workspaceWindow).where(inArray(workspaceWindow.process_id, processIds))
      await db.delete(instances).where(inArray(instances.process_id, processIds))
      await db.delete(processTable).where(inArray(processTable.id, processIds))
    }

    await db.delete(image).where(inArray(image.directory_id, allDirIds))
  }

  for (const root of roots) {
    await deleteDirTree(root.id)
  }

  const fixtureBase = path.resolve(process.cwd(), 'fixtures/by-user', FIXTURE_EMAIL)
  if (!fs.existsSync(fixtureBase)) return

  await walkAndCreate(fixtureBase, null, userRow.id)
  console.log(`Seed: fixtures created for ${FIXTURE_EMAIL}`)
}

async function collectDirTreeIds(dirId: number): Promise<number[]> {
  const ids = [dirId]
  const children = await db
    .select({ id: directory.id })
    .from(directory)
    .where(eq(directory.parent_id, dirId))
  for (const child of children) {
    ids.push(...(await collectDirTreeIds(child.id)))
  }
  return ids
}

async function deleteDirTree(dirId: number) {
  const children = await db
    .select({ id: directory.id })
    .from(directory)
    .where(eq(directory.parent_id, dirId))
  for (const child of children) {
    await deleteDirTree(child.id)
  }
  await db.delete(directory).where(eq(directory.id, dirId))
}

async function walkAndCreate(fsPath: string, parentId: number | null, userId: string) {
  for (const entry of fs.readdirSync(fsPath, { withFileTypes: true })) {
    const fullPath = path.join(fsPath, entry.name)
    const name = entry.name === '~' ? 'Users' : entry.name

    if (entry.isDirectory()) {
      const [dir] = await db
        .insert(directory)
        .values({ name, parent_id: parentId, user_id: userId })
        .returning({ id: directory.id })
      await walkAndCreate(fullPath, dir.id, userId)
    } else {
      await db.insert(file).values({
        name: entry.name,
        content: fs.readFileSync(fullPath),
        mime_type: mimeFor(path.extname(entry.name)),
        hash_method: 'sha1',
        parent_id: parentId!,
        user_id: userId,
      })
    }
  }
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