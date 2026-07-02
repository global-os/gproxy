# CLAUDE.md — GlobalOS PROXY

Context for AI assistants working in this repo.

## What this is

GlobalOS PROXY is the monorepo for the GlobalOS web desktop:

- **Backend:** Hono on Node, deployed as one Vercel function (`api/index.ts`)
- **Frontend:** React SPA in `src/frontend` (Vite, TanStack Router, Fela)
- **Database:** PostgreSQL via Drizzle ORM (`src/db/schema.ts`)
- **Auth:** better-auth (`src/auth.ts`), mounted at `/app/api/auth`
- **Runtime:** `.gapp` directories stored as `file`/`directory` rows; snapshotted to `image.tar_bytes`; served from `{instanceSlug}.app.onetrueos.com` (UUID in `instances.slug`)

Production URL: `https://app.app.onetrueos.com`

## Core concepts

**Canonical architecture:** [`docs/architecture.md`](docs/architecture.md)

```text
Global PC
  ├── Task(s) — PC-scoped services (not in a workspace); process ≠ task
  └── Workspace(s) — persistent desk; runs many processes
        └── Process (per .gapp on that desk)
              ├── Window(s) — UI chrome; cannot exist without a process
              └── Instance(s) — runtime at {slug}.app.onetrueos.com
```

Legacy code still uses `sessions` / `sessionId` for **workspaces**; auth **session** is separate (Better Auth).

- **Launch** (`POST /api/sessions/:sessionId/launch`): validate session + `.gapp`, find/create process + instance, open or focus window. Must return quickly.
- **Instance serve** (`*.app.onetrueos.com`): `ensureInstanceReady` resolves image metadata, loads `tar_bytes`, extracts to `/tmp`, serves files from memory map.
- **Workspace kernel** (`src/frontend/src/kernel/`, still named session-kernel): parent-page `postMessage` bridge during a **visit**; opaque JSON state per `workspaceId:processId` (process) or `globalPcId:taskId` (task) in `localStorage`. App-agnostic — no per-app handlers in the kernel (see **`.gapp` paradigm** below).
- **Syscalls** (`src/syscalls/`, `POST /api/syscalls`): platform operations (filesystem, etc.) invoked by the kernel on behalf of iframe apps.

## `.gapp` paradigm

### What a `.gapp` is

- A **directory** on the user's Desktop whose name ends in `.gapp` (e.g. `filebrowser.gapp/`).
- Stored as `directory` + `file` rows in Postgres (RLS per user).
- On first iframe load, `ensureInstanceReady` builds or reuses an **`image`** row (`tar_bytes` snapshot of the tree) and serves files from `{instances.slug}.app.onetrueos.com`.
- Launch handler must stay fast — no tar build/extract in `POST .../launch`; that runs when the iframe requests `index.html`.

### Origin boundary (why the kernel exists)

| Context | Host | Can `fetch('/api/...')` with session cookie? |
|---------|------|-----------------------------------------------|
| Workspace shell | `app.app.onetrueos.com` | Yes |
| Running `.gapp` iframe | `{uuid}.app.onetrueos.com` | No (cross-origin) |

Apps **must** use `window.parent.postMessage` to request platform services. The workspace **session kernel** (`SessionKernel` in `session-kernel.ts`) validates the message source (registered iframe), calls the backend, and `postMessage`s back.

**Do not** add app-specific branches in the kernel (e.g. `if (bundleName === 'filebrowser')`). Apps own their protocol; the kernel exposes generic message types and syscalls.

### Kernel message flow

**Registration:** `useSessionKernel` registers each `WorkspaceWindow` iframe (`register` / `unregister` on open/close).

**Inbound (iframe → kernel)** — handled in `handleMessage`:

| `type` | Action |
|--------|--------|
| `ready` | Reply `init` (restored state) or `init:fresh` |
| `save` | Syscall `fs.saveDesktopFile`; persist opaque state; `save:complete` / `save:error` |
| `syscall` | Generic `{ op, requestId, ...args }` → `syscall:complete` / `syscall:error` |
| `fs:browse`, `fs:mkdir`, `fs:rename`, `fs:delete` | Shorthand → same syscalls; reply `fs:*:complete` / `fs:*:error` |
| `die:response` | Reserved for window close handshake |

**Opaque process state:** On successful `save`, kernel stores the message payload (minus `type`) in memory and `localStorage` under `workspaceId:processId` (legacy key may still use `sessionId`). Schema is **owned by the app**; kernel does not interpret fields beyond `filename` / `content` for the save syscall.

**Desktop refresh:** After mutating FS syscalls, kernel dispatches `globalos:desktop-updated` so the workspace reloads desktop icons.

### Syscalls

Single endpoint: `POST /api/syscalls` body `{ op, ...args }`.

| `op` | Args (summary) |
|------|----------------|
| `fs.browse` | `directoryId?` |
| `fs.mkdir` | `parentId`, `name` |
| `fs.rename` | `entryType`, `id`, `name` |
| `fs.delete` | `entryType`, `id` |
| `fs.saveDesktopFile` | `filename`, `content` |

Add new platform capabilities by implementing a handler in `src/syscalls/`, registering it in `src/syscalls/index.ts`, and exposing it via kernel (`syscall` message or a new generic type). Keep FS route surface minimal (`GET /api/fs/desktop` is for the shell only).

### Reference `.gapp` implementations

| App | Path | Pattern |
|-----|------|---------|
| Hello World editor | `fixtures/.../helloworld.gapp/` | `ready` / `init` / `save`; imperative JS |
| File Browser | `fixtures/.../filebrowser.gapp/` | `kernel.js` + `app.js` (Preact `h()`); `preact.mjs` / `hooks.mjs` vendored ESM (wget from esm.sh, import map in `index.html`); `fs:*` messages |
| Squint editor | `fixtures/.../squint-editor.gapp/` | `app.cljs` → compiled `app.js` via `compileGappTree`; platform deps `yjs` / `rxjs` |
| Twitter / X | `fixtures/.../twitter.gapp/` | `webview:create` → kernel → `POST /api/webviews` → proxy iframe |
| Instagram | `fixtures/.../instagram.gapp/` | same webview pattern, `domain: 'instagram.com'` |
| YouTube | `fixtures/.../youtube.gapp/` | same webview pattern, `domain: 'youtube.com'` |

### Webview `.gapp` pattern

A **webview app** embeds an external website via the proxy layer instead of serving its own files.

**Kernel messages used:**

| `type` | Direction | Action |
|--------|-----------|--------|
| `webview:create` | app → kernel | kernel calls `POST /api/webviews` with `{ processId, domain }`; replies `webview:create:complete` or `webview:create:error` |
| `webview:destroy` | app → kernel | kernel calls `DELETE /api/webviews/:id` |

**`webview:create:complete` payload:** `{ webviewId, slug, domain, proxyOrigin }` — app saves state and sets `frame.src = proxyOrigin + '/'`.

**On `init` (restored state):** `data.proxyOrigin` is present — skip `webview:create`, show iframe directly.

**Platform library:** vendor `src/gapp/platform/messaging.js` into the `.gapp` dir. It exposes `window.KernelMessaging.nextId()` for unique request IDs scoped to the current visit (visit ID issued by `POST /api/visits` on kernel startup). Include it before your app script.

**Minimal webview app files:** `index.html`, `app.js`, `messaging.js` (vendored). No server-side build needed.

**Static apps:** ship all runtime assets inside the `.gapp` directory (HTML, JS, vendored `.mjs` libs). No Node build required in-repo unless you choose to bundle.

**Squint apps:** `src/gapp/compile-gapp.ts` compiles `app.cljs` when the instance image is built; injects platform IIFE scripts from `src/gapp/registry/deps/`.

### Fixtures and seeding

- Demo tree: `fixtures/by-user/peterson@sent.com/~/Desktop/*.gapp`
- `seedUserFixtures()` (`src/db/seed.ts`) **upserts** fixture files/dirs for that user (idempotent; does not wipe user-created siblings).
- Runs on `dev:backend` startup and in `vercel-build` before deploy.
- After changing a fixture: `npm run db:seed`, then **relaunch** the app (new `image` tar when directory checksum changes).

## Request routing

`src/app.ts` uses custom `getPath` → `src/utils.ts` `pathFromHostnameAndPath`:

| Host | Example path | Internal path |
|------|----------------|---------------|
| `app.app.onetrueos.com` | `/api/sessions/1/launch` | `/app/api/sessions/1/launch` |
| `{uuid}.app.onetrueos.com` | `/index.html` | `/instance/{uuid}/index.html` |
| `www.onetrueos.com` | `/` | `/www` (marketing landing) |

Public paths `/health` and `/debug` bypass the `/app` prefix.

## Key files

| Area | Files |
|------|-------|
| Vercel entry | `api/index.ts`, `vercel.json` |
| App shell | `src/app.ts`, `src/middleware.ts`, `src/utils.ts` |
| Auth | `src/auth.ts`, `src/routes/auth.ts`, `src/utils/buffer-incoming.ts`, `src/utils/read-body.ts` |
| Launch / windows | `src/routes/programs.ts`, `src/services/launch-program.ts`, `src/services/create-instance.ts`, `src/services/window-service.ts` |
| Instance runtime | `src/runtime/instance-manager.ts`, `src/runtime/instance-content.ts`, `src/runtime/constants.ts` |
| FS / RLS | `src/routes/fs.ts`, `src/db/file.ts`, `src/db/image.ts` |
| Syscalls | `src/routes/syscalls.ts`, `src/syscalls/` |
| Session kernel | `src/frontend/src/kernel/session-kernel.ts`, `useSessionKernel.ts`, `state.ts` |
| Webview proxy | `src/routes/webviews.ts`, `src/runtime/webview/proxy.ts`, `src/runtime/webview/resolve.ts` |
| Webview recording | `src/runtime/webview/recording.ts`, `src/routes/proxy-recording.ts` |
| Platform library | `src/gapp/platform/messaging.js` |
| Gapp compile | `src/gapp/compile-gapp.ts`, `src/gapp/registry/` |
| Fixtures | `fixtures/by-user/`, `src/db/seed.ts` |
| Health | `src/health-checks.ts`, `src/db/index.ts` (`checkAppTables`, etc.) |
| Frontend workspace | `src/frontend/src/components/Workspace/`, `src/frontend/src/routes/session.$sessionId.tsx` |
| Schema | `src/db/schema.ts`, `drizzle/` |
| Migrations script | `scripts/apply-pending-migrations.mjs` |

## Commands

```bash
npm run dev:backend          # tsx src/index.tsx :3000
npm run dev:frontend         # Vite in src/frontend
npm run build:backend        # tsc → dist/
npm run build                # www + frontend + backend + version stamp
npm run vercel-build         # production Vercel build

cd src/frontend && npm run regenerate   # TanStack Router codegen

npx drizzle-kit generate
npx drizzle-kit push
npm run db:migrate   # local; also runs automatically in vercel-build on deploy
```

## Environment (minimum)

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (production)

Optional: `DATABASE_SSL=true`, `POSTMARK_*`, `INSTANCE_*` overrides, `PROXY_URL` (outbound residential proxy), `SIDECAR_URL` (TLS-impersonation sidecar, planned).

## Vercel / serverless pitfalls (read before changing auth, launch, or DB code)

1. **Auth body stream:** Never pass raw `c.req.raw` to `auth.handler()` on POST without buffering. `api/index.ts` sets `incoming.rawBody`; `src/routes/auth.ts` uses `buildBufferedRequest()`.

2. **Pool size:** Serverless pool `max: 3` (`src/db/index.ts`). `setRlsUser` holds a connection for the whole request. Routes that use global `db` must **not** run under `setRlsUser` — see `src/routes/programs.ts` (launch/windows). FS routes use `c.get('db')` with RLS correctly.

   **Webview pool exhaustion:** The `provideDb` middleware runs for all `/instance/**` requests and holds a pool connection per request. A webview page load fires 10–20 concurrent script/asset requests; each acquires a connection, exhausting the pool. Requests that can't get a connection are killed by Vercel's timeout and return 502 with **no logs** (the handler never runs). Fix: cache webview slug→row lookups in memory (`src/runtime/webview/resolve.ts`) so only the first request per function instance hits the DB. Do **not** add per-request DB calls (inserts, lookups) to the webview proxy hot path — batch them or skip entirely.

3. **Launch timeouts:** Do not `SELECT image.tar_bytes`, `hashDir`, `buildTar`, or `ensureInstanceContent` inside the launch handler. Launch only uses `resolveImageMeta()` (id + checksum). Heavy work belongs in `ensureInstanceReady()` when the iframe loads. Placeholder checksum: `PENDING_INSTANCE_CHECKSUM` in `src/runtime/instance-constants.ts`.

4. **Function limit:** `maxDuration: 30` in `vercel.json`. Instance first-load can approach this if tar build/extract is slow.

5. **Health vs debug:** `/health` is for monitors (includes auth probe). `/debug` is operator diagnostics — do not expose secrets there.

## Webview proxy

`POST /api/webviews` creates a `webview` row (`slug`, `process_id`, `domain`). The slug becomes a subdomain (`{slug}.app.onetrueos.com`). When a request arrives at that subdomain and no instance matches the slug, `resolveWebviewBySlug` finds the webview row and `proxyWebviewRequest` fetches the upstream.

**Intercept script** (`src/runtime/webview/proxy.ts` → `buildInterceptScript`): injected as the first child of `<head>` in every proxied HTML response. Two sections:

- **REPLACEMENTS** — monkey-patches `fetch()`, `XMLHttpRequest.open()`, and `navigator.sendBeacon()` to route all cross-origin requests through the proxy (`https://api.x.com/path` → `/api.x.com/path`). The proxy rewrites `Origin` / `Referer` to the bound domain before forwarding, so third-party services see the real site rather than our proxy subdomain. Also intercepts dynamically injected `<script src>` so lazy-loaded chunks are proxied.
- **SHIMS** — patches `document.cookie` setter to strip `Domain=` attributes, so cookies set with their real domain land on the proxy host instead of being rejected by the browser.

**Cookie forwarding:** The browser sends cookies for the proxy domain (`{slug}.app.onetrueos.com`). These are forwarded as-is in the `Cookie` header to the upstream. Sites set cookies via `Set-Cookie` in responses; the proxy strips `Domain=` so they land on the proxy origin and are returned on subsequent requests. This means the user's upstream session (guest tokens, CSRF tokens, etc.) accumulates correctly across page loads.

**Header stripping (`HOP_BY_HOP` in `proxy.ts`):** Several header categories are stripped before forwarding to upstream:
- Standard hop-by-hop headers (`connection`, `transfer-encoding`, etc.)
- `Sec-Fetch-*` and `Sec-CH-*` — browser security metadata that reveals the cross-origin iframe context; X uses these to detect proxy/WebView access.
- `forwarded`, `x-forwarded-for/host/proto`, `x-real-ip` — Vercel injects these on every inbound request; forwarding them tells upstream we're a proxy.
- All `x-vercel-*` headers (matched by prefix) — Vercel injects deployment metadata (e.g. `x-vercel-deployment-url`) that trivially identifies the request as coming from Vercel infrastructure. **This was the root cause of X's "Please use X.com or official X apps" error.**

**Accept-Encoding:** Must be set to `gzip, deflate, br, zstd` to match Chrome 131's fingerprint. Cloudflare uses this value as a bot-detection signal. We send it explicitly (stripping whatever the browser sent) and manually decompress brotli responses in case undici doesn't handle `br` automatically.

**IP-based blocking:** Sites like X and Instagram reject requests from known datacenter IPs (Vercel runs on AWS). Set `PROXY_URL` to an outbound HTTP/SOCKS5 residential proxy. Mullvad and VPN ranges are also typically blocked. The proxy passes `PROXY_URL` as the `dispatcher` to undici's `fetch`. Note: `PROXY_URL` only masks the IP — the TLS handshake still originates from Node.js and carries its own fingerprint (see below).

**TLS fingerprinting:** Cloudflare Bot Management fingerprints the TLS ClientHello (JA3/JA4 — cipher suites, extensions, ordering). Node.js/undici produces a fingerprint that Cloudflare identifies as non-Chrome. Even through a residential proxy, the TLS handshake goes directly from our Node.js process to upstream. Symptoms: X deletes the `ct0` CSRF cookie on every page load, blocking login. Cloudflare returns 403 HTML challenge pages for some endpoints.

**TLS sidecar** (`sidecar/`): Go HTTP server wrapping the `tls-client` library with a Chrome 131 TLS profile. When `SIDECAR_URL` is set, Vercel routes all upstream fetches through it instead of direct undici. Auth via `SIDECAR_SECRET` (Bearer token). The sidecar omits `Accept-Encoding` so Go's http transport sends gzip and auto-decompresses — callers always receive a decoded body with no `Content-Encoding`. Deployed on a Vultr VM; see deployment steps below.

Deploying on Vultr (one-time setup):
```bash
# 1. Create Ubuntu 24.04 VM (1 vCPU / 1GB RAM) in Vultr dashboard
# 2. SSH in
curl -fsSL https://get.docker.com | sh
git clone https://github.com/global-os/proxy && cd proxy
docker build -t proxy-sidecar ./sidecar/
docker run -d --restart=always -p 8080:8080 \
  -e SIDECAR_SECRET=<strong-random-secret> \
  --name proxy-sidecar proxy-sidecar
# 3. Add to Vercel env vars (both production and preview)
#    SIDECAR_URL=http://<vultr-ip>:8080
#    SIDECAR_SECRET=<same-secret>
```

Updating after code changes:
```bash
git pull && docker build -t proxy-sidecar ./sidecar/ && \
  docker stop proxy-sidecar && docker rm proxy-sidecar && \
  docker run -d --restart=always -p 8080:8080 \
    -e SIDECAR_SECRET=<secret> --name proxy-sidecar proxy-sidecar
```

**Castle.io webpack stub (X-specific):** X's bot-detection SDK (`ondemand.castle.*.js`) is a webpack chunk that crashes in the cross-origin iframe context. The proxy intercepts it by filename regex, parses the chunk with `acorn` to extract the webpack chunk array name, chunk IDs, and module IDs, then returns a no-op stub: `(self["webpackChunk_twitter_responsive_web"]=...).push([[chunkId],{moduleId:function(){}}])`. This prevents the `ChunkLoadError` that would otherwise cascade and break the login UI.

**`/cdn-cgi/` paths:** Previously returned 404. Now proxied through to upstream (some Cloudflare challenge scripts at these paths are needed for bot scoring).

**Proxy traffic recorder** (`src/runtime/webview/recording.ts`, `src/routes/proxy-recording.ts`): Debug tool that captures all proxied request/response pairs to Postgres and exports as a HAR file for comparison with native browser traffic.

```bash
curl -X POST https://app.app.onetrueos.com/api/proxy-recording/start  # clears old data
# ... trigger the traffic you want to capture ...
curl -X POST https://app.app.onetrueos.com/api/proxy-recording/stop
curl https://app.app.onetrueos.com/api/proxy-recording/har -o traffic.har
```

Recording uses a batched in-memory flush (500ms) to avoid adding DB connections to the hot request path.

## Debugging checklist

| Symptom | Check |
|---------|--------|
| Auth 504 ~15s | `/debug` `authProbe`; `hasRawBody`; body buffering in `api/index.ts` |
| Launch 504 ~30s | Vercel logs for `[launch]` timing; ensure launch path isn't loading `tar_bytes` |
| Windows 500 | Was pool deadlock with `setRlsUser` on programs router; verify fix intact |
| Instance 502 | `ensureInstanceReady` logs; image row exists; tar extract to `/tmp` |
| Schema errors | `/debug` `schema.missing`; run `scripts/apply-pending-migrations.mjs` |
| Webview scripts 502, no `[webview] GET` logs | Pool exhausted before handler ran — check that `resolveWebviewBySlug` cache is warm; avoid per-request DB calls in the proxy hot path |
| Webview upstream fetch failed | Search logs for `upstream fetch failed` to see actual error; if absent, upstream returned non-2xx (forwarded silently) — check `[webview] GET` lines |
| X login "Please use X.com or official X apps" | Check: (1) `x-vercel-*` / `forwarded` headers stripped ✓; (2) `ct0` cookie set (not deleted) in main page response — if deleted, Cloudflare TLS fingerprinting is blocking us; needs TLS sidecar |
| X `ct0` deleted on page load | Cloudflare Bot Management detecting Node.js TLS fingerprint; `PROXY_URL` set but TLS still identifies as non-Chrome; sidecar (`SIDECAR_URL`) needed |

## Conventions

- ESM throughout (`"type": "module"`); imports use `.js` extensions in `src/`
- Match existing style: minimal comments, focused diffs, no drive-by refactors
- Do not edit generated files (`src/frontend/src/routeTree.gen.ts`) by hand — run `regenerate`
- Version stamp: `scripts/write-build-version.mjs` → `src/build-version.json`; shown via `VersionStamp` and `src/landing.html`

## When adding features

- **New API routes:** Mount under `src/routes/` or `src/app.ts`; remember public `/api/...` becomes `/app/api/...` internally
- **New DB tables:** Update `src/db/schema.ts`, add `drizzle/<timestamp>_<name>/migration.sql` (auto-applied on Vercel deploy), extend `/health` table checks if user-facing
- **Iframe apps:** Communicate via session kernel `postMessage` (`ready`, `save`, `fs:*`, or generic `syscall`); keep kernel app-agnostic; implement app logic only inside the `.gapp`
- **New platform APIs:** Add syscall handler + kernel forwarding; do not add per-app REST routes under `/api/fs` for iframe use
- **Multiple instances per process:** Instance subdomain already supports it; kernel state may need to move from `processId` to `instanceId` keying

## CI

`.github/workflows/vercel-health-check.yml` — on push to `main`, waits for Vercel deploy, curls `/health`, reports GitHub check. Requires `VERCEL_TOKEN` secret.