import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function resolveProjectRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    process.cwd(),
    path.resolve(here, '../..'),
    path.resolve(here, '../../..'),
    '/var/task',
  ]

  for (const root of candidates) {
    const stagedSquint = path.join(root, 'src/gapp/registry/squint/core.js')
    if (fs.existsSync(stagedSquint)) return root
    const platformYjs = path.join(root, 'src/gapp/registry/deps/yjs.js')
    if (fs.existsSync(platformYjs)) return root
    const squintCli = path.join(root, 'node_modules/squint-cljs/node_cli.js')
    if (fs.existsSync(squintCli)) return root
  }

  return process.cwd()
}

export const projectRoot = resolveProjectRoot()

export const platformRegistryDir = path.join(projectRoot, 'src/gapp/registry')

export const platformLibsDir = path.join(platformRegistryDir, 'libs')

export function platformRegistryFile(name: string): string {
  return path.join(platformRegistryDir, 'deps', name)
}

export function platformRegistryCandidates(name: string): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const rel = path.join('src', 'gapp', 'registry', 'deps', name)
  const roots = [
    projectRoot,
    process.cwd(),
    '/var/task',
    path.resolve(here, '../..'),
    path.resolve(here, '../../..'),
  ]

  return [...new Set(roots.map((root) => path.join(root, rel)))]
}