# CLAUDE.md — GlobalOS PROXY

Context for AI assistants working in this repo.

**Naming note:** the repo/directory was renamed `PROXY` → `gproxy` (GitHub:
`global-os/gproxy`, Gitea mirror: `Cold-Air-Networks/gproxy`; npm package
names in `package.json` files updated to `gproxy-*` too). The sidecar's
*deployed container image* is deliberately still named `proxy-sidecar`
(hardcoded independently in `.gitea/workflows/sidecar-build.yml` and
`petersweb-infra`) — don't be confused if that name shows up in logs/image
tags/bump-PR titles while everything else says `gproxy`; it wasn't
renamed on purpose, since that would mean re-tagging a live image across
two repos.

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
| Doom | `fixtures/by-user/*/~/Desktop/doom.gapp/` | Chocolate Doom compiled to WASM via Emscripten ([cloudflare/doom-wasm](https://github.com/cloudflare/doom-wasm)), Freedoom Phase 1 as the IWAD (not id Software's shareware WAD, to avoid licensing ambiguity); fully static, no kernel/syscall integration. **Has an open, intermittent WASM crash** (`P_PlayerThink`, out-of-bounds memory access, reproduces across both Chrome and Firefox) — see `DOOM_GAPP.md` before touching the build or assuming it's fixed. |

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

Public paths `/health` and `/debug` bypass the `/app` prefix. `/assets/`, `/static/`, `/storybook`, `/vite.svg`, and `/favicon.ico` are also exempted (see `appPath()` in `src/utils.ts`) — anything not exempted falls through to the SPA catch-all (`src/app.ts`'s `['/app/*', '/app/**', '/app']` routes) and gets served the `index.html` shell instead of the actual file. This is a real trap: adding a new root-level static asset (referenced directly as `/whatever.png` rather than under `/assets/` or `/static/`) silently serves HTML instead of 404ing, since the SPA catch-all always matches. Add new exemptions here when adding new root-level static assets.

**Static file serving has three layers, not one** — this matters if a static asset "isn't serving" in production but works locally:
1. `src/frontend/public/` — Vite's dev-time source directory; gets copied into `src/frontend/dist/` automatically by `vite build`.
2. `src/frontend/dist/` — Vite's build output; `resolveFrontendFile()` (`src/frontend-paths.ts`) falls back to this.
3. `public/` (project root) — what Vercel's `outputDirectory` (`vercel.json`) actually serves as static files, **bypassing the Hono app and `getPath`/`appPath()` entirely**. Populated by `scripts/sync-public-assets.mjs` (run at the end of `vercel-build`), which only copies an explicit whitelist of files from `dist/` — currently `assets/*`, `vite.svg`, `favicon.ico`, and the storybook build. `index.html` is deliberately never copied here (would shadow instance/webview iframes on `*.app.onetrueos.com`).

For local dev (`npm run dev:backend`), only layers 1–2 matter (no Vercel static layer in front), so the Hono-level routes/exemptions in `src/app.ts`/`src/utils.ts` are what serve these files. In production, layer 3 wins before any of that code even runs — so a new root-level static asset needs **both** an entry in `sync-public-assets.mjs`'s whitelist (for production) **and** an `appPath()` exemption + Hono route (for local dev parity).

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
| Admin panel | `src/routes/admin.ts`, `src/frontend/src/routes/admin.tsx`, `src/constants/admin.ts` (single hardcoded `isAdminEmail`, no roles table) — currently just the users list and the admin-editable outbound proxy URL (`proxy_config` table — the single source of truth now, see pitfall #6) |
| Frontend workspace | `src/frontend/src/components/Workspace/`, `src/frontend/src/routes/workspace.$workspaceId.tsx` |
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

Optional: `DATABASE_SSL=true`, `POSTMARK_*`, `INSTANCE_*` overrides, `SIDECAR_URL` (real-Chrome sidecar, see `SETUP_SIDECAR.md`), `SIDECAR_SECRET` (shared bearer secret, also used for `/app/api/sidecar-config`). The outbound residential proxy is **not** an env var — see pitfall #6.

## Vercel / serverless pitfalls (read before changing auth, launch, or DB code)

1. **Auth body stream:** Never pass raw `c.req.raw` to `auth.handler()` on POST without buffering. `api/index.ts` sets `incoming.rawBody`; `src/routes/auth.ts` uses `buildBufferedRequest()`.

2. **Pool size:** Serverless pool `max: 3` (`src/db/index.ts`). `setRlsUser` holds a connection for the whole request. Routes that use global `db` must **not** run under `setRlsUser` — see `src/routes/programs.ts` (launch/windows). FS routes use `c.get('db')` with RLS correctly.

   **Webview pool exhaustion:** The `provideDb` middleware runs for all `/instance/**` requests and holds a pool connection per request. A webview page load fires 10–20 concurrent script/asset requests; each acquires a connection, exhausting the pool. Requests that can't get a connection are killed by Vercel's timeout and return 502 with **no logs** (the handler never runs). Fix: cache webview slug→row lookups in memory (`src/runtime/webview/resolve.ts`) so only the first request per function instance hits the DB. Do **not** add per-request DB calls (inserts, lookups) to the webview proxy hot path — batch them or skip entirely.

3. **Launch timeouts:** Do not `SELECT image.tar_bytes`, `hashDir`, `buildTar`, or `ensureInstanceContent` inside the launch handler. Launch only uses `resolveImageMeta()` (id + checksum). Heavy work belongs in `ensureInstanceReady()` when the iframe loads. Placeholder checksum: `PENDING_INSTANCE_CHECKSUM` in `src/runtime/instance-constants.ts`.

4. **Function limit:** `maxDuration: 30` in `vercel.json`. Instance first-load can approach this if tar build/extract is slow.

5. **Health vs debug:** `/health` is for monitors (includes auth probe). `/debug` is operator diagnostics — do not expose secrets there.

6. **~~Three separate PROXY_URL sources of truth~~ — fixed, single source now.** Used to be: the admin panel (`/app/api/admin/proxy-config`, backed by the `proxy_config` DB table) only reached the **sidecar** (`sidecar/config.mjs` polls it every 60s); this app's own direct-fetch outbound proxy (`src/runtime/webview/proxy.ts`) was built once at module load from a separate, static `process.env.PROXY_URL` env var that never reread the DB — changing the URL in the admin panel silently did nothing for this app's own fetches. There is no `PROXY_URL` env var anywhere anymore (main app or Vercel project settings) — `src/runtime/webview/proxy.ts`'s `resolveOutboundProxy()` reads the `proxy_config` DB row directly (cached 30s, retried every 5s on a read failure), and `src/health-checks.ts` reuses that same resolver rather than keeping its own copy. If the DB read fails, outbound requests fall back to **no proxy** rather than serving a stale cached value — by design, not a bug. The sidecar still can't share this DB connection (separate VM) so it still polls `/app/api/sidecar-config` on its own 60s cycle — that's the one remaining, legitimate reason the sidecar's and the main app's resolved proxy could transiently disagree for up to a minute after an admin panel change, not a design flaw. See `sidecar/config.mjs`'s header comment for why the sidecar itself does a poll-then-restart rather than a live in-process reload (Chrome doesn't support changing its proxy config after launch).

## Webview proxy

`POST /api/webviews` creates a `webview` row (`slug`, `process_id`, `domain`). The slug becomes a subdomain (`{slug}.app.onetrueos.com`). When a request arrives at that subdomain and no instance matches the slug, `resolveWebviewBySlug` finds the webview row and `proxyWebviewRequest` fetches the upstream.

**Intercept script** (`src/runtime/webview/proxy.ts` → `buildInterceptScript`): injected as the first child of `<head>` in every proxied HTML response. Two sections:

- **REPLACEMENTS** — monkey-patches `fetch()`, `XMLHttpRequest.open()`, and `navigator.sendBeacon()` to route all cross-origin requests through the proxy (`https://api.x.com/path` → `/api.x.com/path`). The proxy rewrites `Origin` / `Referer` to the bound domain before forwarding, so third-party services see the real site rather than our proxy subdomain. Also intercepts dynamically injected `<script src>` so lazy-loaded chunks are proxied.
- **SHIMS** — patches `document.cookie` setter to strip `Domain=` attributes, so cookies set with their real domain land on the proxy host instead of being rejected by the browser.

**Cookie forwarding:** The browser sends cookies for the proxy domain (`{slug}.app.onetrueos.com`). These are forwarded as-is in the `Cookie` header to the upstream. Sites set cookies via `Set-Cookie` in responses; the proxy strips `Domain=` so they land on the proxy origin and are returned on subsequent requests. This means the user's upstream session (guest tokens, CSRF tokens, etc.) accumulates correctly across page loads.

**Header stripping (`HOP_BY_HOP` in `proxy.ts`):** Several header categories are stripped before forwarding to upstream:
- Standard hop-by-hop headers (`connection`, `transfer-encoding`, etc.)
- `Sec-Fetch-*` and `Sec-CH-*` — browser security metadata that reveals the cross-origin iframe context; X uses these to detect proxy/WebView access. Like `Sec-CH-*` (see "Client hints" below), `Sec-Fetch-*` is stripped and then replaced with computed values, not just dropped — see "Sec-Fetch-* headers" below.
- `forwarded`, `x-forwarded-for/host/proto`, `x-real-ip` — Vercel injects these on every inbound request; forwarding them tells upstream we're a proxy.
- All `x-vercel-*` headers (matched by prefix) — Vercel injects deployment metadata (e.g. `x-vercel-deployment-url`) that trivially identifies the request as coming from Vercel infrastructure. **This was the root cause of X's "Please use X.com or official X apps" error.**

**Accept-Encoding:** Must be set to `gzip, deflate, br, zstd` to match current Chrome's fingerprint. Cloudflare uses this value as a bot-detection signal. We send it explicitly (stripping whatever the browser sent) and manually decompress brotli responses in case undici doesn't handle `br` automatically.

**Client hints (`sec-ch-ua*`):** Real Chrome sends `sec-ch-ua`, `sec-ch-ua-mobile`, `sec-ch-ua-platform` on every single request — these are stripped from the incoming browser request (see `HOP_BY_HOP` above, since the real values would reveal the cross-origin iframe context) but must be **replaced**, not just dropped. A request claiming to be Chrome via `User-Agent` while missing these headers entirely is a stronger, simpler bot signal than TLS JA3/JA4 mismatches. Keep the version numbers in these headers, the `User-Agent` string, and the sidecar's TLS profile (below) all in agreement with a current Chrome release.

**Sec-Fetch-* headers:** The incoming request's own `Sec-Fetch-Site`/`-Mode`/`-Dest`/`-User` values reflect a same-origin request to our own proxy subdomain (REPLACEMENTS rewrites all outgoing site JS calls to relative paths on the current origin), not a real visit to the bound domain — so they're stripped and recomputed by `computeSecFetchHeaders()` in `proxy.ts` instead of forwarded as-is. `Sec-Fetch-Site` is derived from the relationship between the bound domain and the actual fetch target (`same-origin` / `same-site` / `cross-site`, using `tldts`'s public-suffix-list-aware `getDomain()` for the same-site comparison — a naive last-two-labels split would misclassify multi-label-suffix domains like `co.uk`). `Sec-Fetch-Mode`/`-Dest`/`-User` are passed through from the incoming request as-is, since those describe the request itself rather than the site relationship and the real browser already computes them correctly for its (same-origin, post-rewrite) request to us.

Whether these survive to the actual upstream request depends on the outbound path: undici/direct `fetch()` (no sidecar) sends them as given. The sidecar's driven Chrome, however, recomputes and overwrites `Sec-Fetch-*` from real request context regardless of what's set via CDP `Fetch.continueRequest` — see the sidecar paragraph below and `PROPOSALS/custom-chromium-build.md` for the in-progress fix.

**IP-based blocking:** Sites like X and Instagram reject requests from known datacenter IPs (Vercel runs on AWS). Set an outbound HTTP/SOCKS5 residential proxy URL via the admin panel (`proxy_config` DB row — no env var, see pitfall #6). Mullvad and VPN ranges are also typically blocked. `src/runtime/webview/proxy.ts`'s `resolveOutboundProxy()` reads that row and passes the resulting agent as the `dispatcher` to undici's `fetch`. Note: this only masks the IP — the TLS handshake still originates from Node.js and carries its own fingerprint (see below).

**TLS fingerprinting:** Cloudflare Bot Management fingerprints the TLS ClientHello (JA3/JA4 — cipher suites, extensions, ordering). Node.js/undici produces a fingerprint that Cloudflare identifies as non-Chrome. Even through a residential proxy, the TLS handshake goes directly from our Node.js process to upstream. Symptoms: X deletes the `ct0` CSRF cookie on every page load, blocking login. Cloudflare returns 403 HTML challenge pages for some endpoints.

**TLS sidecar** (`sidecar/`): Node server driving **real Google Chrome** via Patchright (a stealth-patched Playwright), not TLS impersonation — see `SETUP_SIDECAR.md` for why Chromium/impersonation don't hold up and real Chrome does. When `SIDECAR_URL` is set, Vercel routes all upstream fetches through it instead of direct undici. Auth via `SIDECAR_SECRET` (Bearer token, or `?secret=` query param on the sidecar's own `/admin` status page, since a plain browser navigation can't set an Authorization header). Because browsers refuse to let page JS set `Origin`/`Referer`/`Cookie` via `fetch()` (forbidden headers), the sidecar intercepts at the CDP `Fetch` domain to override them before the request leaves Chrome — this is what lets `proxy.ts`'s Origin/Referer spoofing keep working with a real browser underneath. If the sidecar's own resolved proxy config (see next paragraph — admin-panel-driven, not an env var) has a URL set, Chrome is pointed at a local proxy started via `proxy-chain`'s `anonymizeProxy()`, which holds the real upstream proxy credentials itself and forwards to it — avoids the same conflict as always (Chrome's own internal proxy-auth handling fights our `Fetch` domain interception if given the authenticated URL directly, hanging every request; see `SETUP_SIDECAR.md`).

There used to *also* be a local MITM proxy here (`sidecar/mitm-proxy.mjs`, `http-mitm-proxy` — removed) that additionally corrected `Sec-Fetch-*` headers, which Chrome recomputes from real request context regardless of CDP overrides. That correction required fully terminating Chrome's TLS connection and re-establishing a new one from Node's own TLS stack to the upstream — which produces a Node/OpenSSL JA3/JA4 fingerprint instead of Chrome's, for the one connection this whole sidecar exists to keep genuinely Chrome-flavored. Confirmed empirically: a direct Chrome session through the identical upstream IP (no MITM, no interception at all) succeeded at an X login flow that failed every time through the MITM'd pipeline. Removed — `Sec-Fetch-Site` being wrong is the smaller cost; `anonymizeProxy()` only tunnels bytes, no termination, so Chrome's real TLS handshake reaches the upstream untouched.

Fixing this properly, without reintroducing TLS termination, is in progress in a separate fork: `chromium-fork` (`Cold-Air-Networks/chromium-fork`, cloned locally at `~/Code/chromium-fork`) patches `services/network/sec_header_helpers.cc` to leave `Sec-Fetch-*` alone when `Fetch.continueRequest` already set a value, gated behind a new `PreserveOverriddenSecFetchHeaders` feature (off by default; harmless no-op on stock Chrome). `sidecar/server.mjs` passes `--enable-features=PreserveOverriddenSecFetchHeaders` at launch. The build/deploy pipeline for the patched binary now works: `chromium-fork`'s Gitea Actions CI provisions a throwaway Hetzner box, builds `out/Default` (component build, `dcheck_always_on=false`), tars it (excluding `obj`/`gen`), and uploads `{sha}.tar.gz` to the MinIO `chromium-builds` bucket at `s3.quineglobal.com`. The sidecar downloads that artifact at startup and launches it via `executablePath` when `CHROMIUM_ARTIFACT_SHA` is set (else `CHROMIUM_EXECUTABLE_PATH`, else stock `channel: 'chrome'`) — see `sidecar/chromium-artifact.mjs`. **Still unproven in production:** whether a self-built Chromium passes the same site detection real Chrome passes at all — real Chrome was required because Playwright's bundled Chromium got blocked regardless of headers/UA, and the leading suspects (Widevine CDM presence, `navigator.userAgentData.brands`) were never confirmed. See `PROPOSALS/custom-chromium-build.md`.

**`X-Gproxy-Navigation` priority patch (fetch-as-navigation) — reverted, leave the fork's patch in place:** This experiment tried to make X's `begin_login` (and every other proxied request) look like a top-level navigation for bot-scoring purposes: the sidecar marked every request with an `X-Gproxy-Navigation: 1` header via `Fetch.continueRequest`, and `chromium-fork` patched `services/network/url_loader.cc` to bump `net::RequestPriority` to `net::HIGHEST` (wire `u=0`) when that header was present. It was **reverted** because a diff against real-Chrome traffic showed a genuine `begin_login` is a plain `fetch()` — `Sec-Fetch-Dest: empty`, `Sec-Fetch-Mode: cors`, HTTP/2 priority `u=1` — so the navigation spoof (both the `Sec-Fetch` `document`/`navigate` override and the `u=0` bump) produced a fingerprint X has never seen a real client send. The sidecar no longer injects the header and `proxy.ts` no longer drops the browser's `Priority` header. The `chromium-fork` patch itself (the `HasHeader("X-Gproxy-Navigation")` branch and the strip in `url_loader_util.cc`) is **left in place** — it's header-gated, so with no one setting the marker it's a harmless no-op, and removing it would force an otherwise pointless fork rebuild/redeploy. Do not re-enable the marking without re-confirming against fresh real-Chrome traffic.

**Sidecar's own proxy config** is admin-panel-driven, not an env var: `sidecar/config.mjs` polls `GET /app/api/sidecar-config` (the main app, bearer-gated by the shared `SIDECAR_SECRET`, AES-256-GCM-encrypting the value in transit) every 60s, and on a change writes it to a local bind-mounted file (`/var/proxy-sidecar/config.json` on `mainframe-2`) then exits — the container's restart policy brings up a fresh process that reads the new value, since Chrome doesn't support changing its proxy config after launch. The main app's own outbound fetches read the same `proxy_config` DB row directly (no polling needed, same process) — see pitfall #6. The sidecar's 60s poll delay is the one remaining source of temporary disagreement between the two after an admin panel change, not a bug.

**Sidecar's `/admin` page** (`sidecar/server.mjs`): a small status page (proxy URL in use, IP probe, uptime). Linked from the main app's admin panel (`sidecarAdminUrl` in `/app/api/admin/proxy-config`, built server-side so the frontend never assembles the secret itself).

Deployed on a Hetzner VM (`mainframe-2`) running NixOS, managed via the `petersweb-infra` repo — **do not deploy by hand**, see `SETUP_SIDECAR.md` § Deployment.

Deployment is CI-driven, on a **Gitea mirror**, not GitHub Actions: GitHub (`origin`) stays primary for Vercel/everything else, but a second remote (`gitea`, `forge.quinefoundation.com/Cold-Air-Networks/gproxy`) exists specifically for this — push there to trigger `.gitea/workflows/sidecar-build.yml`, which builds (`linux/amd64` — Chrome has no ARM64 Linux build) and pushes to the forge's own registry, then opens a PR against `petersweb-infra` bumping the pinned image digest. Merging that PR and running `nixos-rebuild switch` on `mainframe-2` is what actually deploys it. Pushing to GitHub `origin` alone does not deploy the sidecar. There is no vendored copy of the sidecar source in `petersweb-infra` anymore and no local `podman build` on the host — don't reintroduce either.

**Castle.io webpack chunk (X-specific):** X's bot-detection SDK (`ondemand.castle.*.js`) is a webpack chunk that was previously fully stubbed out here (`extractWebpackChunkStub` in `proxy.ts`, every module body replaced with a no-op) because it was reported to crash in the cross-origin iframe context. That stub is now **off by default** — the real script is served as-is — because it meant Castle never generates the `$castle_token` X's `begin_login` endpoint expects, which is the likely actual cause of the "Please use X.com or official X apps" login error, and the crash it worked around didn't reproduce in repeated local testing. `CASTLE_FORCE_STUB=1` restores the old fully-stubbed behavior as a fast rollback if serving the real script turns out to break login worse. See `CASTLE_TOKEN.md` — if the real script does crash in production, the plan is to patch whatever specific thing breaks, not re-stub the whole module.

**Castle SDK obfuscation (reference for re-deobfuscating a new build):** Castle's string literals are obfuscated, but **not uniformly** — in the current `castle.umd-*.js` build, most fingerprint property names (e.g. `location`, `hostname`, `navigator`, `userAgentData`, `cookie`, `font`, `screen`) are **plaintext minified variable assignments**, so `grep`ping a chunk for a *property name* works. Only a minority — the font-fingerprint list, some key names and error messages — go through the cipher below. The plaintext for those only exists in memory, decoded lazily through memoized string-lookup functions (`s(key)` / `s(e,t,n,r)`). `base64` is the *transport container* for the ciphertext inside a text bundle — it is not the obfuscation itself; the decoded bytes are scrambled further. Two schemes we've cracked:

- **X's `castle.umd-*.js` (bundled with Rolldown + a custom cipher)**: `atob` → treat bytes as **UTF-16BE code units** (pairs `(b[i]<<8)|b[i+1]`) → **XOR each unit with a rolling LCG keystream** (`state = (40503*state + 13849) & 65535`, per-blob seed) → `String.fromCharCode`. So base64-decoding alone yields gibberish; the XOR keystream is the actual cipher. Tooling tell: the `import{t as e}from"./rolldown-runtime-<hash>.js"` line — X builds through **Rolldown** (Rust bundler), *not* webpack, and the LCG string cipher isn't a recognizable public obfuscator (looks hand-rolled / a custom plugin).
- **npm `@castleio/castle-js` 2.8.3–2.8.5 (`castle.browser.js`) (webpack + javascript-obfuscator-style string array)**: three layers — **deflate** string table (embedded inflate, the `Uint16Array(16)`-allocating `l()`), then **`atob` base64** per entry, then **per-call factory decoders** (`J`/`W`/`j`/`L`/`F`/`E`/`T`/`O`, memoized, each a slightly different bit-shift transform). Tooling tells: the `!function(n,r,i,t,o,u,f,v){…}` UMD wrapper is **webpack**, and `function e(){return parseInt.apply(null,arguments)}` / `parseFloat.apply(null,arguments)` / `Number.parseInt.apply(Number,arguments)` are a near-literal **javascript-obfuscator** fingerprint. The deflate layer is beyond stock javascript-obfuscator (it offers base64/rc4, not deflate), so that part is Castle's own. ≤2.8.2 uses a different scheme entirely (different string-lookup shape), so decode markers drift between releases.
- **The worker files (`cw.js`/`dw.js`)** use a plain **Caesar cipher** (`(c-65+n)%26+65`) plus a small lookup table — hand-rolled, not a product. (These are the small `csw.js`/`cw.js`/`dw.js` files in the npm dist, not X's chunk.)

Because X bundles through Rolldown and Castle's npm dist through webpack, the two will never byte-match — which is why version identification went through the font-list *data* (re-bundling survives, code diffing doesn't) rather than diffing the chunks.

This matters for `CASTLE_BUILD_VERSIONS` (see `proxy.ts`): we instrument the tamper-check function *shape*, and when X ships a new build that shape changes — caught by the `[castle] UNRECOGNIZED` guardrail. To re-derive a shape or pin the SDK version (done once: `castle.umd-*` = `@castleio/castle-js@2.8.3`, via the font list — `Sitka` and `Candara` only coexist in ≤2.8.3), re-run the decode rather than guessing. The two archived chunks live in `fixtures/castle/` with a `README.md` explaining the method.

**Castle domain/location reads (de-obfuscated, see `fixtures/castle/deobfuscation.md`):** The currently-served chunk (`castle.umd-Cs-TYKFF.js`, build `anonymous-try-return-v2`) reads the page's identity at these sites (offsets are into that chunk):

| read | minified site | leak |
|------|---------------|------|
| `window.location.hostname` | `r[0]=f2[D]\|\|window[rO][iO]\|\|Fv` (`rO='location'`, `iO='hostname'`) ~43383 | **the proxy slug subdomain, not x.com** |
| `window.location.ancestorOrigins` | `var n=window[rO].ancestorOrigins` (fn `si`) ~74200 | **iframe detection — `[]` in a real tab, `['https://app.app.onetrueos.com']` in our iframe** |
| `window.location.origin` | `sa(function(e){return e.origin})` (fn `vJ`) ~415191 | proxy origin |
| `window.location.protocol` | `sa(function(e){return e[SO]})`, `SO='protocol'` (fn `YY`) ~415191 | `https:` — harmless |
| `document.referrer` | `_i(function(e){return e.referrer})` (fn `jW`) ~415191 | already shimmed to `x.com/` |
| `window.top.location.href` | `(window[KF][rO][qF], xn(!0))`, `KF='top'`, `qF='href'` (fn `Aq`) ~378588 | **iframe detection — throws cross-origin in the iframe** |
| `window.self === window.top` | `window.self===window[KF]` (fn `lZ`) ~445089 | **iframe detection — `false` in the iframe** |

Castle reads `window.top`/`window.self` but **not** `window.parent`, `window.opener`, `window.frameElement`, or `window.frames` (the `parent` hits are DOM `parentNode`/`parentElement`).

`window.location` (and `window.top`/`window.self`) are **non-configurable** in real Chrome (verified: `Object.defineProperty(window, 'location', …)` / `(location, 'hostname', …)` / `(document, 'location', …)` all throw "Cannot redefine property"), so there is no global shim — the only fix is to rewrite these read sites *inside* the bundle via `instrumentCastleBuild` (shape-matched, registered in `CASTLE_BUILD_VERSIONS`), replacing `window[rO][iO]` → `'x.com'`, `window[rO].ancestorOrigins` → `[]`, `window[KF][rO][qF]` → `'https://x.com/'`, and `window.self===window[KF]` → `true`. All shapes are stable and greppable, each patch is whitespace-tolerant and logs loudly if it matches nothing. This is the leading suspect for the remaining "We've temporarily limited your login" after the sec-fetch/priority/Set-Cookie/TLS fixes all landed.

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
| X login "Please use X.com or official X apps" / "We've temporarily limited your login" | Confirm sidecar `/health` shows `engine=chrome(patchright)` and `proxyOk: true`; see `SETUP_SIDECAR.md` for the full real-Chrome-vs-Chromium-vs-headless breakdown |
| X `ct0` cookie zeroed on page load | **Not necessarily a problem** — real Chrome also gets `ct0` zeroed on a bare document GET; X only issues a real `ct0` on the first API/GraphQL call. Don't treat this alone as a block signal (see `SETUP_SIDECAR.md`) |

## Driving Chrome via Patchright (debugging the intercept script)

When driving the webview with Patchright to debug the injected intercept script,
`page.evaluate()` (and `page.addInitScript()`) run in an **isolated world**, not
the page's main world:

- They **share the DOM** — `document.body.innerHTML`, `document.querySelectorAll`,
  etc. return the real page state.
- They do **not** share JS globals that inline page scripts mutate. So
  `page.evaluate(() => window.fetch.toString())` returns `"[native code]"` even
  when the intercept script has already patched `window.fetch`, and
  `page.evaluate(() => document.hasOwnProperty('cookie'))` is `false` even when
  the intercept script's `Object.defineProperty(document, 'cookie', …)` ran.
  This is a false negative — don't conclude "the patch didn't apply" from it.

**Ground truth is the network layer:** `page.on('request')` / `page.on('response')`
show the actual request URLs, which reveal whether the intercept script's
URL rewrite is working (e.g. `api.x.com/…` → `…/api.x.com/…`) or a request is
escaping to the origin directly. To inspect main-world globals, inject a
diagnostic `<script>` into the HTML via `page.route` (same world as the intercept
script) and read the output from `page.on('console')`.

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