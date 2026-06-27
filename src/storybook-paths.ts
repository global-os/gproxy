import fs from 'node:fs'
import path from 'node:path'

const publicRoot = path.join(process.cwd(), 'public/storybook')
const distRoot = path.join(process.cwd(), 'src/frontend/storybook-static')

function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export function resolveStorybookFile(relativePath: string): string | null {
  const normalized = relativePath.replace(/^\/+/, '') || 'index.html'
  const candidates = [
    path.join(publicRoot, normalized),
    path.join(distRoot, normalized),
  ]

  for (const candidate of candidates) {
    const root = candidate.startsWith(publicRoot) ? publicRoot : distRoot
    if (isInsideRoot(root, candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }

  return null
}