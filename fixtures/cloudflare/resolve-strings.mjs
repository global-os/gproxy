// resolve-strings.mjs — constant-propagate Cloudflare's string-array lookups so
// the obfuscated challenge main.js becomes readable.
//
// The obfuscator hides every string behind an indirect lookup:
//   X = g / fa / fv / fI …        (a decoder alias)
//   Y = { l: 245, c: 284, … }     (an index map: key -> decoder arg)
//   X(Y.l)                         -> g(245) -> "the string"
//
// This parses with acorn, tracks those assignments scope-lexically, and
// rewrites each resolvable lookup call to a JSON string literal. Direct
// X(271) numeric lookups are handled too. Output is pretty-printed.
//
//   node resolve-strings.mjs <main.js> <strings.json> <out.js>
import { readFileSync, writeFileSync } from 'node:fs'
import { parse } from 'acorn'

const src = readFileSync(process.argv[2], 'utf8')
const table = JSON.parse(readFileSync(process.argv[3] || 'strings.json', 'utf8'))
const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'script', ranges: true, allowReturnOutsideFunction: true })

const subs = [] // { start, end, text }

function isDecoder(name) {
  // the decoder function itself + its known top-level aliases
  return name === 'g' || name === 'fa'
}

// Walk with a lexical scope chain. Each scope is a Map(name -> value).
// value shapes: { t:'decoder' } | { t:'map', m:Object }
function walk(node, scopes) {
  if (!node || typeof node.type !== 'string') return

  switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression': {
      const child = new Map([...scopes[scopes.length - 1]])
      scopes.push(child)
      // params: unknown at first (they'll be reassigned to maps/aliases/numbers)
      for (const p of node.params || []) {
        if (p.type === 'Identifier') child.set(p.name, { t: 'unknown' })
      }
      walk(node.body, scopes)
      scopes.pop()
      return
    }
    case 'VariableDeclarator': {
      const right = node.init
      const name = node.id.type === 'Identifier' ? node.id.name : null
      if (name && right) recordAssign(name, right, scopes)
      if (right) walk(right, scopes)
      return
    }
    case 'AssignmentExpression': {
      if (node.left.type === 'Identifier') recordAssign(node.left.name, node.right, scopes)
      walk(node.left, scopes)
      walk(node.right, scopes)
      return
    }
    case 'CallExpression': {
      tryResolveCall(node, scopes)
      walk(node.callee, scopes)
      for (const a of node.arguments) walk(a, scopes)
      return
    }
    case 'MemberExpression': {
      walk(node.object, scopes)
      walk(node.property, scopes)
      return
    }
  }

  for (const key of Object.keys(node)) {
    if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue
    const v = node[key]
    if (Array.isArray(v)) for (const c of v) walk(c, scopes)
    else if (v && typeof v.type === 'string') walk(v, scopes)
  }
}

function recordAssign(name, right, scopes) {
  const scope = scopes[scopes.length - 1]
  if (right.type === 'Identifier' && isDecoder(right.name)) {
    scope.set(name, { t: 'decoder' })
    return
  }
  // also alias-of-alias: X = fv (where fv is already a decoder in scope)
  if (right.type === 'Identifier') {
    const v = lookup(right.name, scopes)
    if (v && v.t === 'decoder') scope.set(name, { t: 'decoder' })
    return
  }
  if (right.type === 'ObjectExpression') {
    const m = {}
    let ok = true
    for (const prop of right.properties) {
      if (prop.type !== 'Property' || prop.computed) { ok = false; break }
      const k = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value
      if (prop.value.type !== 'Literal' || typeof prop.value.value !== 'number') { ok = false; break }
      m[k] = prop.value.value
    }
    if (ok && Object.keys(m).length > 0) scope.set(name, { t: 'map', m })
  }
}

function lookup(name, scopes) {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const v = scopes[i].get(name)
    if (v !== undefined) return v
  }
  return null
}

function tryResolveCall(node, scopes) {
  if (node.callee.type !== 'Identifier') return
  const callee = lookup(node.callee.name, scopes)
  if (!callee || callee.t !== 'decoder') return
  if (node.arguments.length === 0) return
  const arg = node.arguments[0]

  let num = null
  if (arg.type === 'Literal' && typeof arg.value === 'number') {
    num = arg.value
  } else if (arg.type === 'MemberExpression' && !arg.computed) {
    const mapVal = lookup(arg.object.name, scopes)
    const key = arg.property.type === 'Identifier' ? arg.property.name : arg.property.value
    if (mapVal && mapVal.t === 'map' && mapVal.m[key] !== undefined) {
      num = mapVal.m[key]
    }
  } else if (arg.type === 'MemberExpression' && arg.computed && arg.property.type === 'Literal') {
    const mapVal = lookup(arg.object.name, scopes)
    const key = arg.property.value
    if (mapVal && mapVal.t === 'map' && mapVal.m[key] !== undefined) {
      num = mapVal.m[key]
    }
  }

  if (num === null) return
  const str = table[num]
  if (str === undefined) return
  subs.push({ start: node.start, end: node.end, text: JSON.stringify(str) })
}

// ---- run ----
const globalScope = new Map()
globalScope.set('g', { t: 'decoder' })
globalScope.set('fa', { t: 'decoder' })
walk(ast, [globalScope])

subs.sort((a, b) => b.start - a.start)
let out = src
for (const s of subs) {
  out = out.slice(0, s.start) + s.text + out.slice(s.end)
}

// pretty-print
function pretty(s) {
  let depth = 0, res = '', inStr = false, strCh = '', inTpl = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inTpl) { res += c; if (c === '`') inTpl = false; else if (c === '\\') res += s[++i]; continue }
    if (inStr) { res += c; if (c === '\\') res += s[++i]; else if (c === strCh) inStr = false; continue }
    if (c === '`') { inTpl = true; res += c; continue }
    if (c === '"' || c === "'") { inStr = true; strCh = c; res += c; continue }
    if (c === '{') { res += ' {\n' + '  '.repeat(depth + 1); depth++; continue }
    if (c === '}') { depth = Math.max(0, depth - 1); res += '\n' + '  '.repeat(depth) + '}'; continue }
    if (c === ';') { res += ';\n' + '  '.repeat(depth); continue }
    res += c
  }
  return res
}

const outPath = process.argv[4] || 'main-resolved.js'
writeFileSync(outPath, pretty(out))
console.log(`resolved ${subs.length} lookups -> ${outPath}`)
