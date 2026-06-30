import fs from 'node:fs'
import fsAsync from 'node:fs/promises'
import path from 'node:path'
import semver from 'semver'
import { platformLibsDir } from './registry-paths.js'

export type ResolvedLib = {
  name: string
  version: string
  /** Relative URL served by the instance handler: /platform/libs/{name}@{version}.js */
  urlPath: string
}

/** Resolve a map of name → semver-range to specific versions from the registry. */
export function resolveLibDeps(deps: Record<string, string>): ResolvedLib[] {
  return Object.entries(deps).map(([name, range]) => {
    const libDir = path.join(platformLibsDir, name)
    if (!fs.existsSync(libDir)) {
      throw new Error(`Unknown platform lib: "${name}"`)
    }

    const versions = fs.readdirSync(libDir)
      .filter(f => f.endsWith('.js'))
      .map(f => f.slice(0, -3))
      .filter(v => semver.valid(v) != null)

    const best = semver.maxSatisfying(versions, range)
    if (!best) {
      throw new Error(`No version of "${name}" satisfies "${range}" (available: ${versions.join(', ')})`)
    }

    return { name, version: best, urlPath: `/platform/libs/${name}@${best}.js` }
  })
}

/**
 * Read a versioned lib file from the registry for serving.
 * Returns null if the name/version don't exist (→ 404).
 */
export async function readRegistryLib(name: string, version: string): Promise<Buffer | null> {
  if (!isValidLibName(name) || !semver.valid(version)) return null
  const filePath = path.join(platformLibsDir, name, `${version}.js`)
  try {
    return await fsAsync.readFile(filePath)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

function isValidLibName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name)
}
