// verify.mjs — assert the "nice" file still maps to the shipped "ugly" file.
//
//   node verify.mjs <nice.js> <ugly.js>
//
// The only direction we maintain: nice -> ugly. It tokenizes the nice file,
// strips the `// nice -> ugly` comments, reverse-renames (nice -> ugly), and
// asserts the resulting token *text* sequence is identical to the ugly file's.
// Whitespace is irrelevant here — the ugly file owns its own whitespace — so
// this is a pure "the nice file is a faithful de-obfuscation" check. If a human
// edit breaks the correspondence (renames without a comment, drops a token,
// etc.), this fails and names the first diverging token.
//
// Usage: node verify.mjs castle.umd-Cs-TYKFF.deobfuscated.js ../castle.umd-Cs-TYKFF.js

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { tokenize } from './lexer.mjs'

const ANNOTATION_RE = /^\/\/\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*->\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*$/

// Strip annotation comments (building nice -> ugly) and reverse-rename.
function normalize(niceTokens) {
  const reverse = Object.create(null)
  const out = []
  for (const t of niceTokens) {
    if (t.type === 'comment') {
      const m = ANNOTATION_RE.exec(t.text.trim())
      if (m) reverse[m[1]] = m[2]
      continue
    }
    if (t.type === 'ws') continue
    if (t.type === 'ident' && Object.hasOwn(reverse, t.text)) {
      out.push({ ...t, text: reverse[t.text] })
    } else {
      out.push(t)
    }
  }
  return { tokens: out, renames: Object.keys(reverse).length }
}

function main() {
  const nice = process.argv[2]
  const ugly = process.argv[3]
  if (!nice || !ugly) {
    console.error('usage: node verify.mjs <nice.js> <ugly.js>')
    process.exit(1)
  }

  const niceTokens = tokenize(readFileSync(nice, 'utf8'))
  const uglyTokens = tokenize(readFileSync(ugly, 'utf8'))

  const { tokens: norm, renames } = normalize(niceTokens)
  const uglyText = uglyTokens.filter((t) => t.type !== 'ws')

  console.log(`reverse-renames:   ${renames}`)
  console.log(`nice tokens:       ${norm.length}, ugly tokens: ${uglyText.length}`)

  if (norm.length !== uglyText.length) {
    console.error(`FAIL: token count differs (nice=${norm.length}, ugly=${uglyText.length})`)
    process.exit(1)
  }

  for (let i = 0; i < norm.length; i++) {
    if (norm[i].text !== uglyText[i].text) {
      console.error(`FAIL: first divergence at token ${i}:`)
      console.error(`  nice: ${JSON.stringify(norm[i].text)}`)
      console.error(`  ugly: ${JSON.stringify(uglyText[i].text)}`)
      process.exit(1)
    }
  }

  console.log('PASS: nice file is a faithful de-obfuscation of the ugly file')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
