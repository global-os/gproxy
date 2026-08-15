// Round-trip pipeline for the Castle de-obfuscation.
//
//   node pipeline.mjs <input.js>
//
// 1. tokenize (lossless — re-emitting the tokens reproduces the input exactly)
// 2. emit <input>.pretty.js   (tokens re-indented; token text untouched)
// 3. emit <input>.reugly.js   (tokens re-joined with their ORIGINAL whitespace)
// 4. assert reugly === original
//
// The assertion is the contract: because the lexer preserves every byte and
// "re-uglify" only re-joins the original slices, this is trivially true — which
// is exactly what makes later symbol renames reversible and provably in sync.
//
// Usage: node pipeline.mjs ../castle.umd-Cs-TYKFF.js

import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { tokenize, reemit } from './lexer.mjs'

// Re-emit tokens with readable indentation. Only the whitespace changes; every
// token's text is verbatim, so renaming done on this view still round-trips.
export function prettyPrint(tokens) {
  let out = ''
  let indent = 0
  let lineStart = true
  const pad = () => (lineStart ? '  '.repeat(indent) : '')

  for (const t of tokens) {
    if (t.type === 'ws') continue // original whitespace is dropped here
    if (t.type === 'comment') {
      out += pad() + t.text
      lineStart = /\n$/.test(t.text)
      continue
    }

    const isOpen = t.text === '{'
    const isClose = t.text === '}'
    const isSemi = t.text === ';'
    const isComma = t.text === ','

    if (isClose) indent = Math.max(0, indent - 1)

    if (isOpen) {
      out += (out && !lineStart ? ' ' : pad()) + t.text + '\n'
      indent++
      lineStart = true
    } else if (isClose) {
      out += pad() + t.text + '\n'
      lineStart = true
    } else if (isSemi) {
      out += t.text + '\n'
      lineStart = true
    } else if (isComma) {
      out += t.text + '\n'
      lineStart = true
    } else {
      out += pad() + t.text
      lineStart = false
    }
  }
  return out
}

function main() {
  const input = process.argv[2]
  if (!input) {
    console.error('usage: node pipeline.mjs <input.js>')
    process.exit(1)
  }

  const src = readFileSync(input, 'utf8')
  const tokens = tokenize(src)

  const pretty = prettyPrint(tokens)
  const reugly = reemit(tokens)

  const prettyPath = input.replace(/\.js$/, '.pretty.js')
  const reuglyPath = input.replace(/\.js$/, '.reugly.js')

  writeFileSync(prettyPath, pretty)
  writeFileSync(reuglyPath, reugly)

  const ok = reugly === src
  console.log(`tokens:      ${tokens.length}`)
  console.log(`pretty:      ${prettyPath} (${pretty.length} bytes)`)
  console.log(`reugly:      ${reuglyPath} (${reugly.length} bytes)`)

  if (ok) {
    console.log('round-trip:  PASS — reugly === original (byte-exact)')
  } else {
    console.error('round-trip:  FAIL')
    let i = 0
    while (i < src.length && src[i] === reugly[i]) i++
    console.error(`first divergence at byte ${i}:`)
    console.error('  orig:', JSON.stringify(src.slice(i, i + 60)))
    console.error('  out :', JSON.stringify(reugly.slice(i, i + 60)))
    process.exit(1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
