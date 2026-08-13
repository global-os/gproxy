/**
 * Reads optional `compile.edn` or `compile.cljs` (data-only EDN) overrides.
 * Not squint-compiled — just a map like `{:deps [yjs rxjs]}`.
 */
export type CompileConfig = {
  entry?: string
  deps?: string[]
  squint?: { source?: string; output?: string }
}

export function parseCompileConfig(text: string): CompileConfig {
  const config: CompileConfig = {}

  const entryMatch = /:entry\s+"([^"]+)"/.exec(text)
  if (entryMatch) config.entry = entryMatch[1]

  const depsMatch = /:deps\s+\[([^\]]*)\]/.exec(text)
  if (depsMatch) {
    config.deps = depsMatch[1]!
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const sourceMatch = /:source\s+(\S+)/.exec(text)
  const outputMatch = /:output\s+(\S+)/.exec(text)
  if (sourceMatch || outputMatch) {
    config.squint = {}
    if (sourceMatch) config.squint.source = sourceMatch[1]!.replace(/['"]/g, '')
    if (outputMatch) config.squint.output = outputMatch[1]!.replace(/['"]/g, '')
  }

  return config
}
