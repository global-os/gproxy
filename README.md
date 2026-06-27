# GlobalOS (PROXY)

Backend and SPA for [GlobalOS](https://app.app.onetrueos.com) — a browser-based desktop where users open workspace sessions, launch `.gapp` bundles from their virtual Desktop, and run apps in iframe windows served from per-instance subdomains.

Production runs as a **single Vercel serverless function** (`api/index.ts` → Hono `src/app.ts`). Postgres holds users, filesystem metadata, app images (tarballs), processes, instances, and window layout.

## Architecture

```
Browser (app.app.onetrueos.com)
  ├── SPA (src/frontend) — sessions, workspace, auth UI
  ├── /api/*             — auth, fs, launch, windows
  └── iframe src:
        {instanceId}.app.onetrueos.com  →  /instance/{id}/*  →  extracted .gapp from /tmp
```

**Launch flow**

1. User clicks a `.gapp` on the Desktop → `POST /api/sessions/:id/launch`
2. Server finds or creates a **process** (one per session + directory), ensures an **instance** (runtime slot)
3. Server opens or focuses a **workspace window** with `src` pointing at `{instanceSlug}.app.onetrueos.com` (UUID slug, globally unique)
4. First iframe request triggers **bundle resolve + extract** (`ensureInstanceReady`) — not during launch

**Data model (simplified)**

| Entity | Role |
|--------|------|
| `sessions` | Workspace (per user) |
| `process` | One per session + `.gapp` directory |
| `instances` | Runtime for a process; public host = `instances.slug` (UUID) |
| `workspace_window` | Persisted window geometry + iframe target |
| `directory` / `file` | Virtual FS (RLS-scoped per user) |
| `image` | Cached tar snapshot of a `.gapp` directory |

Hostname-based routing lives in `src/utils.ts` — `app.app.*` paths map to `/app/...`; `*.app.*` maps to `/instance/{slug}/...`.

## `.gapp` apps and the session kernel

A **`.gapp`** is a directory on the user's virtual Desktop (e.g. `helloworld.gapp/`) treated as a launchable application. It is stored in Postgres as `directory` / `file` rows under the user's filesystem tree, snapshotted to `image.tar_bytes` when an instance first loads, and served as static files from `{instanceSlug}.app.onetrueos.com`.

### Why postMessage?

The workspace SPA runs on `app.app.onetrueos.com`. Each running app loads in an **iframe on a different origin** (the instance subdomain). Browsers block credentialed `fetch('/api/...')` from the iframe to the workspace origin, so apps **cannot call the API directly**.

Instead, apps talk to the parent page through **`window.postMessage`**. The **session kernel** (`src/frontend/src/kernel/session-kernel.ts`) listens on the workspace, performs authenticated `fetch` on the app's behalf, and posts results back into the iframe.

```
  ┌─────────────────────────────────────────────┐
  │  Workspace (app.app.onetrueos.com)          │
  │  SessionKernel ──fetch──► POST /api/syscalls│
  │       ▲ postMessage                         │
  │       │                                     │
  │  ┌────┴──────────────────────────────┐      │
  │  │ iframe: {uuid}.app.onetrueos.com  │      │
  │  │  helloworld.gapp / filebrowser    │      │
  │  └───────────────────────────────────┘      │
  └─────────────────────────────────────────────┘
```

The kernel stays **app-agnostic**: it knows message *types* and syscalls, not per-app UI logic. App-specific behavior lives entirely inside the `.gapp` HTML/JS.

### App lifecycle (example: `helloworld.gapp`)

1. App loads → sends `{ type: 'ready' }` to parent.
2. Kernel replies with persisted process state or a fresh start:
   - `{ type: 'init', filename, content, ... }` — restore from `localStorage` (keyed by `sessionId:processId`)
   - `{ type: 'init:fresh', reason, filename }` — no saved state
3. On save, app sends `{ type: 'save', filename, content, ... }`.
4. Kernel calls `fs.saveDesktopFile` via syscalls, persists opaque state, posts `{ type: 'save:complete' }` or `save:error`.

See `fixtures/by-user/peterson@sent.com/~/Desktop/helloworld.gapp/index.html`.

### System calls (platform APIs)

Privileged operations (filesystem, etc.) go through **`POST /api/syscalls`** with `{ op, ...args }`. The kernel is the only caller from iframe apps today.

| Op | Purpose |
|----|---------|
| `fs.browse` | List a directory (`directoryId` optional; defaults to Desktop) |
| `fs.mkdir` | Create folder |
| `fs.rename` | Rename file or directory |
| `fs.delete` | Delete file or directory |
| `fs.saveDesktopFile` | Upsert a file on Desktop |

Apps can use typed shorthand messages (kernel maps them to syscalls):

- `fs:browse` → `fs:browse:complete` / `fs:browse:error`
- `fs:mkdir`, `fs:rename`, `fs:delete` — same pattern

Or the generic form: `{ type: 'syscall', op, requestId, ...args }` → `syscall:complete` / `syscall:error`.

Implementation: `src/syscalls/`, `src/routes/syscalls.ts`. Handlers use RLS-scoped DB access for the logged-in user.

### Authoring a `.gapp`

| Style | Example | Notes |
|-------|---------|-------|
| **Static** | `filebrowser.gapp` | Plain `index.html` + ES modules; third-party libs vendored as `.mjs` files (`preact.mjs`, `hooks.mjs`) + import map — no bundler required |
| **Squint** | `squint-editor.gapp` | `app.cljs` compiled to `app.js` at instance build; optional platform deps (`yjs`, `rxjs`) from `src/gapp/registry/` |

Minimum contract for workspace integration:

- Send `ready` on load if you need kernel init or syscalls.
- Use `window.parent.postMessage({ type, ... }, '*')` and listen for replies on `window`.
- Keep all app UI and state schema inside the `.gapp`; the kernel only stores opaque JSON for `save`/`init`.

Fixture apps for the demo user live under `fixtures/by-user/<email>/` and are synced into the DB on deploy (`npm run db:seed` / `vercel-build`). Edit fixtures, seed, then relaunch the app so a new instance tar is built.

## Requirements

- Node 24.x, npm ≥ 10
- PostgreSQL

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | Postgres connection string |
| `BETTER_AUTH_SECRET` | yes | Auth signing secret |
| `BETTER_AUTH_URL` | prod | Defaults to `https://app.app.onetrueos.com` |
| `DATABASE_SSL` | prod | Set `true` for managed Postgres (e.g. Neon) |
| `DATABASE_IPV4` | optional | Force IPv4 if needed |
| `POSTMARK_SERVER_TOKEN` | optional | Password reset email; logs link in dev without it |
| `POSTMARK_FROM_EMAIL` | optional | Default `noreply@onetrueos.com` |
| `INSTANCE_DOMAIN_SUFFIX` | optional | Default `app.onetrueos.com` in production |
| `INSTANCE_PUBLIC_*` | optional | Override iframe origin in dev |

See `.env` for local values.

## Local development

```bash
npm install
(cd src/frontend && npm install --legacy-peer-deps)

# Terminal 1 — API on :3000
npm run dev:backend

# Terminal 2 — Vite SPA (proxies /api to backend)
npm run dev:frontend
```

Local Postgres example:

```
DATABASE_URL=postgresql://yourusername@localhost:5432/postgres
```

### Database migrations

**Generate + push (local):**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

**Migrations on deploy:** `npm run vercel-build` runs `scripts/apply-pending-migrations.mjs` automatically (requires `DATABASE_URL` + `DATABASE_SSL=true` in Vercel env vars). New migrations under `drizzle/*/migration.sql` (from `20260626000000_instances` onward) are applied once and recorded in `app_migrations`.

**Apply manually (local or one-off):**

```bash
npm run db:migrate
# or: node --env-file=.env scripts/apply-pending-migrations.mjs
```

### Frontend routes

TanStack Router — regenerate after adding routes:

```bash
cd src/frontend && npm run regenerate
```

## Build & deploy

Vercel project: `global-os` (team `philip-petersons-projects`).

```bash
npm run vercel-build   # full production build
```

`vercel.json` rewrites all traffic to `api/index.ts` (30s `maxDuration`). Build stamps git SHA into `src/build-version.json` for the landing page and app shell.

Push to `main` triggers deploy + GitHub Actions health check against `/health`.

## API surface (public paths)

Paths below are as seen by the browser; internally they are prefixed with `/app` via `src/utils.ts`.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | no | Liveness: DB, schema, config, bundle, auth probe |
| GET | `/debug` | no | Deep diagnostics (tables, migrations, scrypt, auth probe) |
| POST | `/api/auth/*` | — | better-auth (sign-in, sign-up, session) |
| GET | `/api/fs/desktop` | yes | Desktop items for workspace |
| POST | `/api/syscalls` | yes | Platform syscalls (`fs.*`, etc.) |
| GET | `/api/sessions/:id/windows` | yes | Restore window layout |
| POST | `/api/sessions/:id/launch` | yes | Launch or focus a `.gapp` |
| GET | `/{instanceSlug}.app.../` | no | Serve extracted app static files |

## Operations

**Health check** (`GET /health`) returns `503` when degraded. Checks include:

- `DATABASE_URL` and `BETTER_AUTH_SECRET` present
- Frontend bundle on disk (`index.html`, `build-version.json`)
- DB pool + auth tables + app tables (`instances`, `workspace_window`, `verification`)
- Auth handler probe (POST sign-in expecting non-5xx)

**Debug** (`GET /debug`) adds migration status, full table list, scrypt benchmark, and request env (`hasRawBody`).

**Logs:** Vercel runtime logs — filter by route (`/api/sessions/1/launch`) or `[launch]` / `[instance]` prefixes.

## Project layout

```
api/index.ts              Vercel entry (buffers POST body, then Hono)
src/app.ts                Routes, static assets, instance serving
src/routes/               auth, fs, programs (launch/windows)
src/services/             launch-program, window-service, create-instance
src/runtime/              tar extract, instance cache, subdomain helpers
src/db/                   Drizzle schema, pool, image/file helpers
src/frontend/             React SPA (TanStack Router, Fela, workspace UI)
src/frontend/src/kernel/  postMessage bridge to iframe apps (see “.gapp apps” above)
src/syscalls/             syscall handlers invoked by POST /api/syscalls
fixtures/by-user/         demo .gapp trees seeded into Postgres
drizzle/                  SQL migrations
scripts/                  build, migrations, asset sync
```

## Known constraints (Vercel serverless)

- **Post body:** `api/index.ts` pre-buffers `IncomingMessage` into `rawBody` before Hono runs; auth rebuilds a buffered `Request` for better-auth.
- **DB pool:** `max: 3` on Vercel. `/api/fs` uses `setRlsUser` with `c.get('db')`; programs routes do **not** (would deadlock with global `db` + pool size 1).
- **Launch latency:** Launch must not `SELECT tar_bytes` or extract tarballs — that work runs in `ensureInstanceReady` on the first iframe load. First open may take longer than the launch API response.