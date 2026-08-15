// Whitespace-preserving JS lexer for the Castle de-obfuscation round-trip.
//
// The whole point: `reemit(tokenize(src)) === src` byte-for-byte. We never
// reprint token *text* — only re-join the exact original slices — so a
// "re-uglify" is literally just concatenating the original tokens back
// together. Symbol renaming then becomes "rewrite some `ident` token texts",
// which is trivially reversible with a rename map.
//
// Token shape: { type, text, wsBefore }
//   type: 'ident' | 'string' | 'template' | 'number' | 'regex' | 'comment'
//         | 'punct' | 'ws'
//   text:  the exact source slice
//   wsBefore: the exact whitespace (incl. nothing) immediately before this token
//
// Two tokens of the same text never merge: a trailing 'ws' token carries any
// whitespace left at end-of-file so re-emission is lossless.

const IDENT_START = /[A-Za-z_$]/
const IDENT_CONT = /[A-Za-z0-9_$]/
const DIGIT = /[0-9]/

export function tokenize(src) {
  const tokens = []
  let i = 0
  let ws = ''
  const n = src.length

  const push = (type, end) => {
    tokens.push({ type, text: src.slice(i, end), wsBefore: ws, start: i, end })
    ws = ''
    i = end
  }

  while (i < n) {
    const c = src[i]

    // whitespace — accumulate into the next token's wsBefore
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v') {
      let j = i
      while (j < n && /\s/.test(src[j])) j++
      ws += src.slice(i, j)
      i = j
      continue
    }

    // line comment
    if (c === '/' && src[i + 1] === '/') {
      let j = i
      while (j < n && src[j] !== '\n' && src[j] !== '\r') j++
      push('comment', j)
      continue
    }

    // block comment
    if (c === '/' && src[i + 1] === '*') {
      const j = src.indexOf('*/', i + 2)
      push('comment', j === -1 ? n : j + 2)
      continue
    }

    // string literal
    if (c === '"' || c === "'") {
      push('string', readString(src, i, c))
      continue
    }

    // template literal (handles ${...} nesting)
    if (c === '`') {
      push('template', readTemplate(src, i))
      continue
    }

    // number
    if (DIGIT.test(c) || (c === '.' && DIGIT.test(src[i + 1] ?? ''))) {
      push('number', readNumber(src, i))
      continue
    }

    // identifier / keyword
    if (IDENT_START.test(c)) {
      let j = i
      while (j < n && IDENT_CONT.test(src[j])) j++
      push('ident', j)
      continue
    }

    // regex literal (context-sensitive) — otherwise '/' is division
    if (c === '/' && isRegexStart(tokens)) {
      push('regex', readRegex(src, i))
      continue
    }

    // punctuation / operator (longest match)
    push('punct', readPunct(src, i))
  }

  if (ws) tokens.push({ type: 'ws', text: ws, wsBefore: '', start: n, end: n })

  return tokens
}

// Re-join tokens exactly as they appeared (ignores any renaming for now).
export function reemit(tokens) {
  let out = ''
  for (const t of tokens) out += t.wsBefore + t.text
  return out
}

function readString(src, start, quote) {
  let i = start + 1
  while (i < src.length) {
    const c = src[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === quote) return i + 1
    if (c === '\n' || c === '\r') return i // unterminated (won't happen in valid JS)
    i++
  }
  return src.length
}

function readTemplate(src, start) {
  let i = start + 1
  while (i < src.length) {
    const c = src[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '`') return i + 1
    if (c === '$' && src[i + 1] === '{') {
      i = skipTemplateExpr(src, i + 2)
      continue
    }
    i++
  }
  return src.length
}

function skipTemplateExpr(src, start) {
  let i = start
  let depth = 1
  while (i < src.length) {
    const c = src[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '"' || c === "'") {
      i = readString(src, i, c)
      continue
    }
    if (c === '`') {
      i = readTemplate(src, i)
      continue
    }
    if (c === '{') {
      depth++
      i++
      continue
    }
    if (c === '}') {
      depth--
      i++
      if (depth === 0) return i
      continue
    }
    i++
  }
  return src.length
}

function readNumber(src, start) {
  let i = start
  const n = src.length

  if (src[i] === '0' && /[xXoObB]/.test(src[i + 1] ?? '')) {
    // 0x, 0o, 0b prefixes
    i += 2
    while (i < n && /[0-9a-fA-F_]/i.test(src[i])) i++
    // hex digits include a-f; oct/bin only digits but the loose check is fine
    if (src[i] === 'n') i++
    return i
  }

  // integer part
  while (i < n && (DIGIT.test(src[i]) || src[i] === '_')) i++
  // fraction
  if (src[i] === '.' && DIGIT.test(src[i + 1] ?? '')) {
    i++
    while (i < n && (DIGIT.test(src[i]) || src[i] === '_')) i++
  }
  // exponent
  if (/[eE]/.test(src[i] ?? '')) {
    i++
    if (/[+-]/.test(src[i] ?? '')) i++
    while (i < n && (DIGIT.test(src[i]) || src[i] === '_')) i++
  }
  // bigint suffix
  if (src[i] === 'n') i++

  return i
}

function readRegex(src, start) {
  let i = start + 1
  let inClass = false
  while (i < src.length) {
    const c = src[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '\n' || c === '\r') return i // unterminated
    if (c === '[') {
      inClass = true
      i++
      continue
    }
    if (c === ']' && inClass) {
      inClass = false
      i++
      continue
    }
    if (c === '/' && !inClass) {
      i++
      // flags
      while (i < src.length && /[a-z]/i.test(src[i])) i++
      return i
    }
    i++
  }
  return src.length
}

function readPunct(src, start) {
  const n = src.length
  const c = src[start]
  // Multi-char operators, longest first. Only those that can't be a valid
  // sequence of single-char punctuations need listing; covering the common
  // ones is enough because any char we DON'T consume here just becomes its
  // own token on the next iteration — we only need to avoid SPLITTING a real
  // operator, which never breaks re-emission (text is preserved either way).
  const three = ['===', '!==', '>>>', '<<=', '>>=', '**=', '&&=', '||=', '??=', '...']
  const two = [
    '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.',
    '++', '--', '**', '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
  ]

  if (c === '.' && src[start + 1] === '.' && src[start + 2] === '.') return start + 3

  for (const op of three) {
    if (src.startsWith(op, start)) return start + op.length
  }
  for (const op of two) {
    if (src.startsWith(op, start)) return start + op.length
  }
  return start + 1
}

// Whether a '/' here starts a regex literal rather than division. Based on the
// previous significant token — the standard contextual heuristic.
function isRegexStart(tokens) {
  for (let k = tokens.length - 1; k >= 0; k--) {
    const t = tokens[k]
    if (t.type === 'ws' || t.type === 'comment') continue
    if (t.type !== 'punct' && t.type !== 'ident') {
      // after a string/number/template/regex literal, '/' is division
      return false
    }
    const text = t.text
    // keywords that precede an expression
    const kw = new Set([
      'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
      'throw', 'case', 'do', 'else', 'yield', 'await',
    ])
    if (t.type === 'ident' && kw.has(text)) return true
    // punctuators that precede an expression
    const punct = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '=>'])
    if (t.type === 'punct' && punct.has(text)) return true
    return false
  }
  return true // start of file
}
