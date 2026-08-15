# Castle de-obfuscation workflow

Reversibly de-obfuscate the Castle SDK chunk (`castle.umd-*.js`) so the proxy
patch targets can be *proven* to stay in sync with the shipped, obfuscated
source.

## The core idea

Obfuscation here is just **symbol minification + string encoding**. We don't
need a full de-obfuscator — we need a *reversible* transform plus a way to
annotate what each minified symbol means. The whole thing rests on one
invariant:

> re-joining the original tokens reproduces the original file **byte-for-byte**.

Because the lexer records exact token text *and* the exact whitespace before
each token, "re-obfuscating" is literally re-concatenating those slices. Any
edit we layer on top (annotation comments, later renames) is provably
undoable — and the tools assert that on every run.

## Files

| file | purpose |
|------|---------|
| `lexer.mjs` | whitespace-preserving JS lexer. `reemit(tokenize(x)) === x`. |
| `pipeline.mjs` | pretty-print + re-uglify + assertion (the round-trip proof). |
| `annotate.mjs` | insert `// 'value' -> symbol` comments at each string-constant definition; strip them back to the original. |

## Workflow

From `fixtures/castle/`:

```bash
# 1. Prove the lexer is lossless and generate readable views
node deobfuscation/pipeline.mjs castle.umd-Cs-TYKFF.js

# 2. Annotate every `IDENT = 'string'` assignment with its correspondence
node deobfuscation/annotate.mjs castle.umd-Cs-TYKFF.js
```

Each step emits derived files next to the input:

- `*.pretty.js` — tokens re-indented (readable; token text untouched).
- `*.reugly.js` — tokens re-joined with their original whitespace; asserted
  byte-equal to the input.
- `*.annotated.js` — the source with `// 'string' -> symbol` comments inserted
  above each string-constant assignment, original whitespace otherwise intact.
- `*.annotated.pretty.js` — the annotated source, re-indented for reading.

The annotated output looks like:

```js
    // `location` -> rO
    rO=`location`,
    // `hostname` -> iO
    iO=`hostname`,
```

## The correspondence is the comments, not a side file

`annotate.mjs` treats the comments themselves as the map: a comment
`// 'value' -> symbol` directly above `symbol = 'value'` is the whole
correspondence, colocated with its definition. No separate `rename-map.json`
to drift out of sync.

The comment "carries" the identifier's original leading whitespace, so
stripping it (and handing that whitespace back) is lossless. The strip-and-
re-emit assertion is the contract: if the annotated file ever stops round-
tripping, you know it drifted from the shipped chunk.

## Progressive de-obfuscation

The `annotate` pass covers every *plaintext* string-constant assignment
automatically. The remaining obfuscated strings — the `u(50,182,8,…)` /
`t('…')` lookups decoded separately (see `../deobfuscation.md`) — can be added
as hand-written annotations of the same shape later, once their values are
decoded. Each addition is verified by the same round-trip.

## Caveats

- The lexer is intentionally not a parser: it doesn't resolve scopes, so a
  rename is *global and textual*. That's fine for the string-constant table
  (top-level, uniquely named), but a future scope-aware rename would need a
  parser (or a collision check like the one the earlier map-based tool had).
- `annotate.mjs` matches `IDENT = <string literal>`; it does not annotate
  `IDENT = u(...)` (obfuscated) or numeric constants. Those are hand-added.
- Generated `*.pretty.js` / `*.reugly.js` / `*.annotated*.js` files are
  derived and gitignored; regenerate them from the source + tools.
