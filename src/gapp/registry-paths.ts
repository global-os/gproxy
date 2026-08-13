import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function findRegistryDir(): string {
  // process.cwd() is the project root in both local dev (tsx) and Vercel (/var/task).
  // Prefer it over walking up from import.meta.url, which can stop at a partial
  // dist/src/gapp/registry/ created by the staging script.
  const cwdCandidate = path.join(process.cwd(), 'src/gapp/registry')
  if (fs.existsSync(cwdCandidate)) return cwdCandidate

  const start = path.dirname(fileURLToPath(import.meta.url))
  let dir = start
  while (true) {
    const candidate = path.join(dir, 'src/gapp/registry')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error(
    `[registry-paths] could not locate src/gapp/registry (cwd=${process.cwd()}, searched upward from ${start})`
  )
}

export const platformRegistryDir = findRegistryDir()

export const platformLibsDir = path.join(platformRegistryDir, 'libs')

export function platformRegistryFile(name: string): string {
  return path.join(platformRegistryDir, 'deps', name)
}
