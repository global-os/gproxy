/**
 * Maintainer script: compile squint-editor.gapp source into an example tar
 * directory (what image build puts in tar_bytes). Not run by app authors.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileGappTree } from '../src/gapp/compile-gapp.ts'
import { resolveGappConfig } from '../src/gapp/resolve-config.ts'
import { FIXTURE_EMAIL, resolveFixturePath } from './fixture-path.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = resolveFixturePath(
  FIXTURE_EMAIL,
  '~/Desktop/squint-editor.gapp'
)
if (!sourceDir) {
  throw new Error(
    'squint-editor.gapp fixture not found under fixtures/by-user/*/ or user dir'
  )
}
const outDir = path.join(root, 'fixtures/tar-examples/squint-editor.gapp')
const dirName = 'squint-editor.gapp'

async function collectSourceFiles(dir, prefix = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const ent of entries) {
    const rel = prefix ? `${prefix}/${ent.name}` : ent.name
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      files.push(...(await collectSourceFiles(abs, rel)))
    } else {
      const content = await fs.readFile(abs)
      files.push({
        name: ent.name,
        path: `${dirName}/${rel}`,
        content,
      })
    }
  }
  return files
}

const sourceFiles = await collectSourceFiles(sourceDir)
const compiled = await compileGappTree(dirName, sourceFiles)

await fs.rm(outDir, { recursive: true, force: true })
await fs.mkdir(outDir, { recursive: true })

for (const file of compiled) {
  const rel = file.path.slice(`${dirName}/`.length)
  const dest = path.join(outDir, rel)
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.writeFile(dest, file.content)
}

const config = resolveGappConfig(dirName, sourceFiles)
const listing = compiled.map((f) => f.path.slice(`${dirName}/`.length)).sort()

console.log(`Wrote ${listing.length} files to ${outDir}`)
console.log('resolved config:', config?.compile?.squint)
console.log('deps:', Object.keys(config?.dependencies ?? {}))
console.log('files:', listing.join(', '))
