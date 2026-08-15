// Self-documenting de-obfuscation: annotate string-constant assignments with
// a comment, instead of a separate rename map.
//
//   node annotate.mjs <input.js>
//
// Walks the token stream and, for every `IDENT = 'string'` assignment, inserts
// a comment directly above it:
//
//     // 'location' -> rO
//     rO=`location`,
//
// That comment IS the correspondence — the tools (and a human reader) get the
// symbol→string mapping from the source itself, colocated with its definition.
//
// Round-trip contract: the annotation comments are the ONLY thing added, and
// they "carry" the original leading whitespace of the identifier they precede.
// Stripping them (and handing that whitespace back) reproduces the input
// byte-for-byte — asserted here. So the annotated file can never silently
// drift from the original: any edit that breaks the correspondence shows up as
// a round-trip failure.
//
// Usage: node annotate.mjs ../castle.umd-Cs-TYKFF.js

import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { tokenize, reemit } from './lexer.mjs'
import { prettyPrint } from './pipeline.mjs'

const ANNOTATION_RE = /^\/\/\s*(['"`]).*?\1\s*->\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\n?$/

// Insert `// <string> -> <ident>` above every `IDENT = <string>` assignment.
export function annotate(tokens) {
  const out = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const next = tokens[i + 1]
    const after = tokens[i + 2]
    if (
      t.type === 'ident' &&
      next &&
      next.type === 'punct' &&
      next.text === '=' &&
      after &&
      (after.type === 'string' || after.type === 'template')
    ) {
      // The comment takes over the ident's original wsBefore; the ident starts
      // fresh on the line after the comment. This makes stripping lossless.
      out.push({
        type: 'comment',
        text: `// ${after.text} -> ${t.text}\n`,
        wsBefore: t.wsBefore,
      })
      out.push({ ...t, wsBefore: '' })
      continue
    }
    out.push(t)
  }
  return out
}

// Remove annotation comments and restore the following identifier's whitespace.
export function strip(tokens) {
  const out = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === 'comment' && ANNOTATION_RE.test(t.text)) {
      if (tokens[i + 1]) {
        out.push({ ...tokens[i + 1], wsBefore: t.wsBefore })
        i++ // consumed the following ident
      }
      continue
    }
    out.push(t)
  }
  return out
}

function main() {
  const input = process.argv[2]
  if (!input) {
    console.error('usage: node annotate.mjs <input.js>')
    process.exit(1)
  }

  const src = readFileSync(input, 'utf8')
  const tokens = tokenize(src)
  const annotated = annotate(tokens)

  const annotatedSrc = reemit(annotated)
  const pretty = prettyPrint(annotated)

  const stripped = strip(annotated)
  const restored = reemit(stripped)

  const annotatedPath = input.replace(/\.js$/, '.annotated.js')
  const prettyPath = input.replace(/\.js$/, '.annotated.pretty.js')
  writeFileSync(annotatedPath, annotatedSrc)
  writeFileSync(prettyPath, pretty)

  const annotations = annotated.filter((t) => t.type === 'comment' && ANNOTATION_RE.test(t.text)).length

  console.log(`annotations:    ${annotations}`)
  console.log(`annotated:      ${annotatedPath} (${annotatedSrc.length} bytes)`)
  console.log(`pretty view:    ${prettyPath} (${pretty.length} bytes)`)

  const ok = restored === src
  if (ok) {
    console.log('round-trip:     PASS — stripping annotations reproduces the original byte-exact')
  } else {
    console.error('round-trip:     FAIL')
    let i = 0
    while (i < src.length && src[i] === restored[i]) i++
    console.error(`first divergence at byte ${i}:`)
    console.error('  orig:', JSON.stringify(src.slice(i, i + 60)))
    console.error('  out :', JSON.stringify(restored.slice(i, i + 60)))
    process.exit(1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
