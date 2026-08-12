# Reduce Complexity

Six findings from an audit of the gapp compile pipeline and runtime. Ranked by severity.

---

## High

### 1. `registry-paths.ts` — silent root fallback

`resolveProjectRoot()` walks four candidate directories and returns `process.cwd()` if none match. Callers can't tell whether resolution succeeded or fell back silently, so they compensate defensively. This is the root cause of finding #2.

**Fix:** throw (or at minimum log) when no candidate matches. Resolve the root once at startup so all downstream code can assume it's correct.

### 2. `resolve-dependencies.ts` — artifact read retry loop

The `readPlatformArtifact` loop across `platformRegistryCandidates` (line 31) exists entirely because `resolveProjectRoot()` is unreliable. If the root were resolved once and correctly, this collapses to a single `fs.readFile`.

**Fix:** fix #1, then delete the loop.

---

## Medium

### 3. `resolve-config.ts` — too many jobs in one function

`resolveGappConfig` parses `gapp.json`, falls back to legacy `compile.edn`/`compile.cljs`, infers deps from ClojureScript source, merges overrides, and constructs a synthetic `GappManifest` — all in one pass. The legacy path adds branching that touches every callsite.

**Fix:** require `gapp.json` for all active apps. Delete the legacy fallback path once nothing uses it.

### 4. `compile-gapp.ts` — three cases, one function

`compileGappTree` now handles three distinct cases via nested conditionals: no-op early return, non-squint apps with ESM deps, and squint apps with ESM deps + IIFE deps + side-effect scripts. The shared structure obscures which path is actually taken.

**Fix:** make the three branches explicit — either separate named helpers or clearly labelled top-level conditions with no shared fall-through.

### 5. `db/image.ts` — compilation buried in a DB write

The squint compile step is a side effect inside what reads as a database image write. Mixing orchestration (compile, hash, tar) with persistence makes both harder to follow and test independently.

**Fix:** extract the compile-and-tar step into a named function that `db/image.ts` calls explicitly, rather than having it happen as a side effect of the write path.

---

## Low

### 6. `infer-deps.ts` — regex heuristics on ClojureScript source

Inferring Yjs/RxJS usage by pattern-matching source strings is fragile. It exists to support apps that predate `gapp.json`.

**Fix:** once all squint apps have `gapp.json` with explicit `dependencies`, delete `inferDepsFromSquintSource` entirely. The fix for #3 makes this possible.

## Review feedback (2026-08-08)

- Findings 1 and 2 appear stale. `src/gapp/registry-paths.ts` now throws if the registry directory cannot be found, and `src/gapp/resolve-dependencies.ts` now reads from a single resolved registry path instead of looping over candidates.
- Findings 3 and 6 are still relevant. The checked fixtures now have `gapp.json`, so the legacy `compile.edn` / `compile.cljs` / inference path looks increasingly removable once tests or any external fixture dependency confirm nothing still relies on it.
