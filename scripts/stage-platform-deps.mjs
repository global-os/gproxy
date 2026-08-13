import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const registrySrc = path.join(root, 'src/gapp/registry')
const distRegistry = path.join(root, 'dist/src/gapp/registry')

// Copy deps (yjs, rxjs)
const depsSrc = path.join(registrySrc, 'deps')
const depsDest = path.join(distRegistry, 'deps')
await fs.mkdir(depsDest, { recursive: true })
for (const name of ['yjs.js', 'rxjs.js']) {
  await fs.copyFile(path.join(depsSrc, name), path.join(depsDest, name))
}
console.log(`Staged platform deps at ${depsDest}`)

// Copy libs/ so findRegistryDir() resolves the correct registry when
// running from compiled dist/ output (otherwise it finds dist/src/gapp/registry
// before the source src/gapp/registry and libs/ is missing)
const libsSrc = path.join(registrySrc, 'libs')
const libsDest = path.join(distRegistry, 'libs')
await fs.cp(libsSrc, libsDest, { recursive: true })
console.log(`Staged platform libs at ${libsDest}`)
