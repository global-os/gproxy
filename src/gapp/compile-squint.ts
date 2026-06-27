import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { formatExecError } from './exec-error.js'
import { projectRoot } from './registry-paths.js'
import type { SquintCompileSpec } from './types.js'

const squintPkg = path.join(projectRoot, 'node_modules/squint-cljs')

const execFileAsync = promisify(execFile)

function globalBanner(externals: Record<string, string>): string {
  const lines = Object.entries(externals).map(
    ([, globalName]) => `const ${globalName}=globalThis.${globalName};`,
  )
  return lines.join('')
}

async function runCommand(
  command: string,
  args: string[],
  opts: { cwd: string; label: string },
): Promise<void> {
  try {
    await execFileAsync(command, args, {
      cwd: opts.cwd,
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    })
  } catch (err) {
    const formatted = formatExecError(err)
    const error = new Error(`${opts.label}: ${formatted.message}`)
    if (formatted.detail) {
      ;(error as Error & { detail?: string }).detail = formatted.detail
    }
    throw error
  }
}

export async function compileSquintSource(
  sourcePath: string,
  spec: SquintCompileSpec,
  opts?: { cwd?: string },
): Promise<Buffer> {
  const cwd = opts?.cwd ?? process.cwd()
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'gapp-squint-'))
  const ext = path.extname(spec.output) || '.js'

  try {
    const squintCwd = path.dirname(sourcePath)
    await runCommand(
      'npx',
      ['squint', 'compile', sourcePath, '--extension', ext],
      { cwd, label: 'squint compile' },
    )

    const compiledName = path.basename(sourcePath, path.extname(sourcePath)) + ext
    const compiledPath = path.join(squintCwd, compiledName)

    const externals = spec.externals ?? {}
    const globalNames = [...new Set(Object.values(externals))]
    const banner =
      globalNames.length > 0 ? globalBanner(externals) : undefined

    const bundleOut = path.join(tmp, 'bundle.js')
    const esbuildArgs = [
      'esbuild',
      compiledPath,
      '--bundle',
      '--format=esm',
      '--platform=browser',
      `--outfile=${bundleOut}`,
    ]
    if (banner) {
      esbuildArgs.push(`--banner:js=${banner}`)
    }

    esbuildArgs.push(
      `--alias:squint-cljs/core.js=${path.join(squintPkg, 'core.js')}`,
      `--alias:squint-cljs/src/squint/multi.js=${path.join(squintPkg, 'src/squint/multi.js')}`,
    )

    await runCommand('npx', esbuildArgs, { cwd: projectRoot, label: 'esbuild bundle' })
    return fs.readFile(bundleOut)
  } finally {
    await fs.rm(tmp, { recursive: true, force: true })
  }
}