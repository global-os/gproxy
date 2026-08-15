// verify.mjs — assert the "nice" file still maps to the shipped "ugly" file.
//
//   node verify.mjs <nice.js> <ugly.js>
//
// The only direction we maintain: nice -> ugly. It tokenizes the nice file,
// reads the `// nice -> ugly` comments, and reverse-renames **per binding** —
// not per name — so many-to-one renames (every decoder alias -> `decoder`)
// stay unambiguous: each comment sits at its binding's declaration, and the
// binding it annotates is the first real identifier after it. The reverse-
// renamed token *text* sequence must then equal the ugly file's. Whitespace is
// irrelevant; a human edit that renames without a comment (or drops a token)
// fails the check.

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { tokenize } from './lexer.mjs'
import { resolveScopes } from './scope.mjs'

const ANNOTATION_RE = /^\/\/\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*->\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*$/

function main() {
  const nice = process.argv[2]
  const ugly = process.argv[3]
  if (!nice || !ugly) {
    console.error('usage: node verify.mjs <nice.js> <ugly.js>')
    process.exit(1)
  }

  const niceSrc = readFileSync(nice, 'utf8')
  const niceTokens = tokenize(niceSrc)
  const uglyTokens = tokenize(readFileSync(ugly, 'utf8')).filter((t) => t.type !== 'ws')

  // Scope resolution on the NICE file: byte offset -> binding object.
  const bindingByStart = resolveScopes(niceSrc)

  // Collect `// nice -> ugly` comments (with their offsets), then associate
  // each with the binding whose declaration identifier is the first real
  // identifier after the comment.
  const comments = []
  for (const t of niceTokens) {
    if (t.type === 'comment') {
      const m = ANNOTATION_RE.exec(t.text.trim())
      if (m) comments.push({ nice: m[1], ugly: m[2], start: t.start })
    }
  }
  comments.sort((a, b) => a.start - b.start)

  const bindingOffsets = [...bindingByStart.keys()].sort((a, b) => a - b)
  const bindingUgly = new Map() // binding object -> ugly name
  for (const c of comments) {
    let lo = 0
    let hi = bindingOffsets.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (bindingOffsets[mid] < c.start) lo = mid + 1
      else hi = mid
    }
    if (lo >= bindingOffsets.length) {
      console.warn(`comment ${c.nice} -> ${c.ugly} has no following binding`)
      continue
    }
    const binding = bindingByStart.get(bindingOffsets[lo])
    if (binding) bindingUgly.set(binding, c.ugly)
  }

  // Reverse-rename by binding.
  const out = []
  for (const t of niceTokens) {
    if (t.type === 'comment' || t.type === 'ws') continue
    if (t.type === 'ident') {
      const binding = bindingByStart.get(t.start)
      const uglyName = binding ? bindingUgly.get(binding) : undefined
      if (uglyName) {
        out.push({ ...t, text: uglyName })
        continue
      }
    }
    out.push(t)
  }

  console.log(`reverse-renames:   ${bindingUgly.size}`)
  console.log(`nice tokens:       ${out.length}, ugly tokens: ${uglyTokens.length}`)

  if (out.length !== uglyTokens.length) {
    console.error(`FAIL: token count differs (nice=${out.length}, ugly=${uglyTokens.length})`)
    process.exit(1)
  }
  for (let i = 0; i < out.length; i++) {
    if (out[i].text !== uglyTokens[i].text) {
      console.error(`FAIL: first divergence at token ${i}:`)
      console.error(`  nice: ${JSON.stringify(out[i].text)}`)
      console.error(`  ugly: ${JSON.stringify(uglyTokens[i].text)}`)
      process.exit(1)
    }
  }

  console.log('PASS: nice file is a faithful de-obfuscation of the ugly file')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
