# Doom `.gapp` — build lifecycle bug (mitigated, not root-caused)

`doom.gapp` (`fixtures/by-user/*/~/Desktop/doom.gapp/`) runs [Chocolate Doom
compiled to WASM via Emscripten](https://github.com/cloudflare/doom-wasm),
using id Software's actual shareware `DOOM1.WAD` (see licensing note below —
originally Freedoom Phase 1 was used to sidestep licensing questions, swapped
out later specifically to test/rule out a WAD-compatibility theory). Static
app, no kernel/syscall integration — just `index.html` + `websockets-doom.js`
+ `websockets-doom.wasm` + `doom1.wad` + `default.cfg` +
`LICENSE-idsoftware.txt` + `doom-wasm-fixes.patch` (see below).

**Licensing:** the shareware episode has been explicitly freely
redistributable by id Software for 30+ years — same footing that let
Chocolate Doom itself become a legitimate open-source project. `doom1.wad`
here is the genuine v1.9 release (verified by SHA-256/lump-count against the
known-good file), sourced from ibiblio.org's SliTaz package mirror.
`LICENSE-idsoftware.txt` is id's shareware license text; `index.html`'s
footer links to it and credits Chocolate Doom (GPL-2.0) and
cloudflare/doom-wasm.

## Current status: two defensive fixes applied and validated locally; not deployed yet

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

### Exact crash line resolved via source map

The build is deterministic: rebuilding from the exact same `configure.ac`
flags reproduces a byte-identical `websockets-doom.wasm` (verified via
SHA-256 against the deployed fixture file), so a fresh local build's
`.wasm.map` (generated by `-gsource-map`) is trustworthy for resolving the
production crash's coordinates — no need to catch it live again.

Parsed the source map (standard Source Map V3, VLQ-encoded, generated
positions are byte offsets into the `.wasm` file) and looked up the crash
stack's offset directly: `wasm-function[1133]:0x8340f` → exact match at
`doom/p_user.c:267:39`:

```c
if (player->mo->subsector->sector->special)   // p_user.c:267
    P_PlayerInSpecialSector (player);
```

A pointer chase: `player->mo` → `->subsector` → `->sector` → `->special`.
An out-of-bounds trap here (a different category from the earlier
`SAFE_HEAP` *alignment* fault — this is WASM's own linear-memory bounds
check) most likely means `mo->subsector` holds a garbage value that's
later dereferenced.

`thing->subsector` is set in exactly one place, `P_SetThingPosition`
(`p_maputl.c:401-402`):

```c
ss = R_PointInSubsector(thing->x, thing->y);
thing->subsector = ss;
```

`R_PointInSubsector` (`r_main.c:794-816`) walks the level's BSP tree,
returning `&subsectors[nodenum & ~NF_SUBSECTOR]` once it hits a leaf node.
Vanilla Doom's node format encodes child indices as 16-bit values, with the
top bit doing double duty as "this is a subsector, not another node"
(`NF_SUBSECTOR`) — a level complex enough to need more nodes than that
format can address can produce indices that don't mean what this code
assumes, silently yielding a bogus subsector pointer with no crash at the
point of corruption — only later, when something dereferences it (here).

**Tested and ruled out:** swapped Freedoom Phase 1 for id Software's actual
shareware `DOOM1.WAD` (the canonical reference IWAD vanilla/Chocolate Doom
was built and tested against for 30 years — verified via SHA-256/lump-count
against the known v1.9 release, sourced from ibiblio.org's SliTaz package
mirror) specifically to test the BSP-node-overflow theory, since the
shareware WAD's small, simple levels predate any node-builder that could
plausibly exceed vanilla's limits. **The crash reproduced immediately**
(within milliseconds of `D_DoomMain` starting, even faster than prior
Freedoom occurrences) in the very first local test with the new WAD. This
cleanly rules out WAD-specific BSP-node overflow as the cause — the bug is
WAD-independent, reinforcing that it's a genuine bug in the compiled engine
itself (most likely struct-layout/memory-safety, same family as the earlier
`SAFE_HEAP` alignment fault) rather than anything about Freedoom's level
data specifically.

Also added `LICENSE-idsoftware.txt` (id's shareware license text) and a
footer in `index.html` linking to it plus attributing Chocolate Doom
(GPL-2.0) and cloudflare/doom-wasm, now that the actual id Software IWAD is
in use rather than a from a third party.

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

## Defensive fixes applied (`doom-wasm-fixes.patch`)

Two independent occurrences of the *same underlying pattern* — the
player's `mo->subsector` pointer being invalid when dereferenced —
identified and patched, both confirmed via the WASM source map (same
deterministic-rebuild technique as before: fresh local builds from these
exact `configure.ac` flags reproduce a byte-identical `.wasm`, so the source
map is trustworthy without needing to catch a live crash):

1. **`p_user.c:267`**, `P_PlayerThink` — `player->mo->subsector->sector->special`.
   The original, most-observed crash site (4 confirmed production
   occurrences, 2 Firefox + 2 Chrome).
2. **`r_things.c:746`**, `R_DrawPlayerSprites` — `viewplayer->mo->subsector->
   sector->lightlevel`. Found while testing the fix for (1): with that one
   patched, the very next test run crashed here instead — same exact
   `mo->subsector->sector->FIELD` pattern, different call site (renderer
   lighting calc rather than player-think special-sector check).

Both patched the same way: a bounds check (`subsector != NULL && subsector
>= subsectors && subsector < subsectors + numsubsectors`) before the
dereference, falling back to a safe default (skip the special-sector check;
use `extralight` as the light level) instead of trapping. Not a root-cause
fix — the patch comments say so explicitly — but validated to actually
change behavior: OOB traps at these two exact sites do not recur.

**Why not a root-cause fix, and what this rules in/out:** finding the *same
specific field* (the player's own `mo->subsector`) invalid at two unrelated
call sites, closely spaced in time, doesn't look like generic memory
corruption scattered across the engine — it looks like one specific value
becoming bad, then getting read from multiple places before anything
crashes. The WAD-independence result (reproduces on both Freedoom and
id's pristine shareware WAD, ruling out BSP-node-overflow) plus this
"one specific pointer, multiple readers" shape point at a new, more
specific hypothesis not yet investigated: **Asyncify's stack save/restore
around the `emscripten_sleep`/`I_Sleep` yield point** (visible in every
captured crash's call stack — `TryRunTics` calls `I_Sleep` to throttle to
the target tic rate, which Asyncify implements by unwinding and later
rewinding the C call stack to simulate blocking sleep in single-threaded
WASM). If Asyncify's rewind doesn't perfectly restore some local/cached
reference derived from the player's mobj across that yield boundary, a
stale/bad value landing specifically in `mo->subsector` after resume would
explain every observation so far: WAD-independence, timing-sensitivity
(depends on exactly when the yield/resume lands relative to other game
state), and why it's specifically the *player's* mobj (the one object whose
state is most likely to be read again immediately after every tic's sleep,
since the renderer needs it every frame) rather than monsters/items.
This is a plausible mechanism, not a confirmed one — nobody has looked at
Asyncify's actual save/restore behavior around this yield point yet.

**Validated via repeated local testing** (real Chrome via Patchright, real
shareware WAD, through the actual `.gapp` fixture): 30s idle, 60s idle, and
~13s of simulated movement/fire input, all with zero WASM traps — versus
100% reproduction rate in every pre-fix test of comparable or shorter
duration. Not a guarantee the bug is gone everywhere (other unpatched
`mo->subsector->sector` accesses exist — see below — and the underlying
cause is still unconfirmed), but a real, measured improvement.

**Not yet deployed to production** — built and tested locally only as of
this writing. `doom-wasm-fixes.patch` (saved in the `.gapp` directory
itself, alongside the source it patches conceptually — the actual
`cloudflare/doom-wasm` source isn't vendored in this repo, only fetched
into a scratch dir when building) captures both changes for reproducing the
build. See `CLAUDE.md`'s Commands section — there's no Nix/repo-committed
build script yet (a user request from earlier in this investigation that
never got followed up on); rebuilding today means manually cloning
`cloudflare/doom-wasm`, applying this patch, and following the README's
Emscripten build steps.

**Other `mo->subsector->sector` accesses not yet patched** (found via
`grep -rn "subsector->sector" src/doom/*.c` in the source, not yet
confirmed to actually crash — only the two above have been observed to):
`p_saveg.c:1657-1658`, `p_spec.c:1035`, `p_mobj.c:222,415,557-558`. These
are for arbitrary mobjs (monsters, items), not specifically the player, so
the same "player's own subsector" theory may not apply to them the same
way — but if the real cause is more general than currently understood,
these are the next likely crash sites to watch for.

## Next steps (not yet done)

- **Deploy the current fix and monitor** — it's validated locally only so
  far. If the debug overlay stops catching this crash in production for a
  good while, that's real signal; if it catches a *new* site (see the
  unpatched `mo->subsector->sector` list above), that's useful too.
- Investigate the Asyncify/`I_Sleep` stack save-restore hypothesis above —
  the most specific, actionable new lead, and would explain the
  "one specific pointer, multiple readers" shape better than a generic
  struct-layout theory at this point.
- Still no committed/reproducible build script for this — a Nix derivation
  was requested earlier in this investigation and never delivered. Worth
  doing now that there's an actual source patch (`doom-wasm-fixes.patch`)
  that needs to be reproducibly re-applied on every rebuild, not just the
  upstream source.
- Exact crash site is now known (`p_user.c:267`, `player->mo->subsector->
  sector->special`) and WAD-independence is confirmed (reproduces on both
  Freedoom and id's own shareware WAD) — the remaining question is why
  `mo->subsector` sometimes ends up invalid, not whether the bug is
  WAD-specific.
- Re-enable `SAFE_HEAP=1` in the local build, reproduce the (reliable)
  `D_CheckNetGame` alignment fault, and look at exactly what struct/field is
  being accessed there — still the concrete lead most likely to explain both
  crashes as one underlying bug (struct-layout/memory-safety issue specific
  to this Emscripten/Clang toolchain compiling 1993-era C, not a WAD-data
  problem).
- If confirmed, the real fix is almost certainly a struct-packing annotation
  (or removing some pointer-aliasing/union trick the original 1993 code
  relies on) in whatever C file defines the struct in question — not another
  build-flag workaround.
- If it turns out to be a separate bug from the SAFE_HEAP one, trace
  backwards from `P_SetThingPosition`/`R_PointInSubsector` — is `thing->x,y`
  itself corrupted before this call, or does `R_PointInSubsector`'s BSP walk
  produce a bad index even for well-formed vanilla node data under this
  compiler? The WASM source map (already built via `-gsource-map`, and
  confirmed to reproduce byte-identically from source) makes bisecting this
  further tractable without needing to catch a live crash again.
