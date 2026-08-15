// deobfuscate.mjs — bootstrap (and incrementally extend) the human-maintained
// de-obfuscated "nice" file.
//
//   node deobfuscate.mjs <ugly.js>
//
// Renames every `IDENT = 'string'` constant whose string value is a clean,
// non-colliding identifier to that value, and puts a `// nice -> ugly` comment
// directly above each rename:
//
//     // location -> rO
//     location = `location`,
//
// The comment IS the correspondence: `location` (nice) was `rO` (ugly).
// verify.mjs reads these comments to go nice -> ugly. The output is the
// *maintained* artifact (committed), not a derived temp file.
//
// Usage: node deobfuscate.mjs ../castle.umd-Cs-TYKFF.js

import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, basename, join } from 'node:path'
import { tokenize } from './lexer.mjs'
import { prettyPrint } from './pretty.mjs'
import { resolveScopes } from './scope.mjs'

const TOOL_DIR = dirname(fileURLToPath(import.meta.url))

const RESERVED = new Set(
  'break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield let static await implements interface package private protected public'.split(
    ' '
  )
)

function isCleanIdentifier(s) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s) && !RESERVED.has(s)
}

// Collect the distinct bindings (by object identity) present in bindingByStart.
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

function main() {
  const input = process.argv[2]
  if (!input) {
    console.error('usage: node deobfuscate.mjs <ugly.js>')
    process.exit(1)
  }

  const src = readFileSync(input, 'utf8')
  const tokens = tokenize(src)
  const bindingByStart = resolveScopes(src)

  // renameByBinding: binding object -> nice name. Keyed by the binding (so the
  // rename is scope-aware — shadowing locals of the same name are untouched).
  const renameByBinding = new Map()
  const usedNames = new Set(tokens.filter((t) => t.type === 'ident').map((t) => t.text))

  // AUTO: string constants (`IDENT = 'string'`) — rename the binding holding a
  // clean, non-colliding string value.
  let autoCount = 0
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const n = tokens[i + 1]
    const a = tokens[i + 2]
    if (
      t.type !== 'ident' ||
      !n ||
      n.type !== 'punct' ||
      n.text !== '=' ||
      !a ||
      (a.type !== 'string' && a.type !== 'template')
    ) {
      continue
    }
    const binding = bindingByStart.get(t.start)
    if (!binding || renameByBinding.has(binding)) continue
    const inner = a.text.slice(1, -1)
    if (!isCleanIdentifier(inner) || usedNames.has(inner)) continue
    renameByBinding.set(binding, inner)
    usedNames.add(inner)
    autoCount++
  }

  // MANUAL: hand-identified bindings (manual-rename.json). Find the binding with
  // that name that is a declaration (Variable/FunctionName/ClassName), not a
  // shadowed param/local.
  const manual = JSON.parse(
    readFileSync(new URL('./manual-rename.json', import.meta.url), 'utf8')
  )
  let manualCount = 0
  for (const [name, nice] of Object.entries(manual)) {
    const candidates = collectBindings(bindingByStart).filter((b) => b.name === name)
    const target =
      candidates.find((c) =>
        c.defTypes.some((d) => d === 'Variable' || d === 'FunctionName' || d === 'ClassName')
      ) || candidates[0]
    if (target && !renameByBinding.has(target) && !usedNames.has(nice)) {
      renameByBinding.set(target, nice)
      usedNames.add(nice)
      manualCount++
    }
  }

  // Structure comments (comments.json): keyed by binding (name + def type),
  // inserted at that binding's declaration site.
  const comments = JSON.parse(
    readFileSync(new URL('./comments.json', import.meta.url), 'utf8')
  )
  const commentByDeclStart = new Map()
  let inserted = 0
  for (const { name, def, comment } of comments) {
    const binding = collectBindings(bindingByStart).find(
      (b) => b.name === name && b.defTypes.includes(def)
    )
    if (!binding || !binding.identifiers || !binding.identifiers[0]) {
      console.warn(`comment anchor not found: ${name} (${def})`)
      continue
    }
    const nameStart = binding.identifiers[0].start
    const nameIdx = tokens.findIndex((t) => t.type === 'ident' && t.start === nameStart)
    // Anchor at the `function` keyword (just before the name), not the name.
    let anchor = nameStart
    for (let k = nameIdx - 1; k >= 0 && k >= nameIdx - 3; k--) {
      if (tokens[k].type === 'ident' && tokens[k].text === 'function') {
        anchor = tokens[k].start
        break
      }
    }
    commentByDeclStart.set(anchor, comment)
    inserted++
  }

  // Rename scope-aware. The `// nice -> ugly` comment goes at each renamed
  // binding's *declaration* (not its first reference — `var`/`function` are
  // hoisted, so a reference can precede the declaration in source order).
  const declStarts = new Set()
  for (const binding of renameByBinding.keys()) {
    if (binding.identifiers && binding.identifiers[0]) {
      declStarts.add(binding.identifiers[0].start)
    }
  }

  const renamed = []
  for (const t of tokens) {
    const structComment = commentByDeclStart.get(t.start)
    if (structComment !== undefined) {
      commentByDeclStart.delete(t.start)
      renamed.push({
        type: 'comment',
        text: `// ${structComment}\n`,
        wsBefore: t.wsBefore,
      })
    }
    if (t.type === 'ident') {
      const binding = bindingByStart.get(t.start)
      const nice = binding ? renameByBinding.get(binding) : undefined
      if (nice) {
        if (declStarts.has(t.start)) {
          renamed.push({
            type: 'comment',
            text: `// ${nice} -> ${t.text}\n`,
            wsBefore: t.wsBefore,
          })
          renamed.push({ ...t, text: nice, wsBefore: '' })
          continue
        }
        renamed.push({ ...t, text: nice })
        continue
      }
    }
    renamed.push(t)
  }

  const nice = prettyPrint(renamed)

  const out = join(TOOL_DIR, basename(input).replace(/\.js$/, '.deobfuscated.js'))
  writeFileSync(out, nice)

  console.log(`renamed bindings: ${renameByBinding.size} (${autoCount} auto, ${manualCount} manual)`)
  console.log(`structure comments: ${inserted}`)
  console.log(`nice file:          ${out} (${nice.length} bytes)`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
