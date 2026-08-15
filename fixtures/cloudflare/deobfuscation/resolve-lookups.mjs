// resolve-lookups.mjs — constant-propagate Cloudflare's string-array lookups.
//
// Returns [{ start, end, str }] for every CallExpression that resolves to the
// string decoder — direct `g(N)`/`fa(N)`, or the indirect `fv(gw.l)` form where
// `fv` is a decoder alias and `gw` is an index map. `start`/`end` are byte
// offsets into `src` (the obfuscated source), so callers can substitute the
// string (resolve-strings.mjs) or annotate it as a comment (deobfuscate.mjs).
import { parse } from 'acorn'

function isDecoder(name) {
  return name === 'g' || name === 'fa'
}

export function resolveLookups(src, table) {
  const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'script', ranges: true, allowReturnOutsideFunction: true })
  const lookups = []

  function lookup(name, scopes) {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const v = scopes[i].get(name)
      if (v !== undefined) return v
    }
    return null
  }

  function recordAssign(name, right, scopes) {
    const scope = scopes[scopes.length - 1]
    if (right.type === 'Identifier' && isDecoder(right.name)) {
      scope.set(name, { t: 'decoder' })
      return
    }
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
      if (mapVal && mapVal.t === 'map' && mapVal.m[key] !== undefined) num = mapVal.m[key]
    } else if (arg.type === 'MemberExpression' && arg.computed && arg.property.type === 'Literal') {
      const mapVal = lookup(arg.object.name, scopes)
      const key = arg.property.value
      if (mapVal && mapVal.t === 'map' && mapVal.m[key] !== undefined) num = mapVal.m[key]
    }
    if (num === null) return
    const str = table[num]
    if (str === undefined) return
    lookups.push({ start: node.start, end: node.end, str })
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

  const global = new Map([['g', { t: 'decoder' }], ['fa', { t: 'decoder' }]])
  walk(ast, [global])
  return lookups
}
