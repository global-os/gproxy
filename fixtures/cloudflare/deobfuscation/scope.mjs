// scope.mjs — scope resolution via a real JS parser (acorn) + eslint-scope.
// Returns a Map from identifier byte-offset to a binding descriptor, so the
// rename in deobfuscate.mjs can be scope-aware (rename a specific binding, not
// every token that happens to share a name).
//
// The lossless lexer still owns printing; this only supplies "which binding
// does this identifier refer to".

import { parse } from 'acorn'
import { analyze } from 'eslint-scope'

export function resolveScopes(src) {
  const ast = parse(src, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ranges: true,
  })
  const scopeManager = analyze(ast, {
    ecmaVersion: 2022,
    sourceType: 'module',
    ignoreEval: true,
  })

  const bindingByStart = new Map()
  for (const scope of scopeManager.scopes) {
    for (const variable of scope.variables) {
      const binding = {
        name: variable.name,
        defTypes: variable.defs.map((d) => d.type),
        scopeType: scope.type,
        identifiers: variable.identifiers,
      }
      for (const id of variable.identifiers) {
        bindingByStart.set(id.start, binding)
      }
      for (const ref of variable.references) {
        bindingByStart.set(ref.identifier.start, binding)
      }
    }
  }
  return bindingByStart
}
