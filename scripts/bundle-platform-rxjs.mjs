import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'src/gapp/registry/deps/rxjs.js')

execFileSync(
  'npx',
  [
    'esbuild',
    'node_modules/rxjs/dist/bundles/rxjs.umd.js',
    '--bundle',
    '--format=iife',
    '--global-name=rxjs',
    '--platform=browser',
    `--outfile=${out}`,
  ],
  { cwd: root, stdio: 'inherit' }
)
