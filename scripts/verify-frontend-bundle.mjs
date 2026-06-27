import fs from 'node:fs'
import path from 'node:path'

const distRoot = path.join(process.cwd(), 'src/frontend/dist')
const distAssets = path.join(distRoot, 'assets')
const indexHtmlPath = path.join(distRoot, 'index.html')
const badPatterns = [
  /Object\.defineProperty\(exports,\s*["']__esModule["']/,
  /^\s*exports\./m,
]

if (!fs.existsSync(distAssets)) {
  console.error('Missing frontend dist assets:', distAssets)
  process.exit(1)
}

const failures = []
const referencedAssets = new Set()

function recordAssetRef(relativePath) {
  const normalized = relativePath.replace(/^\/+/, '')
  if (normalized.startsWith('assets/')) referencedAssets.add(normalized)
}

function assertAssetExists(relativePath) {
  const filePath = path.join(distRoot, relativePath)
  if (!fs.existsSync(filePath)) {
    failures.push(`missing referenced asset: ${relativePath}`)
  }
}

if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8')
  for (const match of indexHtml.matchAll(/\/assets\/([^"'`\s>]+)/g)) {
    recordAssetRef(`assets/${match[1]}`)
  }
}

for (const file of fs.readdirSync(distAssets)) {
  if (!file.endsWith('.js')) continue

  const filePath = path.join(distAssets, file)
  const contents = fs.readFileSync(filePath, 'utf8')

  for (const pattern of badPatterns) {
    if (pattern.test(contents)) {
      failures.push(`${file} matched ${pattern}`)
    }
  }

  for (const match of contents.matchAll(/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)) {
    recordAssetRef(match[0])
  }
}

for (const relativePath of referencedAssets) {
  assertAssetExists(relativePath)
}

if (failures.length > 0) {
  console.error('Frontend bundle verification failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log(`Frontend bundle verification passed (${referencedAssets.size} assets referenced)`)