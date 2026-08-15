# Castle SDK de-obfuscation notes

Target: **`castle.umd-Cs-TYKFF.js`** (the *currently-served* chunk, confirmed from the
latest proxy HAR — `abs.twimg.com/x-web/x-web/assets/castle.umd-Cs-TYKFF.js`).
647451 bytes. `CASTLE_BUILD_VERSIONS` entry `anonymous-try-return-v2`,
`@castleio/castle-js@2.8.3`.

The other archived chunk (`castle.umd-BXTZcB1z.js`) differs from this one but is the
same SDK version; only `Cs-TYKFF` is currently served.

## Key finding: most string literals are NOT obfuscated

Despite the AGENTS.md note that "string literals are never served in plaintext", the
bulk of the string table in this build is a plain list of minified variable
assignments (~offset 303750), e.g.:

```js
rO=`location`, iO=`hostname`, aO=`replace`, oO=`.`, sO=`filter`,
SO=`protocol`,  dD=`DateTimeFormat`, fD=`resolvedOptions`,
OD=`navigator`, kD=`userAgentData`, AD=`getHighEntropyValues`,
GD=`document`, KD=`cookie`, YD=`screen`, XD=`devicePixelRatio`,
ZD=`userAgent`, QD=`brave`, $D=`getPrototypeOf`, tO=`isBrave`,
ek=`getContext`, pk=`font`, vk=`textBaseline`, bk=`fillText`,
Ak=`getParameter`, jk=`getExtension`, ...
```

Only a *minority* of strings go through the two cipher layers below. So the property
names Castle fingerprints with are directly greppable in the minified source.

## Obfuscation architecture (two layers)

### Layer 1 — the LCG-XOR string program (a tiny VM)

Two `atob` blobs decoded into UTF-16 code-unit arrays (the decode program and its
key material):

| array | seed | code units | role |
|-------|------|-----------|------|
| `qV` | 28135 | 16 | key material |
| `JV` | 29614 | 1240 | the decode "program" (opcode/operand/shift triplets) |

Decoder (`function ee` / `ne`): `atob(blob)` → for each byte pair, treat as UTF-16BE
code unit, XOR with a rolling LCG (`state = (40503*state + 13849) & 65535`).

String reconstructor `function re(e,t,n,r,i,a,o,ee)` consumes `JV` triplets
`[opcode, operand, shift]`; opcodes 0–4 are `xor / add / sub / rol / ror` applied to
each 16-bit unit. `function ie(e)` drives it over an encoded string. `function s(e,t,n,r)`
is the memoized dispatcher (`yU`/`vU`/`u(...)`); `ae(...)` is its public memo wrapper.

### Layer 2 — per-string `t(base64)` blobs

`vU=[t('w48BH8OOwqE/PA=='), t('...'), 'LFQZ((', ...]` — a large array of `t(base64)`
calls interleaved with plaintext. `t` is a simpler per-string decoder (not yet fully
reversed — only needed if we need the obfuscated minority, e.g. the font list).

## Domain / location reads (the reason for all this)

All reads use `window[rO]` = `window['location']`, `rO='location'`.

| # | what it reads | minified site | bytes | leak? |
|---|---------------|---------------|-------|-------|
| 1 | `window.location.hostname` | `r[0]=f2[D]\|\|window[rO][iO]\|\|Fv` then `.replace(/^\.+/,'')` + label walk | ~43383 | **proxy subdomain** |
| 2 | `window.location.ancestorOrigins` | `var n=window[rO].ancestorOrigins` (fn `si`) | ~74200 | **iframe parent origin** (empty ⇒ not in iframe) |
| 3 | `window.location.origin` | `sa(function(e){return e.origin})` (fn `vJ`) | ~415191 | proxy origin |
| 4 | `window.location.protocol` | `sa(function(e){return e[SO]})` with `SO='protocol'` (fn `YY`) | ~415191 | `https:` — no leak |
| 5 | `document.referrer` | `_i(function(e){return e.referrer})` (fn `jW`) | ~415191 | already shimmed to `x.com/` |

Helpers:

- `function sa(e)`: `e(window['location'])` guarded to return only if the result is a
  string — the generic "read a location prop" helper (`e.origin`, `e.protocol`).
- `function si()`: returns the list of `ancestorOrigins` strings. In a real top-level
  tab this is `[]`; inside our cross-origin iframe it is `['https://app.app.onetrueos.com']`
  (the workspace shell origin). This is Castle's iframe detector.
- `function _i(e)`: the same pattern against `document` (`document.referrer`).

`location.hostname` (read #1) is fed into a label walk that splits on `.` and
re-processes subdomains — so the value Castle fingerprints is the proxy slug host,
not `x.com`.

## Patch strategy (implemented in `proxy.ts` → `CASTLE_BUILD_VERSIONS`)

`window.location` is non-configurable in real Chrome (verified: `defineProperty`
throws "Cannot redefine property: location" on `window`, `document`, and the instance
props `hostname`/`origin`), and so are `window.top`/`window.parent`/`window.self`.
So there is no global shim — the only option is to rewrite the read sites *inside*
the Castle bundle, via `instrumentCastleBuild` (shape-matched, registered in
`CASTLE_BUILD_VERSIONS`), replacing:

- `window[rO][iO]` → `'x.com'` (bound domain) — hostname
- `window[rO].ancestorOrigins` → `[]` (hide the iframe)
- `sa(function(e){return e.origin})` result → `'https://x.com'`
- `window[KF][rO][qF]` → `'https://x.com/'` (top.location.href; throws cross-origin
  in the iframe, so replace it to make the `Aq` check report top-level)
- `window.self===window[KF]` → `true` (self===top, the `lZ` top-level check)

## Parent-window reads (the "mocking parent" set)

Searched the chunk for every parent/top/opener/frame access. Result: Castle reads
`window.top` (`KF='top'`) and `window.self`, but **not** `window.parent`,
`window.opener`, `window.frameElement`, or `window.frames`. The `parent` hits in the
string table are DOM traversal names (`parentNode`, `parentElement`), not the window.

| read | minified site | in real tab | in our iframe |
|------|---------------|-------------|---------------|
| `window.top.location.href` | `(window[KF][rO][qF], xn(!0))` in `Aq` ~378588 | reads fine → `xn(!0)` | **throws** → `xn(cw)` |
| `window.self === window.top` | `window.self===window[KF]` in `lZ` ~445089 | `true` | `false` |
| `window.location.ancestorOrigins` | `window[rO].ancestorOrigins` in `si` ~74200 | `[]` | `['https://app.app.onetrueos.com']` |

All three are patched (ancestorOrigins in the location section above; the two
`window.top` reads here).

The `window[rO][iO]` / `window[rO].ancestorOrigins` / `window[KF]…` shapes are stable
and greppable, so the replacement is a literal-substitution on those token sequences,
keyed to the `anonymous-try-return-v2` build. Each patch is whitespace-tolerant and
logs loudly if it matches nothing, so a minifier rename can't fail silently.
