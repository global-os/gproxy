import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function findRegistryDir(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  while (true) {
    const candidate = path.join(dir, 'src/gapp/registry')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error(
    `[registry-paths] could not locate src/gapp/registry (searched upward from ${path.dirname(fileURLToPath(import.meta.url))})`,
  )
}

export const platformRegistryDir = findRegistryDir()

export const platformLibsDir = path.join(platformRegistryDir, 'libs')

export function platformRegistryFile(name: string): string {
  return path.join(platformRegistryDir, 'deps', name)
}