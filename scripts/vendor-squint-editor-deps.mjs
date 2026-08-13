import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FIXTURE_EMAIL, resolveFixturePath } from './fixture-path.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const gappDir = resolveFixturePath(
  FIXTURE_EMAIL,
  '~/Desktop/squint-editor.gapp'
)
if (!gappDir) {
  throw new Error(
    'squint-editor.gapp fixture not found under fixtures/by-user/*/ or user dir'
  )
}

const bundles = [
  {
    entry: 'node_modules/yjs/dist/yjs.mjs',
    outfile: path.join(gappDir, 'yjs.js'),
    globalName: 'Y',
  },
  {
    entry: 'node_modules/rxjs/dist/bundles/rxjs.umd.js',
    outfile: path.join(gappDir, 'rxjs.js'),
    globalName: 'rxjs',
  },
]

for (const { entry, outfile, globalName } of bundles) {
  execFileSync(
    'npx',
    [
      'esbuild',
      entry,
      '--bundle',
      '--format=iife',
      `--global-name=${globalName}`,
      '--platform=browser',
      `--outfile=${outfile}`,
    ],
    { cwd: root, stdio: 'inherit' }
  )
  console.log(`Wrote ${path.relative(root, outfile)}`)
}
