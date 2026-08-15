// stringdecode.mjs — replace direct string-array lookups fa(N)/g(N) with the
// decoded literal, then pretty-print. Produces a grep-able "decoded" view of
// the obfuscated challenge main.js.
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync(process.argv[2], 'utf8')
const table = JSON.parse(readFileSync(process.argv[3] || 'strings.json', 'utf8'))

let out = src
let replaced = 0

// fa(NNN) and g(NNN) with numeric literal args -> JSON string
out = out.replace(/\b(fa|g)\((\d+)\)/g, (m, fn, num) => {
  const v = table[num]
  if (v === undefined) return m
  replaced++
  return JSON.stringify(v)
})

console.log(`replaced ${replaced} direct lookups`)

// ---- simple pretty-printer (indent on { }, newline after ; ) ----
function pretty(s) {
  let depth = 0
  let res = ''
  let inStr = false
  let strCh = ''
  let inTpl = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inTpl) {
      res += c
      if (c === '`') inTpl = false
      else if (c === '\\') res += s[++i]
      continue
    }
    if (inStr) {
      res += c
      if (c === '\\') res += s[++i]
      else if (c === strCh) inStr = false
      continue
    }
    if (c === '`') { inTpl = true; res += c; continue }
    if (c === '"' || c === "'") { inStr = true; strCh = c; res += c; continue }
    if (c === '{') {
      res += ' {\n' + '  '.repeat(depth + 1)
      depth++
      continue
    }
    if (c === '}') {
      depth = Math.max(0, depth - 1)
      res += '\n' + '  '.repeat(depth) + '}'
      continue
    }
    if (c === ';') {
      res += ';\n' + '  '.repeat(depth)
      continue
    }
    if (c === ',' && depth > 0 && !/^[,)]/.test(res.slice(-1))) {
      res += ',\n' + '  '.repeat(depth)
      continue
    }
    res += c
  }
  return res
}

const outPath = process.argv[4] || 'main-decoded.js'
writeFileSync(outPath, pretty(out))
console.log(`wrote ${outPath}`)
