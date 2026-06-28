import { Readable } from 'node:stream'
import { and, asc, eq, sql } from 'drizzle-orm'
import * as tar from 'tar'
import { db } from './index.js'
import * as schema from './schema.js'
import { INSTANCE_CACHE_MAX_BYTES } from '../runtime/constants.js'

const INSERT_CHUNK_SIZE = 40

async function parseTarBytes(tarBytes: Buffer): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>()

  await new Promise<void>((resolve, reject) => {
    const parser = new tar.Parser({
      onReadEntry(entry) {
        if (entry.type !== 'File') {
          entry.resume()
          return
        }

        const chunks: Buffer[] = []
        entry.on('data', (chunk: Buffer) => chunks.push(chunk))
        entry.on('end', () => {
          files.set(entry.path, Buffer.concat(chunks))
        })
      },
    })
    parser.on('end', () => resolve())
    parser.on('error', reject)
    Readable.from(tarBytes).pipe(parser)
  })

  return files
}

function findIndexPath(paths: Iterable<string>): string | null {
  const pathSet = new Set(paths)
  if (pathSet.has('index.html')) return 'index.html'
  for (const entryPath of pathSet) {
    if (entryPath.endsWith('/index.html')) return entryPath
  }
  return null
}

function indexDirectoryPrefix(paths: Iterable<string>): string | null {
  const indexPath = findIndexPath(paths)
  if (!indexPath) return null
  const slash = indexPath.lastIndexOf('/')
  return slash >= 0 ? indexPath.slice(0, slash + 1) : ''
}

function resolveBundlePath(paths: Iterable<string>, urlPath: string): string | null {
  const pathSet = new Set(paths)
  const safePath = urlPath.replace(/^(\.\.(\/|\\|$))+/, '')
  const relative = safePath === '/' ? '' : safePath.replace(/^\//, '')

  if (relative && pathSet.has(relative)) return relative

  if (relative) {
    const indexDir = indexDirectoryPrefix(pathSet)
    if (indexDir) {
      const sibling = `${indexDir}${relative}`
      if (pathSet.has(sibling)) return sibling
    }

    const withSlash = relative.endsWith('/') ? relative : `${relative}/`
    const indexCandidate = `${withSlash}index.html`
    if (pathSet.has(indexCandidate)) return indexCandidate
  }

  if (!relative || relative.endsWith('/')) {
    return findIndexPath(pathSet)
  }

  return null
}

export async function isInstanceBundleCached(
  instanceId: number,
  expectedChecksum?: string,
): Promise<boolean> {
  const [row] = await db
    .select({
      directory_checksum: schema.instanceBundleCache.directory_checksum,
    })
    .from(schema.instanceBundleCache)
    .where(eq(schema.instanceBundleCache.instance_id, instanceId))
    .limit(1)

  if (!row) return false
  if (expectedChecksum && row.directory_checksum !== expectedChecksum) return false
  return true
}

export async function touchInstanceBundleCache(instanceId: number): Promise<void> {
  await db
    .update(schema.instanceBundleCache)
    .set({ last_used_at: new Date() })
    .where(eq(schema.instanceBundleCache.instance_id, instanceId))
}

export async function evictInstanceBundleCache(instanceId: number): Promise<void> {
  await db
    .delete(schema.instanceBundleFile)
    .where(eq(schema.instanceBundleFile.instance_id, instanceId))
  await db
    .delete(schema.instanceBundleCache)
    .where(eq(schema.instanceBundleCache.instance_id, instanceId))
}

export async function runInstanceBundleCacheEviction(): Promise<void> {
  const [totals] = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.instanceBundleCache.byte_size}), 0)::int`,
    })
    .from(schema.instanceBundleCache)

  let remaining = Number(totals?.total ?? 0)
  if (remaining <= INSTANCE_CACHE_MAX_BYTES) return

  const rows = await db
    .select({
      instance_id: schema.instanceBundleCache.instance_id,
      byte_size: schema.instanceBundleCache.byte_size,
    })
    .from(schema.instanceBundleCache)
    .orderBy(asc(schema.instanceBundleCache.last_used_at))

  for (const row of rows) {
    if (remaining <= INSTANCE_CACHE_MAX_BYTES) break
    await evictInstanceBundleCache(row.instance_id)
    remaining -= row.byte_size
    console.log(`[runtime] evicted instance bundle cache ${row.instance_id}`)
  }
}

export async function ensureInstanceBundleCached(
  instanceId: number,
  tarBytes: Buffer,
  checksum: string,
): Promise<void> {
  if (await isInstanceBundleCached(instanceId, checksum)) {
    await touchInstanceBundleCache(instanceId)
    return
  }

  const files = await parseTarBytes(tarBytes)
  let byteSize = 0
  for (const content of files.values()) {
    byteSize += content.length
  }

  const fileRows = [...files.entries()].map(([path, content]) => ({
    instance_id: instanceId,
    path,
    content,
  }))

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.instanceBundleFile)
      .where(eq(schema.instanceBundleFile.instance_id, instanceId))
    await tx
      .delete(schema.instanceBundleCache)
      .where(eq(schema.instanceBundleCache.instance_id, instanceId))

    for (let i = 0; i < fileRows.length; i += INSERT_CHUNK_SIZE) {
      await tx
        .insert(schema.instanceBundleFile)
        .values(fileRows.slice(i, i + INSERT_CHUNK_SIZE))
    }

    await tx.insert(schema.instanceBundleCache).values({
      instance_id: instanceId,
      directory_checksum: checksum,
      last_used_at: new Date(),
      byte_size: byteSize,
    })
  })

  await runInstanceBundleCacheEviction()
}

export type InstanceBundleFile = {
  path: string
  data: Buffer
}

export async function resolveInstanceBundleFile(
  instanceId: number,
  urlPath: string,
): Promise<InstanceBundleFile | null> {
  const paths = await db
    .select({ path: schema.instanceBundleFile.path })
    .from(schema.instanceBundleFile)
    .where(eq(schema.instanceBundleFile.instance_id, instanceId))

  if (paths.length === 0) return null

  const entryPath = resolveBundlePath(paths.map((row) => row.path), urlPath)
  if (!entryPath) return null

  const [row] = await db
    .select({ content: schema.instanceBundleFile.content })
    .from(schema.instanceBundleFile)
    .where(and(
      eq(schema.instanceBundleFile.instance_id, instanceId),
      eq(schema.instanceBundleFile.path, entryPath),
    ))
    .limit(1)

  if (!row) return null
  return { path: entryPath, data: row.content }
}