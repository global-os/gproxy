import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FIXTURE_EMAIL, resolveFixturePath } from './fixture-path.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = resolveFixturePath(FIXTURE_EMAIL, '~/Desktop/textedit.gapp/yjs.js')
if (!out) {
  throw new Error(
    'textedit.gapp fixture not found under fixtures/by-user/*/ or user dir'
  )
}

execFileSync(
  'npx',
  [
    'esbuild',
    'node_modules/yjs/dist/yjs.mjs',
    '--bundle',
    '--format=iife',
    '--global-name=Y',
    '--platform=browser',
    `--outfile=${out}`,
  ],
  { cwd: root, stdio: 'inherit' }
)
