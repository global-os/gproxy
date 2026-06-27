import fs from 'node:fs'
import path from 'node:path'

const publicRoot = path.join(process.cwd(), 'public')
export const frontendDistRoot = path.join(process.cwd(), 'src/frontend/dist')
const distRoot = frontendDistRoot

function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

/** Prefer synced `public/` artifacts; fall back to `src/frontend/dist`. */
export function resolveFrontendFile(relativePath: string): string | null {
  const normalized = relativePath.replace(/^\/+/, '')
  const candidates = [
    path.join(publicRoot, normalized),
    path.join(distRoot, normalized),
  ]

  for (const candidate of candidates) {
    const root = candidate.startsWith(publicRoot) ? publicRoot : distRoot
    if (isInsideRoot(root, candidate) && fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

export function readFrontendFile(relativePath: string): string | null {
  const filePath = resolveFrontendFile(relativePath)
  if (!filePath) return null
  return fs.readFileSync(filePath, 'utf-8')
}