import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseTbundle } from './parse.js'

function expectOk(source: string) {
  const result = parseTbundle(source)
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('expected ok result')
  return result.entries
}

function expectErr(source: string) {
  const result = parseTbundle(source)
  assert.equal(result.ok, false)
  if (result.ok) throw new Error('expected error result')
  return result.error
}

describe('parseTbundle', () => {
  it('parses a minimal two-file bundle', () => {
    const entries = expectOk(`@hello.js
export function hello() {
  return 'hi'
}

@hello.txt
line one
line two
`)
    assert.equal(
      entries.get('hello.js'),
      "export function hello() {\n  return 'hi'\n}\n\n"
    )
    assert.equal(entries.get('hello.txt'), 'line one\nline two\n')
  })

  it('supports empty file bodies', () => {
    const entries = expectOk(`@empty.txt
@next.txt
content
`)
    assert.equal(entries.get('empty.txt'), '')
    assert.equal(entries.get('next.txt'), 'content\n')
  })

  it('unescapes @@ to literal @ in bodies', () => {
    const entries = expectOk(`@notes.txt
Mention @@user on @@channel
not a new file
`)
    assert.equal(
      entries.get('notes.txt'),
      'Mention @user on @channel\nnot a new file\n'
    )
  })

  it('treats @@ at line start as body content, not a header', () => {
    const entries = expectOk(`@a.txt
@@not-a-header
still a
`)
    assert.equal(entries.get('a.txt'), '@not-a-header\nstill a\n')
    assert.equal(entries.size, 1)
  })

  it('splits on unescaped @ headers inside the bundle', () => {
    const entries = expectOk(`@a.txt
hello
@b.txt
world
`)
    assert.equal(entries.get('a.txt'), 'hello\n')
    assert.equal(entries.get('b.txt'), 'world\n')
  })

  it('keeps a bare @ line in the body', () => {
    const entries = expectOk(`@a.txt
@
@b.txt
`)
    assert.equal(entries.get('a.txt'), '@\n')
    assert.equal(entries.get('b.txt'), '')
  })

  it('allows header at EOF without trailing newline', () => {
    const entries = expectOk('@only.txt')
    assert.equal(entries.get('only.txt'), '')
  })

  it('normalizes CRLF and strips BOM', () => {
    const entries = expectOk(`\uFEFF@a.txt\r\none\r\n@b.txt\r\ntwo\r\n`)
    assert.equal(entries.get('a.txt'), 'one\n')
    assert.equal(entries.get('b.txt'), 'two\n')
  })

  it('rejects preamble before the first header', () => {
    assert.deepEqual(
      expectErr(`hello
@foo.txt
bar
`),
      { kind: 'unexpected-preamble' }
    )
  })

  it('rejects BOM-only preamble when followed by content', () => {
    const withoutBom = expectOk('@a.txt\nx\n')
    const withBom = expectOk('\uFEFF@a.txt\nx\n')
    assert.equal(withoutBom.get('a.txt'), withBom.get('a.txt'))
  })

  it('rejects empty bundles', () => {
    assert.deepEqual(expectErr(''), { kind: 'no-entries' })
  })

  it('rejects invalid paths', () => {
    assert.deepEqual(expectErr('@../secret\n'), {
      kind: 'invalid-path',
      path: '../secret',
      reason: 'path must not contain ..',
    })
    assert.deepEqual(expectErr('@/abs.txt\n'), {
      kind: 'invalid-path',
      path: '/abs.txt',
      reason: 'path must be relative',
    })
    assert.deepEqual(expectErr('@..\\secret\n'), {
      kind: 'invalid-path',
      path: '..\\secret',
      reason: 'path must use forward slashes',
    })
    assert.deepEqual(expectErr('@icon.png;base64\n'), {
      kind: 'invalid-path',
      path: 'icon.png;base64',
      reason: 'semicolon in path is reserved for v2',
    })
  })

  it('rejects duplicate paths', () => {
    assert.deepEqual(
      expectErr(`@dup.txt
one
@dup.txt
two
`),
      { kind: 'duplicate-path', path: 'dup.txt' }
    )
  })
})
