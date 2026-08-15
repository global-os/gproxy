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
import { prettyPrint } from './pipeline.mjs'

const TOOL_DIR = dirname(fileURLToPath(import.meta.url))

const RESERVED = new Set(
  'break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield let static await implements interface package private protected public'.split(
    ' '
  )
)

function isCleanIdentifier(s) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s) && !RESERVED.has(s)
}

// Derive an ugly -> nice rename map from plaintext string constants. Only names
// that don't already appear as identifiers are used, so the reverse stays
// unambiguous (and the round-trip is provable).
function deriveRenameMap(tokens) {
  const used = new Set(tokens.filter((t) => t.type === 'ident').map((t) => t.text))
  const map = Object.create(null)
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
    const inner = a.text.slice(1, -1)
    if (!isCleanIdentifier(inner) || used.has(inner)) continue
    map[t.text] = inner
    used.add(inner)
  }
  return map
}

// Rename ugly -> nice, inserting `// nice -> ugly` only at the FIRST occurrence
// of each symbol (its definition); every later use is renamed bare.
export function rename(tokens, map) {
  const out = []
  const commented = new Set()
  for (const t of tokens) {
    if (t.type === 'ident' && Object.hasOwn(map, t.text)) {
      const nice = map[t.text]
      if (!commented.has(t.text)) {
        commented.add(t.text)
        out.push({
          type: 'comment',
          text: `// ${nice} -> ${t.text}\n`,
          wsBefore: t.wsBefore,
        })
        out.push({ ...t, text: nice, wsBefore: '' })
      } else {
        out.push({ ...t, text: nice })
      }
    } else {
      out.push(t)
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

  // Auto-derived map (plaintext string constants) + manual renames from
  // manual-rename.json (identifiers identified by hand, e.g. the string-VM
  // arrays). Manual entries win.
  const map = deriveRenameMap(tokens)
  const manual = JSON.parse(
    readFileSync(new URL('./manual-rename.json', import.meta.url), 'utf8')
  )
  Object.assign(map, manual)

  let nice = prettyPrint(rename(tokens, map))

  // Structure comments (comments.json) anchored by a unique source substring.
  const comments = JSON.parse(
    readFileSync(new URL('./comments.json', import.meta.url), 'utf8')
  )
  let inserted = 0
  for (const { anchor, comment } of comments) {
    const idx = nice.indexOf(anchor)
    if (idx === -1) {
      console.warn(`comment anchor not found: ${anchor.slice(0, 40)}`)
      continue
    }
    const lineStart = nice.lastIndexOf('\n', idx) + 1
    const indent = (nice.slice(lineStart, idx).match(/^\s*/) || [''])[0]
    nice = nice.slice(0, lineStart) + `${indent}// ${comment}\n` + nice.slice(lineStart)
    inserted++
  }

  const out = join(TOOL_DIR, basename(input).replace(/\.js$/, '.deobfuscated.js'))
  writeFileSync(out, nice)

  console.log(`renamed identifiers: ${Object.keys(map).length} (${Object.keys(manual).length} manual)`)
  console.log(`structure comments: ${inserted}`)
  console.log(`nice file:          ${out} (${nice.length} bytes)`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
