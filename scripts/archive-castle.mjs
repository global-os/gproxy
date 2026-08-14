// Archive a Castle SDK chunk from X's CDN for reference.
//
// Usage:
//   node scripts/archive-castle.mjs <chunk-filename>
//     e.g. node scripts/archive-castle.mjs castle.umd-Cs-TYKFF.js
//
// Fetches the chunk from abs.twimg.com/x-web/x-web/assets/ and writes it to
// fixtures/castle/, then reports its size and whether its tamper-check shape
// matches any known CASTLE_BUILD_VERSIONS entry (see src/runtime/webview/proxy.ts).
//
// The known fingerprints below are deliberately duplicated from proxy.ts's
// CASTLE_BUILD_VERSIONS rather than imported, so this script stays dependency-free.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'fixtures', 'castle')

// Keep in sync with CASTLE_BUILD_VERSIONS fingerprints in proxy.ts.
const KNOWN_FINGERPRINTS = [
  {
    name: 'uN-try-return-v1',
    re: /function (u\d+)\(\)\{try\{return ([^;]{5,80}?)\}catch\{return!1\}\}/,
  },
]

const filename = process.argv[2]
if (!filename) {
  console.error('Usage: node scripts/archive-castle.mjs <chunk-filename>')
  process.exit(1)
}
if (!/^castle\.[A-Za-z0-9_-]+\.js$/i.test(filename)) {
  console.error(
    'Refusing: filename does not look like a Castle chunk (castle.*.js)'
  )
  process.exit(1)
}

const url = `https://abs.twimg.com/x-web/x-web/assets/${filename}`
console.log(`fetching ${url}`)
const res = await fetch(url)
if (!res.ok) {
  console.error(`fetch failed: HTTP ${res.status}`)
  process.exit(1)
}
const text = await res.text()

const outPath = join(OUT_DIR, filename)
writeFileSync(outPath, text)
console.log(`saved ${outPath} (${text.length} bytes)`)

const matched = KNOWN_FINGERPRINTS.filter((f) => f.re.test(text))
if (matched.length > 0) {
  console.log(
    `matches known build: ${matched.map((m) => m.name).join(', ')}`
  )
} else {
  console.log(
    'matches NO known CASTLE_BUILD_VERSIONS shape — add a new entry to proxy.ts'
  )
}
