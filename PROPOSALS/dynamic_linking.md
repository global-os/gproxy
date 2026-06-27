# Dynamic linking for `.gapp` bundles

Proposal for declaring runtime dependencies alongside `index.html`, so apps do not hardcode CDN `<script>` tags and the platform can load libraries reliably.

## Problem

`.gapp` apps are directories on the user's desktop, snapshotted to `image.tar_bytes`, and served from `{slug}.app.onetrueos.com`. Today each app inlines dependency loading in `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/yjs@13.6.18/dist/yjs.js"></script>
```

This breaks easily:

- CDN paths change or disappear (Yjs no longer ships `dist/yjs.js` — it 404s)
- No pinning, integrity checks, or fallback
- The instance server must resolve sibling assets (`yjs.js` next to `helloworld.gapp/index.html`) without the app knowing its tar layout
- Every app re-learns the same dependency wiring

We want **dynamic linking**: dependencies declared once in a manifest; the platform loads them before app code runs.

## Goals

1. **Declarative** — deps live in a file next to `index.html`, not scattered in HTML
2. **Reliable** — bundled deps are the default; CDN is optional and verified
3. **Reproducible** — version pins; image build resolves deps into the tar snapshot
4. **App-agnostic kernel** — session kernel stays unaware of per-app libraries
5. **Incremental** — works for IIFE globals today; can grow into ESM/import maps

## Non-goals (for v1)

- Full package manager (npm install inside a session)
- Arbitrary native Node modules in the iframe
- Cross-app shared dependency deduplication across instances (future optimization)

## Layout

```
helloworld.gapp/
  gapp.json       ← dependency manifest (this proposal)
  index.html      ← app shell; no hardcoded CDN script tags
  yjs.js          ← vendored copy when source = "bundled"
  app.js          ← optional: app logic separated from HTML
```

The manifest is part of the desktop directory tree, included in `collectTree` / `buildTar`, and served from the instance bundle like any other file.

## Manifest: `gapp.json`

Recommended filename: **`gapp.json`** (lives at the root of the `.gapp` directory, alongside `index.html`).

### Top-level schema

```json
{
  "name": "helloworld",
  "version": "1.0.0",
  "entry": "index.html",
  "type": "classic",
  "dependencies": {
    "yjs": {
      "version": "13.6.20",
      "source": "bundled",
      "path": "yjs.js",
      "format": "iife",
      "global": "Y"
    }
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | no | Logical app name (defaults to directory name minus `.gapp`) |
| `version` | no | App version string |
| `entry` | no | Entry HTML file; default `index.html` |
| `type` | no | `classic` (default) or `module` — affects bootstrap strategy |
| `dependencies` | yes | Map of package id → link spec (see below) |

### Dependency link spec

Each key in `dependencies` is a stable id (e.g. `yjs`, `rxjs`). Values:

| Field | Required | Description |
|-------|----------|-------------|
| `version` | yes | Semver pin for reproducibility and platform registry lookups |
| `source` | yes | Where bytes come from: `bundled`, `cdn`, or `platform` |
| `format` | yes | `iife`, `esm`, or `importmap` |
| `path` | if `bundled` | Relative path inside the `.gapp` directory |
| `url` | if `cdn` | Fully resolved URL (version should match `version`) |
| `global` | if `iife` | Global variable name (e.g. `Y` for Yjs, `rxjs` for RxJS UMD) |
| `module` | if `esm` + `platform` | Bare specifier resolved by platform (e.g. `lib0/observable`) |
| `integrity` | if `cdn` | Subresource integrity hash; **required** for CDN in production |
| `order` | no | Load order override (integer); default: manifest key order |

### `source` values

| Value | Meaning |
|-------|---------|
| `bundled` | File is shipped inside the `.gapp` tar. **Default and recommended** for critical deps. |
| `cdn` | Platform fetches at image-build time, verifies `integrity`, and vendors into the tar (or rejects). Not loaded live from CDN on every iframe request. |
| `platform` | GlobalOS serves a known-good build from an internal registry (curated IIFE/ESM builds per version). |

**Rule of thumb:** if the app breaks without it, use `bundled`.

### Example: helloworld editor (Yjs only)

```json
{
  "name": "helloworld",
  "version": "1.0.0",
  "entry": "index.html",
  "dependencies": {
    "yjs": {
      "version": "13.6.20",
      "source": "bundled",
      "path": "yjs.js",
      "format": "iife",
      "global": "Y"
    }
  }
}
```

`yjs.js` is produced locally via `npm run bundle:helloworld-yjs` (esbuild IIFE, `global-name=Y`) and stored in the bundle.

### Example: mixed sources

```json
{
  "entry": "index.html",
  "dependencies": {
    "yjs": {
      "version": "13.6.20",
      "source": "bundled",
      "path": "yjs.js",
      "format": "iife",
      "global": "Y"
    },
    "rxjs": {
      "version": "7.8.1",
      "source": "cdn",
      "url": "https://cdn.jsdelivr.net/npm/rxjs@7.8.1/dist/bundles/rxjs.umd.min.js",
      "format": "iife",
      "global": "rxjs",
      "integrity": "sha384-…"
    },
    "lib0": {
      "version": "0.2.97",
      "source": "platform",
      "format": "esm",
      "module": "lib0/observable"
    }
  }
}
```

## How apps stay thin

### Option A — platform bootstrap script (recommended)

`index.html` does not list deps. It loads a platform endpoint or static bootstrap:

```html
<script src="/__gapp/bootstrap.js"></script>
<script src="app.js"></script>
```

Bootstrap (served by instance runtime):

1. Read `gapp.json` from the bundle (path relative to index directory)
2. Resolve each dependency in `order`
3. For `iife`: inject `<script src="…">` (or inline) and wait until `global` exists
4. For `esm`: inject import map + `type="module"` entry
5. Signal `gapp:ready` or run `app.js` callback

Apps keep using globals or modules without caring where bytes came from.

### Option B — server-side HTML rewrite

On serving `entry` HTML, the instance handler:

1. Parses `gapp.json`
2. Injects `<script>` / `<script type="importmap">` before the app's scripts
3. Returns transformed HTML (similar to existing `replaceDomainInHTML`)

No bootstrap file in the app; slightly more magic at serve time.

**v1 recommendation:** Option B for `classic` + `iife` (minimal moving parts); Option A when we add `type: "module"`.

## Asset URL resolution

Bundles store paths like `helloworld.gapp/index.html` and `helloworld.gapp/yjs.js`. The browser requests `/` and `/yjs.js`.

The instance content resolver must map bare paths to siblings of the entry index (implemented in `resolveBundlePath` via index-directory prefix). Manifest `path` values are **relative to the `.gapp` root** (same directory as `gapp.json`), not relative to the URL path.

## When linking runs

Align with existing launch/serve split:

| Phase | Work |
|-------|------|
| **Launch** (`POST …/launch`) | No dependency resolution. Fast path only. |
| **Image build** (`getOrCreateImage` / `createImage`) | Read `gapp.json` if present; vendor `cdn` deps into tar; validate `bundled` paths exist; optional platform registry fetch |
| **Instance prepare** (`ensureInstanceReady`) | Parse tar; validate manifest hash alongside directory checksum |
| **Serve** (`/instance/…`) | Inject scripts or serve bootstrap; then serve `entry` |

CDN fetches must **not** happen on the critical path of every iframe reload. Resolve once into `tar_bytes`.

## ESM / import maps (future-friendly)

For `type: "module"`:

```json
{
  "entry": "index.html",
  "type": "module",
  "dependencies": {
    "yjs": {
      "version": "13.6.20",
      "source": "bundled",
      "path": "yjs.mjs",
      "format": "esm"
    }
  },
  "imports": {
    "yjs": "./yjs.mjs"
  }
}
```

```html
<script type="importmap">{ … }</script>
<script type="module" src="app.js"></script>
```

```js
import * as Y from 'yjs'
const doc = new Y.Doc()
```

ESM requires the full module graph (Yjs → `lib0`, etc.). Prefer a single bundled `yjs.mjs` or platform-provided graph until import maps are first-class.

## Platform registry (optional)

For `source: "platform"`, maintain a small registry (JSON or table):

```json
{
  "yjs": {
    "13.6.20": {
      "iife": { "path": "registry/yjs-13.6.20.iife.js", "global": "Y", "bytes": 293863 },
      "esm": { "path": "registry/yjs-13.6.20.mjs" }
    }
  }
}
```

Registry artifacts are baked into the serverless bundle or fetched at image-build time. Apps pin `version`; platform picks the artifact for `format`.

## Validation and errors

At image build:

- `gapp.json` must parse as JSON
- Every `bundled` `path` must exist in the directory tree
- `cdn` entries must include `integrity`
- Unknown `source` or `format` → fail build with clear error
- Known-bad URLs (e.g. yjs `dist/yjs.js`) → warn or reject

At serve:

- If a `global` is missing after load → 502 with `{ "message": "Dependency yjs failed to load" }` instead of silent `ReferenceError` in the iframe

## Relationship to session kernel

The session kernel (`postMessage` bridge: `ready`, `init`, `save`) remains **app-agnostic**. Dynamic linking only affects how the iframe document gets its libraries before app code calls `postMessage({ type: 'ready' })`.

Load order:

1. Platform loads dependencies from `gapp.json`
2. App script runs, constructs `Y.Doc`, etc.
3. App sends `ready`
4. Kernel responds with `init` / `init:fresh`

## Migration

1. Add `gapp.json` to existing apps (e.g. helloworld)
2. Move vendored `yjs.js` to `path` declared in manifest
3. Remove CDN `<script>` tags from `index.html`
4. Rebuild image (directory checksum changes → new `tar_bytes`)
5. Implement manifest reader in image build + HTML inject (follow-up PRs)

## Open questions

1. **Filename** — `gapp.json` vs `manifest.json` vs `Bundle.toml`? Prefer `gapp.json` for clarity.
2. **Transitive deps** — v1: flat `dependencies` only; app vendors bundles. Later: platform could expand a lockfile.
3. **Dev workflow** — `npm run bundle:helloworld-yjs` vs generic `gapp vendor yjs@13.6.20` CLI.
4. **Integrity for bundled** — optional hash in manifest to detect tampering inside tar.

## Summary

| Piece | Choice |
|-------|--------|
| Manifest file | `gapp.json` next to `index.html` |
| Default source | `bundled` |
| CDN | Allowed with `integrity`; vendored at image build |
| Load mechanism | Server injects scripts into `entry` HTML (v1) |
| Critical example | Yjs as `bundled` `yjs.js`, `format: iife`, `global: Y` |

This gives declarative dynamic linking without trusting brittle CDN paths, while fitting the existing `.gapp` → `image` → instance serve pipeline.