# Doom `.gapp` — build lifecycle bug (open)

`doom.gapp` (`fixtures/by-user/*/~/Desktop/doom.gapp/`) runs [Chocolate Doom
compiled to WASM via Emscripten](https://github.com/cloudflare/doom-wasm),
using [Freedoom](https://freedoom.github.io/) (Phase 1) as the IWAD instead of
id Software's shareware WAD, to avoid any licensing ambiguity. Static app, no
kernel/syscall integration — just `index.html` + `websockets-doom.js` +
`websockets-doom.wasm` + `doom1.wad` (Freedoom, renamed) + `default.cfg`.

## Current status: intermittent WASM runtime crash, not yet root-caused

Symptom, as first reported live against the deployed instance:

```
Uncaught RuntimeError: index out of bounds
    wrapper websockets-doom.js:8345
    iterFunc websockets-doom.js:7613
```

Reproduced directly (headless Patchright, local static file server) with a
fuller trace:

```
RuntimeError: memory access out of bounds
    at websockets-doom.wasm.P_PlayerThink
    at websockets-doom.wasm.P_Ticker
    at websockets-doom.wasm.G_Ticker
    at websockets-doom.wasm.RunTic
    at websockets-doom.wasm.TryRunTics
    at websockets-doom.wasm.D_RunFrame
    at websockets-doom.wasm.dynCall_v
    at wrapper (websockets-doom.js:8345)
    at iterFunc (websockets-doom.js:7613)
    at callUserCallback (websockets-doom.js:3745)
```

This happened ~100ms after boot (`P_PlayerThink` runs every game tic — the
title screen's automatic demo playback drives a live player object through
the real simulation, same as actual gameplay) — consistent with reports of
it happening "immediately," not requiring any menu navigation or actual play.

**It is not reliably reproducible.** Many identical-looking runs complete
fine; one run (with debug logging added, which changes per-frame JS timing
slightly) crashed within the first tic. This smells like a genuine,
timing-sensitive memory-safety bug in the compiled WASM, not an environment
or serving issue — see below for why.

### Leading hypothesis: this is the same root cause as the SAFE_HEAP fix, just relocated

Earlier in this build, `-s SAFE_HEAP=1` (Emscripten's memory-access
instrumentation) caused a **reliable, 100%-reproducible** abort:

```
Aborted(alignment fault)
    at D_CheckNetGame -> D_DoomMain -> main
```

That was fixed by removing `SAFE_HEAP=1` from `EMFLAGS` in `configure.ac`
(see git history / commit message on the `.wasm` MIME + `image.ts` stream-event
commit for context) — reasoned at the time as "WASM natively allows unaligned
loads/stores, SAFE_HEAP is just being overly strict." That reasoning covers
the *symptom* (an abort) but may have been too quick to dismiss the
*cause* — some 1993-era struct in Chocolate Doom's netgame code really is
being accessed with an alignment/layout assumption that this specific
Emscripten/Clang version's struct packing doesn't honor.

Removing SAFE_HEAP doesn't fix a real unaligned/OOB access — it just stops
Emscripten from **catching and cleanly reporting** it. The access still
happens; without the guard it may silently corrupt adjacent memory instead of
aborting immediately. If the *same underlying issue* (or a sibling instance of
it elsewhere in the codebase, e.g. `player_t` / `mobj_t` in `p_user.c`, which
is exactly what `P_PlayerThink` operates on) exists elsewhere, the corruption
would surface **later and non-deterministically**, wherever the corrupted
memory happens to get read next — which matches exactly what we're seeing:
sometimes it's fine, sometimes `P_PlayerThink` hard-crashes a tic or two after
boot.

**This has not been confirmed** — it's the most likely explanation given the
evidence, not a verified root cause. Re-enabling `SAFE_HEAP=1` (accepting the
`D_CheckNetGame` abort) and instrumenting further from there, or auditing
struct definitions touched by both `D_CheckNetGame` and `P_PlayerThink` for
packing/alignment attributes, would be the way to actually confirm it.

## What's been ruled out

All tested locally against the exact same build; none reproduced the crash
or showed any difference from the working case:

- **Tar/DB round-trip corruption.** Pulled `doom.gapp`'s files back out of
  Postgres through the real pipeline (`collectTree` → `buildTar` →
  `parseTarBytes` → `instance_bundle_file` cache → `readBundleFile`) and
  diffed every file's SHA-256 against the original on disk. Byte-identical
  at every stage, including `websockets-doom.wasm` and `doom1.wad`.
- **Bytes served over the wire.** Hit the real local dev backend directly
  (`curl -H "Host: <slug>.app.onetrueos.com" http://localhost:3000/...`) for
  every file — byte-identical to disk.
- **Wrong `.wasm` MIME type** (`application/octet-stream`, which is what
  production actually served before the `INSTANCE_MIME` fix — forces
  Emscripten's non-streaming `instantiateArrayBuffer` fallback instead of
  `instantiateStreaming`). Reproduced this exact condition with a custom
  local server; ran 30s idle, no crash.
- **Idle demo playback timing.** 60s of passive waiting on the title screen,
  no interaction — no crash, canvas stayed stable.
- **Cross-origin iframe embedding** (parent page on one port, `.gapp` content
  on another, matching the real `{slug}.app.onetrueos.com` vs
  `app.app.onetrueos.com` split) — 24s stable, no crash.
- **The real dev backend's actual serving code**, not just static files —
  loaded through Chrome via `--host-resolver-rules` mapping the real instance
  slug hostname to `localhost:3000`, exercising `ensureInstanceReady`,
  `resolveInstanceBundleFile`, `replaceDomainInHTML`, the works. 30s stable,
  no crash, canvas correctly reached 800×600.
- **`replaceDomainInHTML`'s text transform** on `index.html` — diffed
  before/after, no changes (nothing in our `index.html` matches whatever it
  looks for).

Given all of the above is clean, the crash is very unlikely to be a
GlobalOS-side serving/proxy/caching bug. It's almost certainly inside the
compiled WASM itself, and just hard to hit reliably.

## Debug instrumentation added (this session)

`index.html` now has an on-page debug overlay (`#debug-overlay`), since the
crash isn't reliably reproducible and we don't want to depend on devtools
already being open + scrolled to the right spot when it happens for real:

- `window.addEventListener('error', ...)` and `('unhandledrejection', ...)`
  both populate the overlay with the full error/rejection stack — covers
  both synchronous throws and the `Uncaught (in promise) RuntimeError`
  form seen with the earlier SAFE_HEAP abort.
- Environment info logged on boot: UA, `hardwareConcurrency`, `deviceMemory`,
  whether `WebAssembly.instantiateStreaming` and `SharedArrayBuffer` are
  available, whether it's in an iframe.
- `Module.print` / `Module.printErr` / `Module.setStatus` all feed a
  timestamped in-memory log that gets dumped into the overlay alongside the
  error, giving a timeline of what happened in the seconds before the crash
  (not just the crash itself).

Next time this happens for real, the on-page overlay should have everything
needed to compare against the reproduction above — same stack, same place,
or something new.

## Next steps (not yet done)

- Re-enable `SAFE_HEAP=1` in the local build, reproduce the (reliable)
  `D_CheckNetGame` alignment fault, and look at exactly what struct/field is
  being accessed there — that's the concrete lead most likely to explain
  both crashes as one underlying bug.
- If confirmed, the real fix is almost certainly a struct-packing annotation
  (or removing some pointer-aliasing/union trick the original 1993 code
  relies on) in whatever C file defines the struct in question — not another
  build-flag workaround.
- If it turns out to be two unrelated bugs, `P_PlayerThink`'s crash still
  needs its own investigation from scratch (likely: bisect which parts of
  `player_t` / `mobj_t` it touches around the crash offset, using the WASM
  source map that's already being built with `-gsource-map`).
