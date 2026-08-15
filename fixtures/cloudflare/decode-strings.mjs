// decode-strings.mjs — extract + run Cloudflare's string-array machinery to
// recover the decoded string table (index -> string) for the challenge main.js.
//
// The obfuscator stores every string literal in one semicolon-delimited string:
//   function f(cp){ cp=`...;...;...`.split(`;`), f=()=>cp, f() }
//   function g(l,c,d,P){ return l=l-213, d=f(), P=d[l], P }   // g(l) = f()[l-213]
// plus a rotation cipher run once at startup: (function(...){...})(f, 114224)
// that rotates the array until a parse-int checksum of some entries == 114224.
//
// We extract those three pieces verbatim from the obfuscated source and eval
// them in a fresh Function scope, then read the final (rotated) array.
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync(process.argv[2], 'utf8')

// ---- balanced extractor over { } with template-literal awareness ----
function sliceBalanced(text, openIdx) {
  // openIdx points at '{'. Return end index just past the matching '}'.
  let depth = 0
  let inTpl = false
  let inStr = false
  let strCh = ''
  for (let i = openIdx; i < text.length; i++) {
    const c = text[i]
    if (inTpl) {
      if (c === '`') inTpl = false
      else if (c === '\\') i++
      continue
    }
    if (inStr) {
      if (c === '\\') i++
      else if (c === strCh) inStr = false
      continue
    }
    if (c === '`') { inTpl = true; continue }
    if (c === '"' || c === "'") { inStr = true; strCh = c; continue }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  throw new Error('unbalanced braces')
}

function extract(from, to) {
  const i = src.indexOf(from)
  if (i < 0) throw new Error(`marker not found: ${from}`)
  const open = src.indexOf('{', i)
  const end = sliceBalanced(src, open)
  const body = src.slice(i, end)
  // drop a trailing to-marker if present (e.g. `}(f,114224)`)
  return body
}

// 1. the array builder function f
const fFn = extract('function f(cp){', null)
// 2. the decoder function g
const gFn = extract('function g(l,c,d,P){', null)
// 3. the rotation cipher (the standalone anonymous function, called with (f, 114224))
const rotFn = extract('function(l,c,gw,fv,d,P){for(gw={', null)

// Reconstruct + run. f and g are function declarations (hoisted); the rotation
// is an IIFE-style call. After it runs, f() returns the rotated array.
const runner = new Function(`
  ${fFn}
  ${gFn}
  (${rotFn})(f, 114224)
  return f()
`)

const arr = runner()

console.log(`string array length: ${arr.length}`)
// index by decoder arg: g(l) = arr[l-213]
const byArg = {}
for (let l = 213; l < 213 + arr.length; l++) byArg[l] = arr[l - 213]

const out = process.argv[3] || 'strings.json'
writeFileSync(out, JSON.stringify(byArg, null, 2))
console.log(`wrote ${out}`)

// quick sanity dump: a handful of interesting entries
const sample = []
for (let l = 213; l < 213 + arr.length; l++) {
  const v = arr[l - 213]
  if (/location|navigator|screen|document|hostname|ancestor|cookie|parent|top|self|origin|referrer|userAgent|platform|brave|font|canvas|webgl|cf_clearance|challenge|oneshot|timeout|sha|pow|proof|token|nonce/i.test(v)) {
    sample.push(`g(${l}) = ${JSON.stringify(v)}`)
  }
}
console.log('\n=== interesting entries ===')
console.log(sample.join('\n'))
