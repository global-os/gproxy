import { normalizeTbundleSource } from './normalize.js'
import type { ParseTbundleResult } from './types.js'
import { unescapeTbundleBody } from './unescape.js'
import { validateTbundlePath } from './validate-path.js'

const HEADER_RE = /^@([^@\n].*)$/gm

export function parseTbundle(source: string): ParseTbundleResult {
  const text = normalizeTbundleSource(source)

  const headers: { path: string; start: number; bodyStart: number }[] = []
  let match: RegExpExecArray | null

  HEADER_RE.lastIndex = 0
  while ((match = HEADER_RE.exec(text)) !== null) {
    const path = match[1]!
    const start = match.index
    const headerEnd = start + match[0].length
    const bodyStart =
      headerEnd < text.length && text[headerEnd] === '\n'
        ? headerEnd + 1
        : headerEnd
    headers.push({ path, start, bodyStart })
  }

  if (headers.length === 0) {
    if (text.length > 0) {
      return { ok: false, error: { kind: 'unexpected-preamble' } }
    }
    return { ok: false, error: { kind: 'no-entries' } }
  }

  if (headers[0]!.start !== 0) {
    return { ok: false, error: { kind: 'unexpected-preamble' } }
  }

  const entries = new Map<string, string>()

  for (let i = 0; i < headers.length; i++) {
    const { path, bodyStart } = headers[i]!
    const bodyEnd = i + 1 < headers.length ? headers[i + 1]!.start : text.length

    const pathError = validateTbundlePath(path)
    if (pathError) {
      return {
        ok: false,
        error: { kind: 'invalid-path', path, reason: pathError },
      }
    }

    if (entries.has(path)) {
      return { ok: false, error: { kind: 'duplicate-path', path } }
    }

    entries.set(path, unescapeTbundleBody(text.slice(bodyStart, bodyEnd)))
  }

  return { ok: true, entries }
}
