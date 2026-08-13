import fs from 'node:fs/promises'
import type { GappDependencySpec, GappManifest } from './types.js'
import { platformRegistryFile } from './registry-paths.js'

export type ResolvedDependency = {
  id: string
  path: string
  content: Buffer
  global?: string
  order: number
}

const PLATFORM_ARTIFACTS: Record<string, string> = {
  yjs: 'yjs.js',
  rxjs: 'rxjs.js',
}

function depOrder(id: string, spec: GappDependencySpec): number {
  return spec.order ?? 0
}

async function readPlatformArtifact(name: string): Promise<Buffer> {
  return fs.readFile(platformRegistryFile(name))
}

export async function resolvePlatformDependencies(
  manifest: GappManifest
): Promise<ResolvedDependency[]> {
  const deps = manifest.dependencies ?? {}
  const resolved: ResolvedDependency[] = []

  for (const [id, spec] of Object.entries(deps)) {
    if (spec.source !== 'platform') continue

    const artifact = PLATFORM_ARTIFACTS[id]
    if (!artifact) {
      throw new Error(`No platform registry artifact for dependency "${id}"`)
    }

    const content = await readPlatformArtifact(artifact)
    resolved.push({
      id,
      path: artifact,
      content,
      global: spec.global,
      order: depOrder(id, spec),
    })
  }

  return resolved.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}
