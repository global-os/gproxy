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

```
Session (workspace)
  └── Process (1 per session + .gapp directory)
        └── Instance(s) (runtime; public subdomain = instances.slug UUID)
              └── workspace_window (UI chrome: position, title, iframe src)
```

- **Launch** (`POST /api/sessions/:sessionId/launch`): validate session + `.gapp`, find/create process + instance, open or focus window. Must return quickly.
- **Instance serve** (`*.app.onetrueos.com`): `ensureInstanceReady` resolves image metadata, loads `tar_bytes`, extracts to `/tmp`, serves files from memory map.
- **Session kernel** (`src/frontend/src/kernel/`): parent-page `postMessage` bridge; opaque JSON state per `sessionId:processId` in `localStorage`. App-agnostic — no per-app handlers in the kernel (see **`.gapp` paradigm** below).
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

**Opaque process state:** On successful `save`, kernel stores the message payload (minus `type`) in memory and `localStorage` under `sessionId:processId`. Schema is **owned by the app**; kernel does not interpret fields beyond `filename` / `content` for the save syscall.

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

Optional: `DATABASE_SSL=true`, `POSTMARK_*`, `INSTANCE_*` overrides.

## Vercel / serverless pitfalls (read before changing auth, launch, or DB code)

1. **Auth body stream:** Never pass raw `c.req.raw` to `auth.handler()` on POST without buffering. `api/index.ts` sets `incoming.rawBody`; `src/routes/auth.ts` uses `buildBufferedRequest()`.

2. **Pool size:** Serverless pool `max: 3` (`src/db/index.ts`). `setRlsUser` holds a connection for the whole request. Routes that use global `db` must **not** run under `setRlsUser` — see `src/routes/programs.ts` (launch/windows). FS routes use `c.get('db')` with RLS correctly.

3. **Launch timeouts:** Do not `SELECT image.tar_bytes`, `hashDir`, `buildTar`, or `ensureInstanceContent` inside the launch handler. Launch only uses `resolveImageMeta()` (id + checksum). Heavy work belongs in `ensureInstanceReady()` when the iframe loads. Placeholder checksum: `PENDING_INSTANCE_CHECKSUM` in `src/runtime/instance-constants.ts`.

4. **Function limit:** `maxDuration: 30` in `vercel.json`. Instance first-load can approach this if tar build/extract is slow.

5. **Health vs debug:** `/health` is for monitors (includes auth probe). `/debug` is operator diagnostics — do not expose secrets there.

## Debugging checklist

| Symptom | Check |
|---------|--------|
| Auth 504 ~15s | `/debug` `authProbe`; `hasRawBody`; body buffering in `api/index.ts` |
| Launch 504 ~30s | Vercel logs for `[launch]` timing; ensure launch path isn't loading `tar_bytes` |
| Windows 500 | Was pool deadlock with `setRlsUser` on programs router; verify fix intact |
| Instance 502 | `ensureInstanceReady` logs; image row exists; tar extract to `/tmp` |
| Schema errors | `/debug` `schema.missing`; run `scripts/apply-pending-migrations.mjs` |

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