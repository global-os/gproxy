# Add Widevine CDM to the sidecar's Chromium

## Status (2026-08-17)

Proposal only — nothing implemented. Written after reading CloakBrowser's
`chromium-stealth-builds` handling (`bin/fetch-widevine.py`,
`cloakbrowser/widevine.py`), which is the reference implementation for exactly
this problem.

## Background

The sidecar drives Chrome via Patchright/CDP so outbound fetches carry a genuine
Chrome JA3/JA4 TLS fingerprint (see `SETUP_SIDECAR.md` and
`PROPOSALS/custom-chromium-build.md`). That proposal identified a live,
unverified risk: a **self-built** Chromium may get detected regardless of header
correctness. Its two "leading suspects" were **Widevine CDM presence** and
**`navigator.userAgentData.brands`** — neither confirmed, both unaddressed.

The current `chromium-fork` build (`out/Default/args.gn`) is only:

```
is_debug = false
is_component_build = true
symbol_level = 0
use_remoteexec = false
```

`enable_widevine` is not set, and for a non-branded Chromium it **defaults to
false** — so the fork compiles out the Widevine integration entirely. Even a
sideloaded CDM would not load.

CloakBrowser's binary is instead "built with Widevine support"
(`enable_widevine = true`) and ships **no CDM** — the CDM is a proprietary Google
binary they can't redistribute, so they pull it from Google's own component-update
server at runtime and point Chromium at it via a hint file. This proposal copies
that approach for the fork.

## Goal

Give the fork's Chromium a working Widevine CDM so `navigator.requestMediaKeySystemAccess('com.widevine.alpha')`
resolves like real Chrome, eliminating Widevine presence as a fingerprint
difference between the fork and stock Chrome. This is scoped to the fork route —
stock `channel: 'chrome'` already ships Widevine, and using it instead of the
fork is the simpler alternative considered below.

## The mechanism (how Chromium finds a sideloaded CDM)

Chromium discovers a sideloaded CDM in two phases:

1. **Early-startup pass** — reads a hint file
   `<user-data-dir>/WidevineCdm/latest-component-updated-widevine-cdm` whose
   content is `{"Path": "<absolute CDM dir>"}`; if present, loads the CDM
   immediately.
2. **Async component-updater pass** — later in the same launch, discovers a
   CDM sitting in a `WidevineCdm/` directory and *writes* that hint file for next
   time.

On a fresh profile this produces a **two-launch dance**: launch 1 has no hint
(no Widevine), the updater writes the hint, launch 2 reads it (Widevine works).
Patchright/Playwright passes `--disable-component-update`, so the async pass
never runs and the dance never completes on its own.

The fix (CloakBrowser's) is to **skip the dance** by writing the hint file before
launch. That requires a **persistent** user-data-dir — but it does **not** break
the sidecar's per-request isolation, because that isolation is at the *context*
level (`browser.newContext()`), which stays isolated even under a persistent
browser profile.

## Approach (three parts)

### Part 1 — build flag (chromium-fork, Gitea CI)

Add `enable_widevine = true` to the `args.gn` the CI writes before `gn gen`, and
rebuild the artifact (`{sha}.tar.gz` → MinIO `chromium-builds`).

**Open question:** does `enable_widevine = true` in a non-branded build actually
load a sideloaded CDM, or does it also require `is_chrome_branded = true`?
CloakBrowser does it (their binary is non-branded and reports `Chrome/146` via a
patched UA), so it should work — but verify against the real build before
counting on it.

### Part 2 — CDM fetch (sidecar, Node)

Port `bin/fetch-widevine.py` to a Node module (`sidecar/fetch-widevine.mjs`),
run once at sidecar startup (or baked into the image):

1. Query `https://update.googleapis.com/service/update2/json` with app id
   `oimompecagnajdejgnnjijobebaeigek`, `version=1.4.9.1088` (deliberately low so
   the server always reports an update), `acceptformat=crx3`, `arch=x64`,
   `os=linux`.
2. Download the CRX3 blob; verify against the server-provided SHA-256 over TLS,
   and (when `crypto` is available) the CRX3 RSA publisher signature bound to the
   Widevine app id — same trust root Chrome's updater uses. Refuse to install if
   neither check is possible.
3. Extract `manifest.json` and `_platform_specific/linux_x64/libwidevinecdm.so`
   into a cache dir (e.g. `/data/widevine-cdm`).

**Linux x64 only** — Google publishes the Linux CDM for x86-64 only; the sidecar
runs on Hetzner x86-64, so this is fine, but it must fail loudly on ARM64.

### Part 3 — hint seed + persistent profile (sidecar)

1. Before browser launch, write the hint file into the persistent profile:
   `/data/chrome-profile/WidevineCdm/latest-component-updated-widevine-cdm`
   = `{"Path":"/data/widevine-cdm"}` (compact separators, absolute path).
2. Switch the sidecar's browser launch from `chromium.launch()` to
   `chromium.launchPersistentContext('/data/chrome-profile', { … })`, then
   `browsers[0] = ctx.browser()`.
3. Leave the rest unchanged: `acquireContext()` and `solveCloudflareChallenge`
   keep calling `browsers[0].newContext()` — fresh isolated contexts that inherit
   the browser-level Widevine.

`chromium-artifact.mjs` (which downloads the fork binary) is unchanged; the
persistent profile is orthogonal to the binary.

## Steps, in order

1. `chromium-fork`: add `enable_widevine = true` to CI `args.gn`; build; push the
   artifact to MinIO; bump `CHROMIUM_ARTIFACT_SHA` in `petersweb-infra`.
2. Verify the fork actually loads the CDM (Part 1 open question) — a small
   `page.evaluate(() => navigator.requestMediaKeySystemAccess('com.widevine.alpha'))`
   check on the running sidecar.
3. `sidecar`: add `fetch-widevine.mjs` (Part 2) + hint seeding + `launchPersistentContext`
   (Part 3); run the fetch at startup, guarded so a fetch failure degrades to
   "no Widevine" rather than blocking launch.
4. Confirm the isolation is intact: `solveCloudflareChallenge`'s `cf_clearance`
   must not appear in any `chromeFetch` cookie jar, and vice-versa.

## Risks / open questions

- **Widevine is one of two unconfirmed suspects** — `navigator.userAgentData.brands`
  is the other, and neither was ever proven to be the blocker (see
  `custom-chromium-build.md`'s Phase 1 gate, still undone). This may fix nothing
  if the real cause is brands or the fork's TLS fingerprint (which this does not
  touch).
- **`enable_widevine` in a non-branded build** — must be verified (Part 1).
- **Persistent profile state** — the profile now persists on disk; the default
  context's cookies/storage must never be used (everything goes through
  `newContext()`), and the dir should be cleaned/treated as scratch.
- **CDM provenance** — we're installing a native `.so` fetched from Google's
  server at runtime; the signature check is load-bearing and must not be skipped.

## Decision points

- **Fork + Widevine** (this proposal) vs **stock `channel: 'chrome'`** — stock
  Chrome already has Widevine, correct brands, and the correct TLS, at the cost
  of giving up the `PreserveOverriddenSecFetchHeaders` patch (which the notes
  already rank as "the smaller cost"). If Widevine is the real blocker, stock
  Chrome may be the cheaper path than this entire proposal.
- **CloakBrowser wholesale** — a fuller stealth build (71 patches incl. TLS), but
  license-gated (Pro key), and its goal (diverse per-seed fingerprints) is a
  different problem than "indistinguishable from one real Chrome".
