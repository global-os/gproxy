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

**Confirmed cross-engine**, via the on-page debug overlay's first real catch, live on the
deployed instance in Firefox (`Gecko/20100101 Firefox/152.0`, cross-origin
iframe, `sharedArrayBufferAvailable: false`): identical crash site,
`P_PlayerThink`, same call chain down through `TryRunTics`/`D_RunFrame`/
Asyncify's `dynCall_v` → `wrapper` → `doRewind`/`handleSleep` machinery.
Timing: boot logs show `Running emscripten_set_main_loop()` at `10:51:13.200Z`,
crash (`Exception thrown, see JavaScript console`) at `10:51:18.164Z` — right
around 5s in, consistent with the title screen's automatic demo playback
kicking off a real simulated player via `P_PlayerThink`.

This rules out "browser/engine quirk" — Firefox's SpiderMonkey and Chrome's
V8 hitting the *exact same crash site* means this is almost certainly a real
out-of-bounds access in the compiled game code itself, not something
specific to one WASM implementation's timing or JIT behavior.

**Reconfirmed a third time**, same instance, same site (`P_PlayerThink`,
called from the `MainLoop_runner`/`iterFunc` scheduler this time rather than
directly off `dynCall_v` — same simulation code, just caught mid-tic via a
different Asyncify entry point), same ~5s-after-`emscripten_set_main_loop()`
timing. Consistent enough now to stop treating this as a fluke; the open
question is still *which* struct/field access in `player_t`/`mobj_t` is
unaligned or out of bounds, not *whether* one exists.

This happened ~100ms after boot (`P_PlayerThink` runs every game tic — the
title screen's automatic demo playback drives a live player object through
the real simulation, same as actual gameplay) — consistent with reports of
it happening "immediately," not requiring any menu navigation or actual play.

### Tested and ruled out: demo-sequence/gameversion mismatch

Freedoom Phase 1 is a "retail"-mode WAD, and Chocolate Doom's version
detection unconditionally treats any retail-mode WAD as `exe_ultimate`
(`d_main.c` ~987, no override for Freedoom specifically at that point).
"Ultimate Doom" mode extends the title-screen demo cycle from 6 states to 7
(`d_main.c:504`, `% 7` vs `% 6`), adding a `demo4` lump playback — and the
source's own comments describe exactly this failure class for a different
IWAD: "Final Doom was based on Ultimate, so also includes this change;
however, the Final Doom IWADs do not include a DEMO4 lump, so the game
bombs out." Freedoom seemed like a good candidate for the same problem.

**Tested by adding `-warp 1 1 -skill 3` to `commonArgs`** in `index.html` —
jumps straight into a map, skipping the title screen and the entire demo
sequence (`D_DoAdvanceDemo`) that would ever touch a demo lump. **Crash
still happened**, same site (`P_PlayerThink`, same stack), with no demo
playback involved at all and no human input yet (headless, freshly
spawned). This cleanly rules out demo-lump-format mismatch as the cause —
the bug is in ordinary per-tic player simulation itself, not anything
demo-specific. If anything this makes it a *more* promising target now:
it should reproduce on every real play session, not just idle-timeout demo
playback, which makes the SAFE_HEAP-reenable-and-catch-it approach (see
Next steps) more tractable than when it seemed demo-only.

The `-warp` args are currently still in `index.html` even though they
didn't fix anything — worth deciding whether to keep skipping the title
screen as a UX choice on its own merits, or revert now that it's not
serving a diagnostic purpose.

**Reconfirmed a fourth time**, first occurrence caught in real Chrome rather
than Firefox (`Chrome/150.0.0.0`, still `inIframe: true`) — same exact
site and call stack (`P_PlayerThink` → `P_Ticker` → ... → `dynCall_v` →
`wrapper` → `iterFunc` → `callUserCallback`), same timing pattern (boot at
`12:27:15`, `Running...`/game-start print around `12:27:31`, crash shortly
after). Two Firefox + two Chrome occurrences now, all identical — about as
thoroughly cross-engine-confirmed as this gets without a deterministic
repro.

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
