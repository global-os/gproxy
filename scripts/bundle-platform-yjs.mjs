import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'src/gapp/registry/deps/yjs.js')

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
