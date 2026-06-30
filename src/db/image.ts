import { createHash } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import * as tar from "tar";
import { PassThrough } from "stream";
import { db } from "./index.js";
import { directory, image } from "./schema.js";
import type { GappCompileContext } from "../gapp/compile-context.js";
import { compileGappTree } from "../gapp/compile-gapp.js";
import { imageCacheKey } from "../gapp/compiler-version.js";
import { hashDir, hashTree, collectTree, type DirEntry, type FileEntry } from "./file.js";

type InnerFns = {
  // listFiles: () => Promise<{ id: number; name: string; mime_type: string }[]>;
  // listDirs: () => Promise<{ id: number; name: string }[]>;
  // recomputeHash: () => Promise<string>;
};

export type ImageBuildContext = {
  onProgress?: (message: string) => void
  compile?: GappCompileContext
}

export async function access<T>(
  imageId: number,
  callback: (inner: InnerFns) => Promise<T>
): Promise<T> {
  const row = await db
    .select({ directory_id: image.directory_id, directory_checksum: image.directory_checksum })
    .from(image)
    .where(eq(image.id, imageId))
    .limit(1);

  if (!row[0]) throw new Error(`Image ${imageId} not found`);

  const { directory_id, directory_checksum } = row[0];
  const currentHash = await hashDir(directory_id);

  if (currentHash !== directory_checksum) {
    throw new Error(`Image ${imageId} checksum mismatch — directory has been modified`);
  }

  const inner: InnerFns = {
  };

  return callback(inner);
}


function addTarDirectory(pack: tar.Pack, entryPath: string): void {
  const entry = new tar.ReadEntry(new tar.Header({ path: entryPath, type: "Directory", size: 0 }));
  entry.end();
  pack.add(entry);
}

function addTarFile(pack: tar.Pack, entryPath: string, content: Buffer): void {
  const entry = new tar.ReadEntry(new tar.Header({ path: entryPath, type: "File", size: content.length }));
  entry.write(content);
  entry.end();
  pack.add(entry);
}

async function buildTar(dirName: string, dirs: DirEntry[], files: FileEntry[]): Promise<Buffer> {
  const pack = new tar.Pack();
  const chunks: Buffer[] = [];
  const out = new PassThrough();
  out.on("data", (chunk: Buffer) => chunks.push(chunk));

  pack.pipe(out);

  addTarDirectory(pack, `${dirName}/`);

  for (const d of dirs) {
    addTarDirectory(pack, `${d.path}/`);
  }

  for (const f of files) {
    addTarFile(pack, f.path, f.content);
  }

  pack.end();

  await new Promise<void>((resolve, reject) => {
    out.on("finish", resolve);
    out.on("error", reject);
    pack.on("error", reject);
  });
  return Buffer.concat(chunks);
}

export async function resolveImageMeta(
  directoryId: number,
): Promise<{ id: number; directory_checksum: string } | null> {
  const [row] = await db
    .select({
      id: image.id,
      directory_checksum: image.directory_checksum,
    })
    .from(image)
    .where(eq(image.directory_id, directoryId))
    .orderBy(desc(image.id))
    .limit(1)

  if (!row?.directory_checksum) return null
  return { id: row.id, directory_checksum: row.directory_checksum }
}

export async function getOrCreateImage(
  directoryId: number,
  opts?: ImageBuildContext,
): Promise<{
  id: number
  directory_checksum: string
  tar_checksum: string
}> {
  opts?.onProgress?.('Building snapshot…')
  const directory_checksum = await hashDir(directoryId)
  const cache_key = imageCacheKey(directory_checksum)
  const [existing] = await db
    .select({
      id: image.id,
      directory_checksum: image.directory_checksum,
      tar_checksum: image.tar_checksum,
    })
    .from(image)
    .where(and(
      eq(image.directory_id, directoryId),
      eq(image.cache_key, cache_key),
    ))
    .limit(1)

  if (existing?.tar_checksum) {
    await opts?.compile?.log.info('compile', 'Using cached app bundle')
    return {
      id: existing.id,
      directory_checksum: existing.directory_checksum!,
      tar_checksum: existing.tar_checksum,
    }
  }

  opts?.onProgress?.('Compiling app…')
  const id = await createImage(directoryId, opts)
  const [row] = await db
    .select({
      id: image.id,
      directory_checksum: image.directory_checksum,
      tar_checksum: image.tar_checksum,
    })
    .from(image)
    .where(eq(image.id, id))
    .limit(1)

  if (!row?.tar_checksum) {
    throw new Error(`Image ${id} was created without tar checksum`)
  }

  return {
    id: row.id,
    directory_checksum: row.directory_checksum!,
    tar_checksum: row.tar_checksum,
  }
}

export async function createImage(
  directoryId: number,
  opts?: ImageBuildContext,
): Promise<number> {
  const dirRow = await db
    .select({ name: directory.name })
    .from(directory)
    .where(eq(directory.id, directoryId))
    .limit(1);

  if (!dirRow[0]) throw new Error(`Directory ${directoryId} not found`);

  const dirName = dirRow[0].name;
  const { dirs, files } = await collectTree(directoryId, dirName);
  const directory_checksum = hashTree(dirs, files);

  const compiledFiles = await compileGappTree(dirName, files, opts?.compile ? {
    ...opts.compile,
    bundleName: opts.compile.bundleName ?? dirName,
  } : undefined)
  const tar_bytes = await buildTar(dirName, dirs, compiledFiles);
  const tar_checksum = createHash("sha1").update(tar_bytes).digest("hex");

  const cache_key = imageCacheKey(directory_checksum)
  const [row] = await db
    .insert(image)
    .values({ directory_id: directoryId, directory_checksum, tar_checksum, tar_bytes, cache_key })
    .returning({ id: image.id });

  return row.id;
}