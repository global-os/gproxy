# Castle de-obfuscation workflow

Reversibly de-obfuscate the Castle SDK chunk (`castle.umd-*.js`). The goal is a
**human-maintained "nice" file** — indented, with meaningful names — that is
provably a faithful de-obfuscation of the shipped, obfuscated source.

## The workflow

The **nice file is the source of truth** (`*.deobfuscated.js`, committed). The
shipped ugly file (`../castle.umd-*.js`) is the fixture. The only direction we
maintain and assert is **nice → ugly**:

```bash
# bootstrap (or regenerate) the nice file from the ugly chunk
node deobfuscation/deobfuscate.mjs ../castle.umd-Cs-TYKFF.js

# assert the nice file still maps back to the shipped ugly file
node deobfuscation/verify.mjs \
  deobfuscation/castle.umd-Cs-TYKFF.deobfuscated.js \
  ../castle.umd-Cs-TYKFF.js
```

`deobfuscate.mjs` renames *bindings* (not raw text), so it is **scope-aware**:
shadowing locals of the same name are left alone. Each renamed binding gets a
`// nice -> ugly` comment at its **declaration site**:

```js
    // location -> rO
    location = `location`,
    // cookie -> KD
    cookie = `cookie`,
```

The comment means "the binding `location` (nice) was `rO` (ugly)". Every use of
that binding is renamed bare — the mapping is understood everywhere else.

## How renames are chosen

- **Auto** — every `IDENT = 'string'` constant whose string value is a clean,
  non-colliding identifier renames its binding to that value (`rO` → `location`).
- **Manual** — `manual-rename.json` maps hand-identified bindings
  (`"yU": "stringCache"`, …). The tool finds the binding with that name whose
  def is a declaration (not a shadowed param/local).
- **Structure comments** — `comments.json` keys a comment by `{ name, def }` and
  drops it above the matching function declaration (e.g. `// base64 + UTF-8
  string decoder` above `function t`).

## Files

| file | purpose |
|------|---------|
| `lexer.mjs` | whitespace-preserving JS lexer (every token keeps its exact source slice). |
| `pretty.mjs` | `prettyPrint` — re-indent tokens with merge-safe spacing. |
| `scope.mjs` | binding resolution (byte-offset → binding) via `acorn` + `eslint-scope`. |
| `deobfuscate.mjs` | ugly → nice: scope-aware rename + `// nice -> ugly` comments + pretty-print. |
| `verify.mjs` | nice → ugly: parse comments, reverse-rename, assert the token *text* sequence equals the ugly file's. |
| `manual-rename.json` | hand-identified bindings (ugly → nice). |
| `comments.json` | structure comments keyed by binding. |
| `package.json` | deps (`acorn`, `eslint-scope`) — confined here, out of the Vercel bundle. |
| `*.deobfuscated.js` | the maintained nice artifact (committed). |

## The assertion (`verify.mjs`)

`verify.mjs` tokenizes the nice file, collects every `// nice -> ugly` comment
into a reverse map (two passes, because hoisted `var`s are referenced before
their declaration), reverse-renames, and asserts the resulting token sequence is
**identical** to the ugly file's (same texts, same order). Whitespace is
irrelevant — the ugly file owns its own whitespace. A human edit that breaks the
correspondence fails it and names the first diverging token.

We deliberately do **not** maintain ugly → nice — the nice file is
hand-maintained and the ugly file is fixed.

## Progressive de-obfuscation

`deobfuscate.mjs` covers the plaintext string constants automatically. The
obfuscated strings (the `u(50,…)` / `t('…')` lookups — font list, error
messages) and non-string identifiers are added by hand to `manual-rename.json`
(or directly to the nice file with a `// nice -> ugly` comment), then re-run
`verify.mjs`.

## Caveats

- `prettyPrint` only re-indents and adds merge-safe spacing; it does not
  otherwise reformat, so the nice file still looks fairly dense.
- The scope resolver is a real parser, so shadowing is handled — but `acorn` +
  `eslint-scope` must stay in this directory's `package.json`/`node_modules`,
  not the main Vercel `package.json`.
- Derived views (`*.pretty.js`, `*.reugly.js`, `*.annotated*`, `*.decoded.*`)
  and `node_modules` are gitignored.
