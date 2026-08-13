import { createRequire } from 'node:module'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'
import type { Plugin } from 'esbuild'
import { compileString } from 'squint-cljs/node-api.js'
import { formatExecError } from './exec-error.js'
import { platformRegistryDir } from './registry-paths.js'

const require = createRequire(import.meta.url)

const RUNTIME_MARKER = path.join('src', 'squint', 'multi.js')

function squintRuntimeCandidates(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return [
    path.join(here, 'registry/squint'),
    path.join(here, '../registry/squint'),
    path.join(platformRegistryDir, 'squint'),
    path.join(platformRegistryDir, 'squint-cljs'),
    path.join(process.cwd(), 'src/gapp/registry/squint'),
    path.join(process.cwd(), 'dist/src/gapp/registry/squint'),
    '/var/task/src/gapp/registry/squint',
    '/var/task/dist/src/gapp/registry/squint',
  ]
}

function resolveSquintRuntimeDir(): string {
  for (const dir of squintRuntimeCandidates()) {
    if (fs.existsSync(path.join(dir, RUNTIME_MARKER))) return dir
  }

  const fromNodeModules = path.dirname(
    require.resolve('squint-cljs/node-api.js')
  )
  if (fs.existsSync(path.join(fromNodeModules, RUNTIME_MARKER))) {
    return fromNodeModules
  }

  throw new Error(
    `squint runtime not found (need ${RUNTIME_MARKER}); checked: ${squintRuntimeCandidates().join(', ')}`
  )
}

async function stageSquintRuntime(tmp: string): Promise<string> {
  const src = resolveSquintRuntimeDir()
  const dest = path.join(tmp, 'squint-cljs')
  await fsp.mkdir(dest, { recursive: true })
  await fsp.cp(src, dest, { recursive: true })

  if (!fs.existsSync(path.join(dest, RUNTIME_MARKER))) {
    throw new Error(`squint runtime incomplete after copy from ${src}`)
  }

  return dest
}

function squintResolvePlugin(runtimeRoot: string): Plugin {
  return {
    name: 'squint-runtime',
    setup(build) {
      build.onResolve({ filter: /^squint-cljs\// }, (args) => ({
        path: path.join(runtimeRoot, args.path.slice('squint-cljs/'.length)),
      }))
    },
  }
}

function globalBanner(externals: Record<string, string>): string {
  const lines = Object.entries(externals).map(
    ([, globalName]) => `const ${globalName}=globalThis.${globalName};`
  )
  return lines.join('')
}

export async function compileSquintSource(
  sourcePath: string,
  spec: { output: string; externals?: Record<string, string> }
): Promise<Buffer> {
  const ext = path.extname(spec.output) || '.js'
  const source = await fsp.readFile(sourcePath, 'utf8')
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'gapp-squint-'))

  try {
    let compiled: { javascript?: string }
    try {
      compiled = await compileString(source, {
        extension: ext,
        filename: path.basename(sourcePath),
      })
    } catch (err) {
      const formatted = formatExecError(err)
      const error = new Error(`squint compile: ${formatted.message}`)
      if (formatted.detail) {
        ;(error as Error & { detail?: string }).detail = formatted.detail
      }
      throw error
    }

    const javascript = compiled.javascript
    if (!javascript) {
      throw new Error('squint compile: no javascript output')
    }

    const externals = spec.externals ?? {}
    const banner = globalBanner(externals)

    const entryPath = path.join(tmp, 'entry.js')
    await fsp.writeFile(entryPath, javascript)
    const runtimeRoot = await stageSquintRuntime(tmp)

    try {
      const result = await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        write: false,
        banner: banner ? { js: banner } : undefined,
        plugins: [squintResolvePlugin(runtimeRoot)],
      })

      const output = result.outputFiles[0]?.contents
      if (!output) {
        throw new Error('esbuild bundle: no output')
      }
      return Buffer.from(output)
    } catch (err) {
      const formatted = formatExecError(err)
      const error = new Error(`esbuild bundle: ${formatted.message}`)
      if (formatted.detail) {
        ;(error as Error & { detail?: string }).detail = formatted.detail
      }
      throw error
    }
  } finally {
    await fsp.rm(tmp, { recursive: true, force: true })
  }
}
