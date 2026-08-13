import type { FileEntry } from '../db/file.js'
import { inferDepsFromSquintSource } from './infer-deps.js'
import { parseCompileConfig } from './parse-compile-config.js'
import { platformDepsFor, squintExternalsFor } from './platform-defaults.js'
import type { GappManifest } from './types.js'

const COMPILE_CONFIG_NAMES = ['compile.edn', 'compile.cljs']

function findFile(
  files: FileEntry[],
  dirName: string,
  name: string
): FileEntry | undefined {
  return files.find((f) => f.path === `${dirName}/${name}`)
}

function parseGappJson(raw: string): GappManifest {
  return JSON.parse(raw) as GappManifest
}

export function resolveGappConfig(
  dirName: string,
  files: FileEntry[]
): GappManifest | null {
  const gappJson = findFile(files, dirName, 'gapp.json')
  if (gappJson) {
    return parseGappJson(gappJson.content.toString('utf8'))
  }

  const compileFile = COMPILE_CONFIG_NAMES.map((name) =>
    findFile(files, dirName, name)
  ).find(Boolean)

  const overrides = compileFile
    ? parseCompileConfig(compileFile.content.toString('utf8'))
    : {}

  const squintSource =
    (overrides as { squint?: { source?: string } }).squint?.source ?? 'app.cljs'
  const sourceFile = findFile(files, dirName, squintSource)
  if (!sourceFile) return null

  const source = sourceFile.content.toString('utf8')
  const depIds =
    (overrides as { deps?: string[] }).deps ?? inferDepsFromSquintSource(source)

  const squintOutput =
    (overrides as { squint?: { output?: string } }).squint?.output ?? 'app.js'

  return {
    entry: (overrides as { entry?: string }).entry ?? 'index.html',
    type: 'module',
    compile: {
      squint: {
        source: squintSource,
        output: squintOutput,
        externals: squintExternalsFor(depIds),
      },
    },
    dependencies: platformDepsFor(depIds),
  }
}
