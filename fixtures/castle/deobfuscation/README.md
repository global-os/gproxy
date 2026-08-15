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

`deobfuscate.mjs` renames every `IDENT = 'string'` constant whose string value is
a clean, non-colliding identifier, and puts the correspondence as a comment at
its **first occurrence only**:

```js
    // opr -> e
    opr = `opr`,
    // cookie -> KD
    cookie = `cookie`,
```

The comment means "the identifier `opr` (nice) was `e` (ugly)". After that first
occurrence the name is used bare — the mapping is understood everywhere else.

## Files

| file | purpose |
|------|---------|
| `lexer.mjs` | whitespace-preserving JS lexer (`reemit(tokenize(x)) === x`). |
| `pipeline.mjs` | `prettyPrint` (indent + merge-safe spacing) + `reemit`. |
| `deobfuscate.mjs` | ugly → nice: rename string constants + `// nice -> ugly` comments + pretty-print. |
| `verify.mjs` | nice → ugly: parse comments, reverse-rename, assert the token *text* sequence equals the ugly file's. |
| `*.deobfuscated.js` | the maintained nice artifact (committed). |

## The assertion (`verify.mjs`)

`verify.mjs` tokenizes the nice file, strips the `// nice -> ugly` comments,
reverse-renames, and asserts the resulting token sequence is **identical** to the
ugly file's (same texts, same order). Whitespace is irrelevant — the ugly file
owns its own whitespace — so this is a pure "the nice file is a faithful
de-obfuscation" check. A human edit that breaks the correspondence (renaming
without a comment, dropping a token, …) fails it and names the first diverging
token.

We deliberately do **not** maintain ugly → nice (regenerating the nice file from
the ugly) — the nice file is hand-maintained and the ugly file is fixed.

## Progressive de-obfuscation

`deobfuscate.mjs` covers the *plaintext* string constants automatically. The
obfuscated strings (the `u(50,…)` / `t('…')` lookups — font list, error
messages) and the non-string identifiers can be renamed by hand: edit the nice
file, rename the identifier, and add a `// nice -> ugly` comment at its first
occurrence, then re-run `verify.mjs`. Every such edit is checked against the
shipped chunk.

## Caveats

- The lexer is a lexer, not a parser: it doesn't resolve scopes, so renames are
  global and textual. That's fine for the top-level string table (each minified
  name is unique and used consistently). A scope-aware rename would need a parser.
- `prettyPrint` only re-indents and adds merge-safe spacing (`-` `-` → `- -`,
  `typeof window` → `typeof window`); it does not otherwise reformat, so the nice
  file still looks fairly dense.
- Derived views (`*.pretty.js`, `*.reugly.js`, `*.decoded.*`) are gitignored.
