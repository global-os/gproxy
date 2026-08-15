// find-aliases.mjs — list every decoder alias (bindings assigned `= g`/`= fa`/
// `= <alias>`) with its declaration offset.
//
// NOTE: do NOT collapse these to one name in manual-rename.json. The aliases
// form closure chains (`fa` -> `fI` -> `fz`); renaming two chain levels to the
// same name creates shadowing (`fI = fa` -> `decoder = decoder`, so the inner
// `fa` reference resolves to `fI`), which the scope-aware verify.mjs correctly
// rejects. This tool is diagnostic only.
import { readFileSync } from 'node:fs'
import { parse } from 'acorn'
import { resolveScopes } from './scope.mjs'

const src = readFileSync(process.argv[2], 'utf8')
const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'script', ranges: true })
const bindingByStart = resolveScopes(src)

const found = new Map() // decl offset -> { name, ugly }

function isDecoder(name) {
  return name === 'g' || name === 'fa'
}

function walk(node, scopes) {
  if (!node || typeof node.type !== 'string') return
  switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression': {
      const child = new Map([...scopes[scopes.length - 1]])
      scopes.push(child)
      for (const p of node.params || []) {
        if (p.type === 'Identifier') child.set(p.name, 'unknown')
      }
      walk(node.body, scopes)
      scopes.pop()
      return
    }
    case 'VariableDeclarator': {
      if (node.id.type === 'Identifier') record(node.id, node.init, scopes)
      if (node.init) walk(node.init, scopes)
      return
    }
    case 'AssignmentExpression': {
      if (node.left.type === 'Identifier') record(node.left, node.right, scopes)
      walk(node.left, scopes)
      walk(node.right, scopes)
      return
    }
  }
  for (const k of Object.keys(node)) {
    if (k === 'start' || k === 'end' || k === 'loc' || k === 'range') continue
    const v = node[k]
    if (Array.isArray(v)) for (const c of v) walk(c, scopes)
    else if (v && typeof v.type === 'string') walk(v, scopes)
  }
}

function record(idNode, right, scopes) {
  const scope = scopes[scopes.length - 1]
  const name = idNode.name
  let isAlias = false
  if (right.type === 'Identifier' && isDecoder(right.name)) isAlias = true
  else if (right.type === 'Identifier') {
    const v = lookup(right.name, scopes)
    if (v === 'decoder') isAlias = true
  }
  if (!isAlias) return
  // resolve the binding via the LHS identifier offset -> declaration offset
  const binding = bindingByStart.get(idNode.start)
  if (!binding || !binding.identifiers || !binding.identifiers[0]) return
  const declAt = binding.identifiers[0].start
  if (!found.has(declAt)) found.set(declAt, { name, declAt, defTypes: binding.defTypes.join(',') })
  // mark this name as a decoder alias in this scope
  scope.set(name, 'decoder')
}

function lookup(name, scopes) {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const v = scopes[i].get(name)
    if (v !== undefined) return v
  }
  return null
}

const global = new Map([['g', 'decoder'], ['fa', 'decoder']])
walk(ast, [global])

const out = [...found.values()].sort((a, b) => a.declAt - b.declAt)
for (const f of out) {
  console.log(`{ "name": ${JSON.stringify(f.name)}, "at": ${f.declAt}, "nice": "decoder" },`)
}
console.error(`\n${out.length} decoder aliases found`)
