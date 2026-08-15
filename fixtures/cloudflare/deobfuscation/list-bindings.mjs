// list-bindings.mjs — dump every distinct binding in a file (name, def types,
// declaration offset, scope) so hand renames can be targeted unambiguously.
import { readFileSync } from 'node:fs'
import { resolveScopes } from './scope.mjs'

const src = readFileSync(process.argv[2], 'utf8')
const bindingByStart = resolveScopes(src)

const seen = new Set()
const out = []
for (const b of bindingByStart.values()) {
  if (seen.has(b)) continue
  seen.add(b)
  const first = b.identifiers && b.identifiers[0]
  out.push({
    name: b.name,
    def: b.defTypes.join(','),
    scope: b.scopeType,
    at: first ? first.start : -1,
  })
}
out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.at - b.at))

const filter = process.argv[3]
for (const b of out) {
  if (filter && b.name !== filter) continue
  console.log(`${b.name.padEnd(4)} ${(b.def || '-').padEnd(16)} ${b.scope.padEnd(16)} @${b.at}`)
}
console.log(`\n(total ${out.length} distinct bindings)`)

// snippet of source at each offset for the filtered name
if (filter) {
  for (const b of out.filter((x) => x.name === filter)) {
    console.log(`\n@${b.at}: …${src.slice(Math.max(0, b.at - 25), b.at + 30)}…`)
  }
}
