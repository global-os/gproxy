# Custom Chromium build for correct Sec-Fetch-* headers

## Status (2026-08-06)

Phase 2's patch is written, in `chromium-fork` (uncommitted as of this
writing — see repo). Phase 1 (the root-cause gate below) has **not** been
done — a conscious decision to proceed to Phase 2 anyway, not an oversight,
made when this was last discussed. The risk that gate exists to catch (a
self-built Chromium may get detected/blocked regardless of `Sec-Fetch-*`
correctness, for the same reason stock Chromium already does) is therefore
still fully live and unverified.

What exists so far:
- **`chromium-fork`** (`services/network/public/cpp/features.{h,cc}`,
  `sec_header_helpers.cc`, `sec_header_helpers_unittest.cc`): a new
  `PreserveOverriddenSecFetchHeaders` feature (off by default) that makes
  `SetSecFetchSiteHeader`/`Mode`/`User`/`Dest` skip recomputing a header
  that's already present on the request, so a CDP `Fetch.continueRequest`
  override survives. Not yet built (no compiler available in this checkout
  to verify it compiles) or committed.
- **`gproxy`**: `proxy.ts`'s `computeSecFetchHeaders()` now computes real
  `Sec-Fetch-Site`/`-Mode`/`-Dest`/`-User` values instead of dropping them
  (effective immediately for the non-sidecar undici/direct-fetch path,
  since only a real browser process recomputes/clobbers these — the sidecar
  path needs the patched Chromium below to actually benefit).
  `sidecar/server.mjs` already passes
  `--enable-features=PreserveOverriddenSecFetchHeaders` at launch, but it's
  inert: the sidecar still launches stock `channel: 'chrome'`, not a
  patched binary.

What's still outstanding, in order: Phase 1's root-cause investigation
(retroactively, since it was skipped), confirming the Phase 2 patch actually
compiles and passes its new unit tests against a real Chromium build,
Phase 3's CI build pipeline producing a deployable binary, and switching the
sidecar from `channel: 'chrome'` to `executablePath` pointing at that
binary. None of this has any effect in production yet.

## Background

The sidecar (`sidecar/`) drives real Google Chrome via Patchright/CDP to get a
genuine JA3/JA4 TLS fingerprint past Cloudflare Bot Management. `Fetch.continueRequest`
lets it override `Origin`/`Referer`/`Cookie` on outbound requests (working around
the fact that page JS can't set these "forbidden" headers directly) — see
`SETUP_SIDECAR.md` § "The CDP header-spoofing wrinkle".

That override does **not** stick for `Sec-Fetch-*` headers. Chrome recomputes
`Sec-Fetch-Site` / `Sec-Fetch-Mode` / `Sec-Fetch-Dest` internally from real
request context (the fact that the request originates from a cross-origin
iframe) *after* CDP applies its overrides, clobbering them back to values that
reveal the proxy context.

A local MITM proxy (`sidecar/mitm-proxy.mjs`, `http-mitm-proxy`) used to patch
`Sec-Fetch-*` a second time, downstream of Chrome. Doing that required fully
terminating Chrome's TLS connection and re-establishing a new one from Node's
own TLS stack to upstream — which put a Node/OpenSSL JA3/JA4 fingerprint on
the one connection this whole architecture exists to keep Chrome-flavored.

The MITM proxy was removed after empirical A/B testing: an unmodified Chrome
session through the same upstream IP, no MITM at all, passed an X login flow
that failed every time through the MITM'd pipeline. Current state accepts
wrong `Sec-Fetch-Site` as the smaller cost, in exchange for keeping the real
TLS handshake intact end-to-end (`sidecar/server.mjs`'s `proxyLaunchOption()`
+ `proxy-chain`, no termination).

## Goal

Eliminate the `Sec-Fetch-*` inaccuracy **without** reintroducing a
TLS-terminating layer. `Sec-Fetch-*` is computed in Chromium's C++ network
stack before the TLS handshake, so a patch there could apply the corrected
values pre-handshake — no MITM needed.

This requires building a patched Chromium from source and pointing Patchright
at that binary (`executablePath`) instead of launching a stock Chrome/Chromium
release.

## The blocking risk

Real Chrome was required for a reason established during the original sidecar
rewrite (`SETUP_SIDECAR.md` § "Why real Chrome, not TLS impersonation"):

| Browser | Mode | Result |
|---|---|---|
| Real Google Chrome | headed | pass |
| Real Google Chrome | headless, "Headless" stripped from UA | pass |
| Playwright's bundled Chromium | headed or headless, any UA | **blocked** |

Leading suspects for *why* Chromium fails: Widevine CDM presence, and/or
`navigator.userAgentData` brand list. Never confirmed further — WebGL
renderer, `userAgentData.brands`, plugins, and codec support were all
identical between the passing headed run and the failing headless run, which
only ruled out GPU/rendering fingerprinting as the mechanism.

This matters because **Widevine CDM is a proprietary, closed-source Google
component** shipped only with Chrome, not buildable from the open-source
Chromium tree. A self-built patched Chromium — however correct its
`Sec-Fetch-*` logic — would, by the same detection logic, likely present as
"Chromium" again and reopen the exact block this architecture was built to
avoid. If Widevine CDM is the real signal, this whole plan may be a dead end
short of bundling that proprietary component into a self-built binary
(unclear if that's even licensable for our use).

**This has to be resolved before any build investment**, not after.

## Plan

### Phase 1 — root-cause the Chromium-vs-Chrome detection gap

Don't start building anything until this is answered. Using the existing
local dev setup (`sidecar/`, `node server.mjs`) as a testbed:

1. Take stock (unpatched) open-source Chromium and confirm it still gets
   blocked in the current environment (sanity check the old finding still
   holds — site detection logic changes over time).
2. Test isolating the two hypotheses independently:
   - Launch stock Chromium with `navigator.userAgentData.brands` overridden
     (via CDP `Emulation.setUserAgentOverride` with `userAgentMetadata`, or a
     preload script) to report as Chrome, Widevine absent. If this alone
     passes → brands is the real signal, Widevine is a red herring, proceed
     to Phase 2 with confidence.
   - Launch stock Chromium with Widevine CDM available if at all possible
     (e.g. copying the CDM component from a real Chrome install into the
     Chromium user-data-dir/component path, if Chromium's component updater
     will load it) with brands left as Chromium's real values. If this alone
     passes → Widevine presence is the real signal, brands is a red herring.
   - If neither individually fixes it, both are contributing, or the real
     signal is something else entirely (revisit — don't assume the original
     two suspects are exhaustive).
3. Document result in `SETUP_SIDECAR.md`, replacing the current "not
   confirmed further" caveat.

**Decision gate:** if Widevine CDM presence turns out to be necessary and it
can't legally/technically be bundled into a self-built Chromium, stop here.
Current MITM-removed state (wrong `Sec-Fetch-Site`, correct TLS fingerprint)
remains the best available tradeoff, and this proposal is closed as
not-viable.

### Phase 2 — patch and build (only if Phase 1 clears the gate)

1. Identify the exact source location computing `Sec-Fetch-*` in Chromium's
   `//services/network` (or wherever it lands in the current version) and
   scope the minimal patch: skip cross-origin-iframe-context computation for
   our specific CDP-driven request path, or accept an override supplied via
   a new CDP command / launch flag instead of hardcoding a value (a real CDP
   patch is more maintainable across Chrome version bumps than a hardcoded
   spoof).
2. Get a from-source Chromium build working locally for the target platform
   (`linux/amd64`, matching `mainframe-2` — same constraint as the existing
   sidecar image, see `SETUP_SIDECAR.md` § Deployment). Expect this to be a
   substantial time/resource cost (multi-hour builds, tens of GB of source +
   build artifacts) — size the CI runner accordingly before committing to
   automating it.
3. Confirm Patchright can launch the patched binary via `executablePath` and
   that Patchright's own stealth patches (automation-signal suppression)
   still apply correctly against a custom build rather than its expected
   bundled/channel Chromium.
4. Re-run the full pass/fail test matrix from Phase 1's sanity check against
   the patched build to confirm nothing else regressed.

### Phase 3 — build pipeline and version tracking

Only relevant if Phase 2 succeeds and this becomes a real dependency:

1. A from-source Chromium build needs its own CI job — much heavier than the
   existing `.gitea/workflows/sidecar-build.yml` container build. Likely a
   separate workflow, likely not run on every push (probably pinned/manual,
   rebuilt when tracking a new upstream Chrome version).
2. Needs a process for tracking upstream Chrome security releases and
   re-applying the patch on top of new versions — a real ongoing maintenance
   cost, not a one-time build. Decide who owns this and how often.
3. Output artifact (the patched binary) needs to ship inside the existing
   `proxy-sidecar` container image, or as a separate pinned artifact the
   image pulls at build time — decide which, consistent with the existing
   "no local podman build on the host, no vendored copy in `petersweb-infra`"
   constraint (`SETUP_SIDECAR.md` § Deployment).

## Open questions

- Is bundling Widevine CDM into a self-built Chromium even licensable for
  this use case, if Phase 1 shows it's required? (Needs a real answer, not
  an assumption, before Phase 2 starts down that branch.)
- How often does the target site's detection logic change in ways that would
  invalidate Phase 1's findings? If it's frequent, the root-cause work may
  need to be periodically re-validated regardless of which path we take.
- Is the `Sec-Fetch-Site` inaccuracy actually causing any observed detection
  failures today, or is it a theoretical correctness gap? Worth checking
  current production logs/behavior before investing in Phases 2–3 — if
  nothing is currently failing because of it, this whole proposal may not be
  worth the build/maintenance cost regardless of Phase 1's outcome.

## Non-goals

- Not reintroducing any form of TLS termination/MITM — that regression is
  the entire reason this path is being considered instead.
- Not attempting to keep pace with every upstream Chrome release if the
  maintenance burden proves unsustainable — better to fall back to the
  current accepted tradeoff than to run a stale, unpatched, or broken custom
  build in production.
