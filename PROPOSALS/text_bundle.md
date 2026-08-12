# Text bundle format (`.tbundle`)

A human-readable archive format for GlobalOS app content. A single text file maps paths to file bodies using `@path` headers. Compiles to the same in-memory file map (or tar) as a `.gapp` directory tree.

## Goals

- Readable and hand-editable in a text editor
- Obvious file boundaries: `@filename` then multiline body
- Minimal escaping: literal `@` is written `@@`
- UTF-8 text first; binary via an explicit encoding (v1 optional)

## Non-goals (v1)

- Streaming compression inside the bundle
- Replacing tar on the wire without a compile step (instance runtime may still use tar internally)
- Symlinks, hard links, or Unix metadata (mode, mtime)

---

## File extension and MIME

| | |
|---|---|
| Extension | `.tbundle` (authoring); may live inside or beside a `.gapp` directory as `bundle.tbundle` |
| Media type | `application/vnd.globalos.tbundle+text; charset=utf-8` (proposed) |

---

## Syntax

A **text bundle** is a UTF-8 document consisting of zero or more **entries** concatenated in order.

### Entry

```ebnf
entry     = header newline body
header    = "@" path
path      = 1*path-char
path-char = any UTF-8 scalar except NUL, CR, LF, and unescaped "@"
body      = *content-char until next header or end-of-file
```

- **Header line:** Starts at the beginning of a line (after `\n`, or at BOF) with a single `@`, then the **path** (no surrounding whitespace required; trim is implementation-defined — **do not trim** in v1).
- **Body:** All bytes after the header line’s newline until the next header line or EOF.
- **Next header:** A line that begins with `@` where the second character is **not** `@`.

### Escaping

Inside a **body** only (not in paths):

| Source | Meaning |
|--------|---------|
| `@@` | Literal U+0040 `@` |

Processing: after extracting a body, replace every `@@` with `@` (left-to-right, non-overlapping). No other escape sequences in v1.

**Not a header:** A line starting with `@@` is body content (after unescape, it becomes a line starting with `@`).

```tbundle
@notes.txt
Mention @@user on @@channel
not a new file
```

After unescape, `notes.txt` contains:

```
Mention @user on @channel
not a new file
```

### Paths

- Relative, POSIX-style: `index.html`, `vendor/yjs.js`, `helloworld.gapp/index.html`
- Must not start with `/`, contain `..`, or contain `\`
- `.` and `..` as path segments are invalid
- Duplicate paths: **error** at compile time (last wins is **not** allowed)

### Newlines

- Header lines are terminated by `\n` (normalize `\r\n` → `\n` on read).
- Body is preserved **exactly** (after `@@` unescape), including trailing newlines and blank lines.
- A body may be **empty** (header immediately followed by another header or EOF).

### Comments and preamble

v1 has **no** comment syntax. Text before the first valid header is a **parse error**. Use a real file if you need a README:

```tbundle
@README.txt
Format notes for maintainers…

@index.html
…
```

---

## Examples

### Minimal two-file bundle

```tbundle
@hello.js
export function hello() {
  return 'hi'
}

@hello.txt
line one
line two

```

`hello.js` body ends with `}\n` (newline after `}`). `hello.txt` body is `line one\nline two\n` if the closing blank line before EOF is present; otherwise exact bytes between headers.

### Empty file

```tbundle
@empty.txt
@next.txt
content
```

`empty.txt` → zero bytes. `next.txt` → `content` (no trailing newline unless source includes one).

### Literal at-sign in content

```tbundle
@email-draft.txt
Send to @@support@example.com when done.

@done
```

Unescaped body: `Send to @support@example.com when done.\n`

### Nested paths (typical `.gapp` layout)

```tbundle
@gapp.json
{
  "name": "helloworld",
  "entry": "index.html"
}

@index.html
<!DOCTYPE html>
<html>…</html>

@yjs.js
…bundled yjs IIFE…
```

---

## Parse algorithm

1. Normalize line endings to `\n`.
2. Find all header lines with regex `^@([^@\n].*)$` (multiline `^`/`$`).
3. If none found → error `no entries`.
4. For each header at index `i`:
   - `path` = capture group 1 (must pass path validation).
   - `bodyRaw` = text from `headerLineEnd` to `headers[i+1].start` (or EOF).
   - `body` = `bodyRaw` with `@@` → `@`.
   - Insert `path → body` into map; duplicate path → error.
5. Return `Map<string, string>` (or `Map<string, Uint8Array>` UTF-8 encoded).

Reference implementation lives at `src/bundle/tbundle/` (`npm run test:tbundle`).

---

## Compile pipeline (GlobalOS)

```
Authoring                    Build                         Runtime
─────────                    ─────                         ───────
bundle.tbundle      ──►     parse-tbundle                 ensureInstanceContent
     or                      hash + store                  (memory map)
.gapp/ directory    ──►     OR collectTree + buildTar  ──►  same map
```

Recommended layout inside `helloworld.gapp/`:

```
helloworld.gapp/
  gapp.json          ← manifest (deps, entry)
  bundle.tbundle     ← optional; if present, wins over loose files for image build
  yjs.js             ← large vendored blobs may stay as separate files
```

**Precedence (proposed):** If `bundle.tbundle` exists, image build uses parsed entries and **ignores** other files in the directory except those referenced by `gapp.json` `bundled` deps. If absent, fall back to directory tree + tar (current behavior).

---

## Binary content (v2 sketch)

v1: text only. For binaries, keep separate files in the directory or use a dedicated header:

```tbundle
@yjs.js;base64
YXZhbG9uZy4uLg==

@icon.png;base64
iVBORw0KGgo...
```

Semicolon suffix on path is reserved for v2; v1 parsers must reject `;` in paths.

---

## Validation errors

| Condition | Error |
|-----------|--------|
| Preamble before first `@path` | `unexpected content before first entry` |
| Invalid path | `invalid path: …` |
| Duplicate path | `duplicate path: …` |
| `@@` only path (`@@@` header) | `invalid path` (path must start with non-`@` char) |
| Invalid UTF-8 | `invalid utf-8` |

## Review feedback (2026-08-08)

- No blocking issues found in the format proposal. It matches the existing parser layout in `src/bundle/tbundle/`.
- One implementation detail to keep documented: current path validation rejects any path containing `..`, not only `..` as a path segment. That is stricter than the prose examples but fine as a conservative v1 rule.

---

## Comparison to tar

| | Text bundle | tar |
|---|-------------|-----|
| Human editable | Yes | No |
| Exact round-trip in git | Yes | Poor (binary) |
| Standard tools | Custom parser | ubiquitous |
| Binary | Awkward (v2 base64) | Native |
| GlobalOS instance serve | Compile to map/tar first | Current default |

---

## Open questions

1. **Single-file `.gapp`:** Allow a directory entry that is only `Something.gapp.tbundle` (one file on desktop)?
2. **Merge with directory:** Union tbundle + loose files with explicit precedence rules?
3. **Filename:** `bundle.tbundle` vs `App.tbundle` vs `.gapp` as extension on the text file itself?

---

## Summary

- Start a file section with `@path` on its own line.
- Everything until the next `@path` line is that file’s body.
- Write `@@` anywhere in the body for a literal `@`.
- A line starting with `@@` is **never** a new file header.
- Compile to the same structure tar produces before instance serve.
