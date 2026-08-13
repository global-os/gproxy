import type { GappDependencySpec } from './types.js'

export const PLATFORM_DEP_DEFAULTS: Record<string, GappDependencySpec> = {
  yjs: {
    version: '13.6.20',
    source: 'platform',
    format: 'iife',
    global: 'Y',
    order: 1,
  },
  rxjs: {
    version: '7.8.1',
    source: 'platform',
    format: 'iife',
    global: 'rxjs',
    order: 2,
  },
}

export function platformDepsFor(
  ids: string[]
): Record<string, GappDependencySpec> {
  const deps: Record<string, GappDependencySpec> = {}
  for (const id of ids) {
    const spec = PLATFORM_DEP_DEFAULTS[id]
    if (!spec) throw new Error(`Unknown platform dependency "${id}"`)
    deps[id] = spec
  }
  return deps
}

export function squintExternalsFor(ids: string[]): Record<string, string> {
  const externals: Record<string, string> = {}
  for (const id of ids) {
    const spec = PLATFORM_DEP_DEFAULTS[id]
    if (spec?.global) externals[id] = spec.global
  }
  return externals
}
