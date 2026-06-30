import fsAsync from 'node:fs/promises'
import path from 'node:path'
import { platformLibsDir } from '../gapp/registry-paths.js'

// Virtual filesystem IDs are path strings like "/mnt/registry/kernel/1.0.0.js".
// Real DB entry IDs are numbers. typeof id === 'string' is sufficient to distinguish them.

const MNT_ROOT = '/mnt'

export function isVfsId(id: unknown): id is string {
  return typeof id === 'string'
}

function vfsId(...segments: string[]): string {
  return [MNT_ROOT, ...segments].join('/')
}

function parseVfsId(id: string): { mountName: string | null; segments: string[] } {
  const parts = id.replace(/^\/mnt\/?/, '').split('/').filter(Boolean)
  const [mountName = null, ...segments] = parts
  return { mountName, segments }
}

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export type VfsEntry = {
  type: 'directory' | 'file'
  id: string
  name: string
  mime_type?: string
}

export type VfsBrowseResult = {
  id: string
  name: string
  parent_id: string | null
  can_go_up: boolean
  path: string
  entries: VfsEntry[]
}

export type VfsReadResult = {
  id: string
  name: string
  content: string
  mime_type: string
}

export class VfsError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 501 = 400,
  ) {
    super(message)
  }
}

export interface VirtualMount {
  browse(segments: string[]): Promise<VfsBrowseResult>
  read(segments: string[]): Promise<VfsReadResult>
}

// -------------------------------------------------------------------------
// RegistryMount — exposes src/gapp/registry/libs/ as a browseable tree
// -------------------------------------------------------------------------

class RegistryMount implements VirtualMount {
  async browse(segments: string[]): Promise<VfsBrowseResult> {
    if (segments.length === 0) {
      const names = await fsAsync.readdir(platformLibsDir)
      return {
        id: vfsId('registry'),
        name: 'registry',
        parent_id: MNT_ROOT,
        can_go_up: true,
        path: '/mnt/registry',
        entries: names.map(name => ({
          type: 'directory',
          id: vfsId('registry', name),
          name,
        })),
      }
    }

    if (segments.length === 1) {
      const libDir = path.join(platformLibsDir, segments[0])
      const files = await fsAsync.readdir(libDir)
      return {
        id: vfsId('registry', segments[0]),
        name: segments[0],
        parent_id: vfsId('registry'),
        can_go_up: true,
        path: `/mnt/registry/${segments[0]}`,
        entries: files
          .filter(f => f.endsWith('.js'))
          .map(name => ({
            type: 'file',
            id: vfsId('registry', segments[0], name),
            name,
            mime_type: 'application/javascript',
          })),
      }
    }

    throw new VfsError('Not found', 404)
  }

  async read(segments: string[]): Promise<VfsReadResult> {
    // segments: [libName, versionFile]  e.g. ['kernel', '1.0.0.js']
    if (segments.length !== 2 || !segments[1].endsWith('.js')) {
      throw new VfsError('Not found', 404)
    }
    const filePath = path.join(platformLibsDir, segments[0], segments[1])
    let content: string
    try {
      content = await fsAsync.readFile(filePath, 'utf8')
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw new VfsError('Not found', 404)
      throw err
    }
    return {
      id: vfsId('registry', ...segments),
      name: segments[1],
      content,
      mime_type: 'application/javascript',
    }
  }
}

// -------------------------------------------------------------------------
// FtpMount — stub for FTP-backed virtual filesystem
//
// To implement:
//   - Store per-user FTP credentials/connections in a session map (keyed by
//     userId) so each user can have a different server/credentials without
//     leaking connections across accounts.
//   - browse(): connect (or reuse connection), run FTP LIST on the path
//     derived from `segments`, parse the directory listing into VfsEntry[].
//   - read(): run FTP RETR on the derived path, buffer the stream, return as
//     UTF-8. Reject binary files the same way fsRead does.
//   - On connection error, throw VfsError('FTP connection failed', 503)
//     (add 503 to the status union when implementing).
// -------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class FtpMount implements VirtualMount {
  async browse(_segments: string[]): Promise<VfsBrowseResult> {
    throw new VfsError('FTP mounts are not yet implemented', 501)
  }

  async read(_segments: string[]): Promise<VfsReadResult> {
    throw new VfsError('FTP mounts are not yet implemented', 501)
  }
}

// -------------------------------------------------------------------------
// Router
// -------------------------------------------------------------------------

const mounts: Record<string, VirtualMount> = {
  registry: new RegistryMount(),
  // ftp: new FtpMount(),  // register when implemented
}

/** Synthetic entry injected into the Desktop root listing. */
export const MNT_ENTRY: VfsEntry = {
  type: 'directory',
  id: '/mnt',
  name: 'mnt',
}

export async function vfsBrowse(id: string): Promise<VfsBrowseResult> {
  if (id === '/mnt') {
    return {
      id: '/mnt',
      name: 'mnt',
      parent_id: null,
      can_go_up: true,
      path: '/mnt',
      entries: Object.keys(mounts).map(name => ({
        type: 'directory',
        id: vfsId(name),
        name,
      })),
    }
  }

  const { mountName, segments } = parseVfsId(id)
  if (!mountName || !mounts[mountName]) throw new VfsError('Mount not found', 404)
  return mounts[mountName].browse(segments)
}

export async function vfsRead(id: string): Promise<VfsReadResult> {
  const { mountName, segments } = parseVfsId(id)
  if (!mountName || !mounts[mountName]) throw new VfsError('Mount not found', 404)
  return mounts[mountName].read(segments)
}
