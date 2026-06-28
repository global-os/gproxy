import { and, eq, isNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { cleanupDirectoryAppRefs } from '../services/directory-cleanup.js'
import { resolveDesktopDirectoryId, upsertDesktopFile } from '../services/desktop-files.js'
import type { SyscallContext, SyscallHandler, SyscallResult } from './types.js'

class FsError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409 = 400,
  ) {
    super(message)
  }
}

function fail(err: unknown): SyscallResult {
  if (err instanceof FsError) {
    return { ok: false, message: err.message, status: err.status }
  }
  const message = err instanceof Error ? err.message : 'Request failed'
  return { ok: false, message, status: 500 }
}

function normalizeEntryName(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > 200) return null
  if (trimmed === '.' || trimmed === '..') return null
  if (/[\/\\<>:"|?*\x00-\x1f]/.test(trimmed)) return null
  return trimmed
}

async function resolveUsersDirectoryId(
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

  return usersDir?.id ?? null
}

async function isWithinUserTree(
  db: NodePgDatabase<typeof schema>,
  userId: string,
  directoryId: number,
): Promise<boolean> {
  let currentId: number | null = directoryId

  while (currentId !== null) {
    const [row] = await db
      .select({
        parent_id: schema.directory.parent_id,
        user_id: schema.directory.user_id,
      })
      .from(schema.directory)
      .where(eq(schema.directory.id, currentId))
      .limit(1)

    if (!row) return false
    if (row.user_id === userId) return true
    currentId = row.parent_id
  }

  return false
}

async function resolveDirectoryPath(
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

async function getDirectory(
  db: NodePgDatabase<typeof schema>,
  userId: string,
  directoryId: number,
) {
  const [dir] = await db
    .select({
      id: schema.directory.id,
      name: schema.directory.name,
      parent_id: schema.directory.parent_id,
    })
    .from(schema.directory)
    .where(eq(schema.directory.id, directoryId))
    .limit(1)

  if (!dir) throw new FsError('Directory not found', 404)
  if (!await isWithinUserTree(db, userId, directoryId)) {
    throw new FsError('Forbidden', 403)
  }

  return dir
}

async function getFile(
  db: NodePgDatabase<typeof schema>,
  userId: string,
  fileId: number,
) {
  const [row] = await db
    .select({
      id: schema.file.id,
      name: schema.file.name,
      parent_id: schema.file.parent_id,
      user_id: schema.file.user_id,
    })
    .from(schema.file)
    .where(eq(schema.file.id, fileId))
    .limit(1)

  if (!row) throw new FsError('File not found', 404)
  if (row.user_id !== userId && !await isWithinUserTree(db, userId, row.parent_id)) {
    throw new FsError('Forbidden', 403)
  }

  return row
}

async function assertNameAvailable(
  db: NodePgDatabase<typeof schema>,
  parentId: number,
  name: string,
  excludeDirId?: number,
  excludeFileId?: number,
) {
  const [existingDir] = await db
    .select({ id: schema.directory.id })
    .from(schema.directory)
    .where(and(
      eq(schema.directory.parent_id, parentId),
      eq(schema.directory.name, name),
    ))
    .limit(1)

  if (existingDir && existingDir.id !== excludeDirId) {
    throw new FsError('A folder with that name already exists', 409)
  }

  const [existingFile] = await db
    .select({ id: schema.file.id })
    .from(schema.file)
    .where(and(
      eq(schema.file.parent_id, parentId),
      eq(schema.file.name, name),
    ))
    .limit(1)

  if (existingFile && existingFile.id !== excludeFileId) {
    throw new FsError('A file with that name already exists', 409)
  }
}

export const fsBrowse: SyscallHandler = async ({ db, userId }, args) => {
  try {
    const directoryId = typeof args.directoryId === 'number' ? args.directoryId : undefined
    const resolvedId = directoryId ?? await resolveDesktopDirectoryId(db, userId)
    if (!resolvedId) throw new FsError('Desktop not found', 404)

    const dir = await getDirectory(db, userId, resolvedId)
    const usersRootId = await resolveUsersDirectoryId(db, userId)

    const [dirs, files] = await Promise.all([
      db.select({ id: schema.directory.id, name: schema.directory.name })
        .from(schema.directory)
        .where(eq(schema.directory.parent_id, resolvedId)),
      db.select({ id: schema.file.id, name: schema.file.name, mime_type: schema.file.mime_type })
        .from(schema.file)
        .where(eq(schema.file.parent_id, resolvedId)),
    ])

    return {
      ok: true,
      result: {
        directory_id: dir.id,
        name: dir.name,
        parent_id: dir.parent_id,
        path: await resolveDirectoryPath(db, dir.id),
        can_go_up: dir.parent_id !== null && dir.id !== usersRootId,
        entries: [
          ...dirs.map(d => ({ type: 'directory' as const, id: d.id, name: d.name })),
          ...files.map(f => ({
            type: 'file' as const,
            id: f.id,
            name: f.name,
            mime_type: f.mime_type,
          })),
        ].sort((a, b) => a.name.localeCompare(b.name)),
      },
    }
  } catch (err) {
    return fail(err)
  }
}

export const fsMkdir: SyscallHandler = async ({ db, userId }, args) => {
  try {
    const parentId = args.parentId
    const name = normalizeEntryName(typeof args.name === 'string' ? args.name : '')
    if (typeof parentId !== 'number' || !name) {
      throw new FsError('parentId and name are required')
    }

    await getDirectory(db, userId, parentId)
    await assertNameAvailable(db, parentId, name)

    const [created] = await db
      .insert(schema.directory)
      .values({ name, parent_id: parentId, user_id: userId })
      .returning({ id: schema.directory.id })

    return { ok: true, result: { id: created.id, name }, status: 201 }
  } catch (err) {
    return fail(err)
  }
}

export const fsRename: SyscallHandler = async ({ db, userId }, args) => {
  try {
    const entryType = args.entryType
    const id = args.id
    const name = normalizeEntryName(typeof args.name === 'string' ? args.name : '')

    if (
      (entryType !== 'directory' && entryType !== 'file') ||
      typeof id !== 'number' ||
      !name
    ) {
      throw new FsError('entryType, id, and name are required')
    }

    if (entryType === 'directory') {
      const dir = await getDirectory(db, userId, id)
      const usersRootId = await resolveUsersDirectoryId(db, userId)
      const desktopId = await resolveDesktopDirectoryId(db, userId)

      if (id === usersRootId || id === desktopId) {
        throw new FsError('Cannot rename this folder', 403)
      }

      await assertNameAvailable(db, dir.parent_id!, name, id)
      await db.update(schema.directory).set({ name }).where(eq(schema.directory.id, id))
      return { ok: true, result: { id, name } }
    }

    const row = await getFile(db, userId, id)
    await assertNameAvailable(db, row.parent_id, name, undefined, id)
    await db.update(schema.file).set({ name }).where(eq(schema.file.id, id))
    return { ok: true, result: { id, name } }
  } catch (err) {
    return fail(err)
  }
}

export const fsDelete: SyscallHandler = async ({ db, userId }, args) => {
  try {
    const entryType = args.entryType
    const id = args.id

    if ((entryType !== 'directory' && entryType !== 'file') || typeof id !== 'number') {
      throw new FsError('entryType and id are required')
    }

    if (entryType === 'directory') {
      const dir = await getDirectory(db, userId, id)
      const usersRootId = await resolveUsersDirectoryId(db, userId)
      const desktopId = await resolveDesktopDirectoryId(db, userId)

      if (id === usersRootId || id === desktopId) {
        throw new FsError('Cannot delete this folder', 403)
      }

      const [childDir] = await db
        .select({ id: schema.directory.id })
        .from(schema.directory)
        .where(eq(schema.directory.parent_id, id))
        .limit(1)

      const [childFile] = await db
        .select({ id: schema.file.id })
        .from(schema.file)
        .where(eq(schema.file.parent_id, id))
        .limit(1)

      if (childDir || childFile) throw new FsError('Folder is not empty', 409)

      await cleanupDirectoryAppRefs(db, userId, dir.id, dir.name)
      await db.delete(schema.directory).where(eq(schema.directory.id, dir.id))
      return { ok: true }
    }

    const row = await getFile(db, userId, id)
    await db.delete(schema.file).where(eq(schema.file.id, row.id))
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

const BINARY_MIME_PREFIXES = [
  'image/',
  'video/',
  'audio/',
  'font/',
  'application/pdf',
  'application/zip',
  'application/gzip',
  'application/x-gzip',
  'application/octet-stream',
]

function isTextFile(mime_type: string, bytes: Buffer): boolean {
  if (BINARY_MIME_PREFIXES.some((prefix) => mime_type.startsWith(prefix))) {
    return false
  }
  if (mime_type.startsWith('text/')) return true
  if (
    mime_type === 'application/json'
    || mime_type === 'application/javascript'
    || mime_type === 'application/xml'
  ) {
    return true
  }
  if (bytes.includes(0)) return false
  const text = bytes.toString('utf8')
  return Buffer.from(text, 'utf8').equals(bytes)
}

export const fsRead: SyscallHandler = async ({ db, userId }, args) => {
  try {
    const fileId = args.fileId
    if (typeof fileId !== 'number') throw new FsError('fileId is required')

    await getFile(db, userId, fileId)

    const [row] = await db
      .select({
        id: schema.file.id,
        name: schema.file.name,
        content: schema.file.content,
        mime_type: schema.file.mime_type,
      })
      .from(schema.file)
      .where(eq(schema.file.id, fileId))
      .limit(1)

    if (!row) throw new FsError('File not found', 404)

    const bytes = Buffer.isBuffer(row.content)
      ? row.content
      : Buffer.from(row.content)

    if (!isTextFile(row.mime_type, bytes)) {
      throw new FsError('Cannot open, it\'s a binary file', 400)
    }

    return {
      ok: true,
      result: {
        id: row.id,
        name: row.name,
        mime_type: row.mime_type,
        content: bytes.toString('utf8'),
      },
    }
  } catch (err) {
    return fail(err)
  }
}

export const fsSaveDesktopFile: SyscallHandler = async ({ db, userId }, args) => {
  try {
    const filename = typeof args.filename === 'string' ? args.filename.trim() : ''
    const content = args.content
    if (!filename) throw new FsError('filename is required')
    if (typeof content !== 'string') throw new FsError('content must be a string')

    const result = await upsertDesktopFile(db, userId, filename, content)
    return { ok: true, result }
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid filename') {
      return { ok: false, message: err.message, status: 400 }
    }
    return fail(err)
  }
}