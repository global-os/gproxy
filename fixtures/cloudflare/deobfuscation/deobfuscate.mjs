// deobfuscate.mjs — Cloudflare edition: ugly -> "nice" (renamed + annotated).
//
//   node deobfuscate.mjs ../main-chrome.js
//
// Same idea as the Castle tool: a scope-aware, token-preserving rename that
// emits a `// nice -> ugly` comment at each renamed binding's declaration, so
// verify.mjs can reverse it and assert a token-exact round-trip.
//
// Differences from the Castle edition (whose obfuscation left strings in
// plaintext `rO="location"` form):
//   * no AUTO-rename pass — Cloudflare stores every string in a split array, so
//     there are no meaningful `IDENT = 'string'` constants to mine (and the one
//     template-literal coincidence would fire a spurious rename).
//   * manual-rename.json / comments.json are keyed by { name, at } where `at`
//     is the byte offset of the binding's declaration identifier — needed
//     because the obfuscator reuses short names (C, O, …) across scopes.

import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, basename, join } from 'node:path'
import { tokenize } from './lexer.mjs'
import { prettyPrint } from './pretty.mjs'
import { resolveScopes } from './scope.mjs'

const TOOL_DIR = dirname(fileURLToPath(import.meta.url))

function collectBindings(bindingByStart) {
  const seen = new Set()
  const out = []
  for (const b of bindingByStart.values()) {
    if (!seen.has(b)) {
      seen.add(b)
      out.push(b)
    }
  }
  return out
}

// A binding's declaration offset: the start of its first identifier.
function declAt(binding) {
  return binding.identifiers && binding.identifiers[0] ? binding.identifiers[0].start : -1
}

// Match a { name, at } spec against the binding set. `at` disambiguates when a
// name is declared in multiple scopes.
function findBinding(bindings, spec) {
  const byName = bindings.filter((b) => b.name === spec.name)
  if (spec.at !== undefined) {
    return byName.find((b) => declAt(b) === spec.at) || null
  }
  return (
    byName.find((b) =>
      b.defTypes.some((d) => d === 'Variable' || d === 'FunctionName' || d === 'ClassName')
    ) || byName[0] || null
  )
}

function main() {
  const input = process.argv[2]
  if (!input) {
    console.error('usage: node deobfuscate.mjs <ugly.js>')
    process.exit(1)
  }

  const src = readFileSync(input, 'utf8')
  const tokens = tokenize(src)
  const bindingByStart = resolveScopes(src)
  const bindings = collectBindings(bindingByStart)

  const renameByBinding = new Map()

  // Manual renames: [{ name, at?, nice }]. Many-to-one is allowed (several
  // bindings -> the same nice name, e.g. every decoder alias -> `decoder`);
  // the scope-aware verify resolves it by binding, not by name.
  const manual = JSON.parse(
    readFileSync(new URL('./manual-rename.json', import.meta.url), 'utf8')
  )
  let manualCount = 0
  for (const spec of manual) {
    const target = findBinding(bindings, spec)
    if (!target) {
      console.warn(`rename: no binding for ${spec.name}${spec.at !== undefined ? '@' + spec.at : ''}`)
      continue
    }
    if (renameByBinding.has(target)) {
      console.warn(`rename: skipped ${spec.name} (binding already renamed)`)
      continue
    }
    renameByBinding.set(target, spec.nice)
    manualCount++
  }

  // Structure comments: [{ name, at?, comment }]
  const comments = JSON.parse(
    readFileSync(new URL('./comments.json', import.meta.url), 'utf8')
  )
  const commentByDeclStart = new Map()
  let inserted = 0
  for (const spec of comments) {
    let anchor
    if (spec.name === undefined) {
      // Raw-offset anchor (no binding): comment the statement whose first
      // token starts at `at` — for `b["xixz7"]=…` object-method assignments.
      const t = tokens.find((x) => x.start === spec.at)
      if (!t) {
        console.warn(`comment: no token at offset ${spec.at}`)
        continue
      }
      anchor = spec.at
    } else {
      const binding = findBinding(bindings, spec)
      if (!binding) {
        console.warn(`comment: no anchor for ${spec.name}${spec.at !== undefined ? '@' + spec.at : ''}`)
        continue
      }
      const nameStart = declAt(binding)
      const nameIdx = tokens.findIndex((t) => t.type === 'ident' && t.start === nameStart)
      // Anchor at the `function` keyword (just before the name) when present.
      anchor = nameStart
      if (nameIdx >= 0) {
        for (let k = nameIdx - 1; k >= 0 && k >= nameIdx - 3; k--) {
          if (tokens[k].type === 'ident' && tokens[k].text === 'function') {
            anchor = tokens[k].start
            break
          }
        }
      }
    }
    commentByDeclStart.set(anchor, spec.comment)
    inserted++
  }

  // Put each `// nice -> ugly` comment just above its binding's declaration —
  // above the `function` keyword for a function declaration, otherwise at the
  // name itself (an IIFE param). Structure comments share the same anchor, so
  // both sit above `function` when they coincide.
  const renameCommentByAnchor = new Map()
  for (const [binding, nice] of renameByBinding) {
    if (!binding.identifiers || !binding.identifiers[0]) continue
    const nameStart = binding.identifiers[0].start
    const nameIdx = tokens.findIndex((t) => t.type === 'ident' && t.start === nameStart)
    let anchor = nameStart
    if (nameIdx >= 0) {
      for (let k = nameIdx - 1; k >= 0 && k >= nameIdx - 3; k--) {
        if (tokens[k].type === 'ident' && tokens[k].text === 'function') {
          anchor = tokens[k].start
          break
        }
      }
    }
    renameCommentByAnchor.set(anchor, { nice, ugly: binding.name })
  }

  const renamed = []
  for (const t of tokens) {
    const structComment = commentByDeclStart.get(t.start)
    if (structComment !== undefined) {
      commentByDeclStart.delete(t.start)
      renamed.push({ type: 'comment', text: `// ${structComment}\n`, wsBefore: t.wsBefore })
    }
    const rc = renameCommentByAnchor.get(t.start)
    if (rc !== undefined) {
      renameCommentByAnchor.delete(t.start)
      renamed.push({ type: 'comment', text: `// ${rc.nice} -> ${rc.ugly}\n`, wsBefore: t.wsBefore })
    }
    if (t.type === 'ident') {
      const binding = bindingByStart.get(t.start)
      const nice = binding ? renameByBinding.get(binding) : undefined
      if (nice) {
        renamed.push({ ...t, text: nice })
        continue
      }
    }
    renamed.push(t)
  }

  const nice = prettyPrint(renamed)
  const out = join(TOOL_DIR, basename(input).replace(/\.js$/, '.deobfuscated.js'))
  writeFileSync(out, nice)

  console.log(`renamed bindings:    ${renameByBinding.size} (${manualCount} manual)`)
  console.log(`structure comments:  ${inserted}`)
  console.log(`nice file:           ${out} (${nice.length} bytes)`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
