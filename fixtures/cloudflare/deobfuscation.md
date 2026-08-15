# Cloudflare challenge (`main.js`) de-obfuscation notes

Target: the Cloudflare **managed challenge** platform JS (the "Just a moment …"
proof-of-work / `cf_clearance` interstitial), captured from a Cloudflare
challenge served to the Hetzner datacenter IP (`mainframe-2`, egress
`5.78.77.145`). Build `aae2b9a1c261`, `20639` bytes.

x.com does **not** serve this challenge to any of our IPs (residential or
datacenter, curl or real Chrome) — X's bot gate is Arkose/FunCaptcha at the app
layer. But the challenge platform JS is **generic across every Cloudflare zone**,
so capturing it from Udemy is equivalent to what x.com would serve if it ever
challenged us.

## Capture method

```
# 1. Trigger a challenge from the datacenter IP (curl or real Chrome):
curl -s -D - -A "<chrome UA>" https://www.udemy.com/   # -> 403 + challenge body

# 2. The 403 body is a ~1KB bootstrap that creates a hidden iframe, injects
#    window.__CF$cv$params={r:<ray>,t:<b64ts>}, and loads /cdn-cgi/challenge-platform/scripts/jsd/main.js

# 3. main.js 302-redirects to the real (versioned) script:
#    /cdn-cgi/challenge-platform/h/g/scripts/jsd/aae2b9a1c261/main.js
```

`challenge-bootstrap.html` and `main.js` / `main-chrome.js` are archived here.
`main.js` (21835 B) came from curl; `main-chrome.js` (20639 B) from real Chrome.
They differ from byte ~45 onward — per-challenge-instance data (`_cf_chl_opt`
salt + nonce), same build. Either works as the de-obfuscation target.

## Obfuscation architecture

Not Castle's hand-rolled LCG-XOR cipher — this is a **`javascript-obfuscator`-style**
obfuscation with a couple of custom twists:

1. **String array = one semicolon-delimited plaintext string**, split at runtime:

   ```js
   function f(cp){ return cp=`timeout;RVSsc;addEventListener;…;location;…;parse`.split(`;`), f=()=>cp, f() }
   ```

   All 252 strings are **plaintext in the source** (no base64/XOR at the array
   level) — just concatenated and split on `;`. This is the key win: the whole
   string table is recoverable by splitting one template literal.

2. **Index-offset decoder** `g(l)` = `f()[l-213]` — every string reference is
   `g(213..464)`. The `-213` is the obfuscator's rotate guard; `f()` returns the
   array *after* a startup rotation.

3. **Rotation cipher** run once at boot: `(function(l,c,gw,fv,d,P){…})(f,114224)`
   rotates the array until a `parseInt(…)-arithmetic checksum` of a few entries
   equals `114224`.

4. **Control-flow flattening**: every function body is a `for(;;)` + `switch`
   over a shuffled case order (`"8|13|3|2|…"`.split(`|`)), with the operator map
   `l={gypWF:>, cyxhk:<<, EmJfi:<, sAmlv:<=, eiYIY:+, …}`.

5. **Indirect lookups** `fv(gw.l)` where `fv` is a decoder alias (`g`/`fa`/`fI`/…)
   and `gw={l:245,c:284,…}` is an index map — this is why a naive `g(N)`→string
   regex only resolves ~46 of the ~500 lookups; the rest need constant
   propagation (`resolve-strings.mjs` does it).

## Decoded string table (the meaningful entries)

| string | index | meaning |
|--------|-------|---------|
| `location` / `href` | 227 / 215 | reads `document.location.href` |
| `document` / `d.cookie` | 271 / 309 | reads `document`, `document.cookie` |
| `navigator` / `clientInformation` | 429 / 302 | reads `navigator` (aliases) |
| `contentDocument` / `contentWindow` | 332 / 457 | fresh-iframe window/document |
| `parent` / `postMessage` | 318 / 291 | iframe ↔ parent messaging |
| `iframe` / `createElement` / `appendChild` / `removeChild` | 387/239/329/432 | hidden-iframe sampling |
| `/cdn-cgi/challenge-platform/h/` | 289 | challenge endpoint base |
| `jsd` / `oneshot` / `eb` | 265 / — / — | submit paths (`/jsd/oneshot/…`, `/eb/…/jsd`) |
| `__CF$cv$params` / `_cf_chl_opt` / `_cf_chl_state` | 456/224/374 | challenge params/handshake |
| `XMLHttpRequest` / `send` / `open` / `responseText` | 410/303/395/336 | the oneshot submit (XHR) |
| `charAt`/`charCodeAt`/`fromCharCode`/`imul`/`bigint` | … | the proof-of-work / encoding |
| `[native code]` / `Function` / `getPrototypeOf` | 304/323/413 | anti-tamper (native-fn check) |
| `1\|0\|3\|4\|2` / `8\|13\|3\|…` / … | 280/326/… | control-flow case orders |

The remaining strings (≈120) are obfuscator junk: rotation-check filler
(`257RaulUz`, `1002VJbAHI`, …), the operator-map keys (`gypWF`, `cyxhk`, …),
and the state-machine case orders.

## The challenge's actual logic

### 1. Bootstrap (the 403 body, not `main.js`)

Creates a 1×1 hidden `iframe`, injects `window.__CF$cv$params={r,t}`, and loads
`main.js` in it. `main.js` runs in that **isolated iframe**, not in the page.

### 2. Fresh-iframe fingerprint sampling (the interesting part)

```js
P = e.createElement("iframe"); P.style = display:none; P.tabIndex = -1;
e.body.appendChild(P);
R = P.contentWindow;                       // a *clean* browser window
H = xixz7(R, R,                '', H);     // every prop on contentWindow (+ proto chain)
H = xixz7(R, R.clientInformation||R.navigator, 'n.', H);  // navigator props
H = xixz7(R, P.contentDocument, 'd.', H);  // document props
e.body.removeChild(P);
```

`xixz7` walks the **prototype chain** (`Object.getPrototypeOf` loop collecting
`getOwnPropertyNames`), reads each property value, and classifies it via `J`
into a type code (`o/s/n/I/z/u/x/p/a/D/T/F` + `N` native-function vs `f`
function). So the challenge samples a **fresh browser window's entire
`window`/`navigator`/`document` surface** — that's the bot fingerprint. The
`[native code]` check in `J` is the anti-tamper: a monkey-patched function reads
as `f` (non-native), a real one as `N`.

### 3. The top-level page URL leak

The submitted payload includes `"lhr": e.location && e.location.href ? e.location.href : ""`.
In our proxy, `e` is the **challenge's own iframe document**? No — `e=b["document"]`
is the *page* document (the challenge runs in its iframe but `e` is captured as
`this||self` → the iframe's `self`). Either way the challenge reports the URL it
runs at — which under the proxy is the `{slug}.app.onetrueos.com` host, the same
class of origin leak Castle had via `location.hostname`.

### 4. The proof-of-work / encoding (what the `c` + `payload` are)

A small self-contained coder stack, all inside `main.js`:

- `H()` — **FNV-1a** 32-bit (`2166136261`, `imul(f3,16777619)`).
- `Z()` — xorshift/Wang mix (`x^=x<<13; x^=x>>>17; x^=x<<5`).
- `X()` — UTF-8 encoder.
- `O()` — **base64 with a custom alphabet** `4sfld8jRZW6L0qGn-w5gEKaxMeUzpBhXY1kCr3cIP$QToFum7VND+S9HivOb2AJty`.
- `C()` — XOR stream cipher, keystream = `Z(H(alphabet))` per position.
- `p()` — **DEFLATE compressor** (LZ77 via `Int32Array(8192)` hash + `32768` prev table, Huffman via the classic length/distance tables `P=[3,4,5,…]`, `H=[1,2,3,…]`).
- `f0()` — the whole pipeline: `UTF-8 → (deflate if smaller, flag=1) → prefix [253,1,flag] → XOR(C) → base64(O)`.

So the fingerprint + a hashcash-style nonce is deflated, XOR-obfuscated, and
base64'd into `payload`.

### 5. The submit (oneshot)

```js
Z = "/cdn-cgi/challenge-platform/h/" + _cf_chl_opt.STupN6
  + "/jsd/oneshot/aae2b9a1c261/<0.04746454347771223:1786791917:SI2K…>/" + X.r;
H = new XMLHttpRequest(); H.open("POST", Z); H.timeout = 5000;
H.send(JSON.stringify({ t:F(), lhr:location.href, api:…, c:length, payload:… }));
```

On a valid solve Cloudflare drops `cf_clearance` (bound to the exit IP) and the
challenge reports back to its parent via `b.parent.postMessage({source:"cloudflare-invisible", …}, "*")`.

## Tooling (mirrors the Castle workflow)

### Layer 1 — string decoding (one-way, read-only view)

| file | purpose |
|------|---------|
| `decode-strings.mjs` | extracts + runs the string-array machinery → `strings.json` (`g(l)`→string) |
| `resolve-strings.mjs` | acorn constant-propagation of `fv(gw.l)` lookups → `main-resolved.js` |
| `stringdecode.mjs` | the quick `fa(N)`/`g(N)` regex pass (superseded by the resolver) |
| `strings.json` | the decoded 252-entry string table |
| `main-resolved.js` | pretty-printed, string-resolved view (the greppable artifact) |

```bash
node decode-strings.mjs main-chrome.js strings.json
node resolve-strings.mjs main-chrome.js strings.json main-resolved.js
```

### Layer 2 — reversible rename (`deobfuscation/`, the committed "nice" artifact)

The same scope-aware, token-preserving rename as the Castle tool, but with no
auto-rename (there are no plaintext `IDENT='string'` constants to mine — every
string lives in the split array) and with renames keyed by `{name, at}` (byte
offset) because the obfuscator reuses short names (`C`, `O`, …) across scopes.

```bash
cd deobfuscation
node deobfuscate.mjs ../main-chrome.js          # ugly -> nice (renames + comments)
node verify.mjs main-chrome.deobfuscated.js ../main-chrome.js   # nice -> ugly, token-exact
```

| file | purpose |
|------|---------|
| `lexer.mjs` / `scope.mjs` / `pretty.mjs` | shared lossless lexer / scope resolver / re-indenter (copied from `castle/deobfuscation/`; `lexer.mjs` gained a `>>>=` case) |
| `deobfuscate.mjs` | ugly → nice: manual renames + structure comments, emits `// nice -> ugly` at each declaration |
| `verify.mjs` | nice → ugly: scope-aware reverse-rename (per binding, not per name), assert token sequence == ugly |
| `manual-rename.json` | `{name, at, nice}` — 49 hand-identified bindings |
| `comments.json` | `{name, at, comment}` / `{at, comment}` — 39 structure comments |
| `list-bindings.mjs` / `find-aliases.mjs` | diagnostics: dump bindings, find the decoder aliases |
| `main-chrome.deobfuscated.js` | the maintained "nice" artifact (committed) |

`verify.mjs` is the answer to "does the nice file uglify back to the original":
it reverse-renames **per binding** (each `// nice -> ugly` comment sits at its
binding's declaration) and asserts the token *text* sequence is byte-identical
to `main-chrome.js` (11449 tokens). A human edit that renames without a comment,
or drops a token, fails it.

### What is deliberately left un-renamed

The ~48 **decoder aliases** (`fI`, `fQ`, `fz`, `fx`, `gl`, … — every function's
local `X = fa`/`X = g` alias of the string decoder) and the **index/operator
maps** (`gw={l:245,…}`, `l={gypWF:…}`) stay as the obfuscator's short names.
They *can't* be collapsed to one name: the aliases form closures (`fa` → `fI` →
`fz`), and renaming two levels of a chain to the same name introduces shadowing
(`fI = fa` becomes `decoder = decoder`, so the inner `fa` reference resolves to
`fI` instead of `fa`). The scope-aware `verify.mjs` catches exactly this — the
round-trip fails rather than silently accepting a scope-breaking rename. For the
fully-inlined view use `main-resolved.js` (Layer 1).

## Key finding for the proxy effort

The managed challenge's fingerprint is **not** the page — it creates a **fresh
isolated iframe and samples *that* window's** `window`/`navigator`/`document`
property surface (with a `[native code]` check to catch monkey-patching). The
only thing it reads from the *host* context is `document.location.href`, which
is the same origin leak class as Castle's `location.hostname` — under the proxy
it reports the `{slug}.app.onetrueos.com` subdomain rather than `x.com`.
