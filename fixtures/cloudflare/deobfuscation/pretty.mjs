// pretty.mjs — re-emit tokens with readable indentation. Only the whitespace
// changes; every token's text is verbatim. A space is inserted between two
// tokens whose concatenation would merge into a longer token (e.g. `-` `-` →
// `--`, `/` `/` → `//`, `typeof` `window` → `typeofwindow`), so re-tokenizing
// yields the same token sequence — the property that makes verify.mjs a
// token-exact nice -> ugly check.

const MERGE_PAIRS = new Set([
  '++', '--', '==', '!=', '===', '!==', '<=', '>=', '&&', '||', '??', '=>',
  '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**',
  '?.', '...', '<<=', '>>=', '**=', '&&=', '||=', '??=', '/*', '//',
])

const isOpChar = (c) => c !== undefined && '+-<>=!&|*/.?%^:'.includes(c)
const isWordChar = (c) => c !== undefined && /[A-Za-z0-9_$]/.test(c)

function wouldMerge(prevText, curText) {
  if (!prevText || !curText) return false
  const a = prevText[prevText.length - 1]
  const b = curText[0]
  // Two word-ish tokens (ident/keyword/number) would merge into one identifier.
  if (isWordChar(a) && isWordChar(b)) return true
  // Two operator tokens could merge into a longer operator (or a comment).
  if (isOpChar(a) && isOpChar(b)) {
    return (
      MERGE_PAIRS.has(a + b) ||
      MERGE_PAIRS.has(prevText.slice(-2) + b) ||
      MERGE_PAIRS.has(a + curText.slice(0, 2))
    )
  }
  return false
}

export function prettyPrint(tokens) {
  let out = ''
  let indent = 0
  let lineStart = true
  let lastText = ''
  const pad = () => (lineStart ? '  '.repeat(indent) : '')

  for (const t of tokens) {
    if (t.type === 'ws') continue // original whitespace is dropped here
    if (t.type === 'comment') {
      out += pad() + t.text
      lineStart = /\n$/.test(t.text)
      lastText = t.text
      continue
    }

    const isOpen = t.text === '{'
    const isClose = t.text === '}'
    const isSemi = t.text === ';'
    const isComma = t.text === ','

    if (isClose) indent = Math.max(0, indent - 1)

    const needSpace = !lineStart && wouldMerge(lastText, t.text)

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
      out += (needSpace ? ' ' : '') + pad() + t.text
      lineStart = false
    }
    lastText = t.text
  }
  return out
}
