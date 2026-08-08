# DeepSeek Context Summary

This file consolidates the key architectural and operational knowledge from the repository's markdown documentation, intended to give an AI assistant a quick orientation before making changes.

## Core Architecture

- **GlobalOS PROXY** is a monorepo for a browser-based desktop.
- Backend: Hono on Node, deployed as a single Vercel function (`api/index.ts`).
- Frontend: React SPA in `src/frontend` (Vite, TanStack Router, Fela).
- Database: PostgreSQL via Drizzle ORM.
- Auth: better-auth.
- `.gapp` directories are stored as `file`/`directory` rows, snapshotted to `image.tar_bytes`, served from `{instanceSlug}.app.onetrueos.com`.

## Key Concepts

- **Global PC** → **Workspace(s)** → **Process(es)** → **Window(s)** + **Instance(s)**.
- **Session kernel** (`src/frontend/src/kernel/session-kernel.ts`) is the parent-page `postMessage` bridge for iframe apps.
- **Syscalls** (`POST /api/syscalls`) provide platform operations (filesystem, etc.).
- **Webview proxy** (`src/runtime/webview/proxy.ts`) fetches external sites through the backend, rewriting headers and injecting scripts.

## `.gapp` Paradigm

- Apps must use `window.parent.postMessage` to request platform services.
- Kernel is app-agnostic; no per-app branches.
- Opaque process state stored in `localStorage` under `workspaceId:processId`.
- Reference apps: helloworld, filebrowser, squint-editor, twitter, instagram, youtube, doom.

## Webview Proxy

- `POST /api/webviews` creates a webview row with slug → subdomain.
- Proxy fetches upstream, strips hop-by-hop headers, rewrites `Origin`/`Referer`, injects intercept script.
- TLS fingerprinting is handled by a sidecar running real Chrome via Patchright.
- Sidecar deployment is CI-driven via Gitea mirror, not GitHub Actions.

## Vercel Pitfalls

- Auth body must be buffered.
- DB pool max 3; avoid per-request DB calls in webview hot path.
- Launch must not load tar_bytes.
- Function maxDuration 30s.
- Proxy config is stored in DB (`proxy_config` table), not env var.

## Proposals

- **dynamic_linking.md**: `gapp.json` manifest for dependencies, with `bundled`/`cdn`/`platform` sources.
- **text_bundle.md**: `.tbundle` format for human-readable archives.
- **PATH_ADDITION.md**: command registry with short name → canonical → exec.
- **open_with.md**: `openWith` payload for launching apps with context.
- **custom-chromium-build.md**: patched Chromium to fix `Sec-Fetch-*` headers.
- **reduce-complexity.md**: audit findings for gapp compile pipeline.
- **window_lifecycle.md**: window patterns and process vs task distinction.
- **webviews.md**: WebView proxy architecture.

## Known Issues

- **DOOM_GAPP.md**: intermittent WASM crash in Doom app, defensive fixes applied.
- **CASTLE_TOKEN.md**: X login failure due to missing `$castle_token` from Castle.io stub.

## Development Commands

```bash
npm run dev:backend
npm run dev:frontend
npm run vercel-build
cd src/frontend && npm run regenerate
npx drizzle-kit generate
npx drizzle-kit push
npm run db:migrate
```

## Conventions

- ESM throughout, imports use `.js` extensions.
- Do not edit generated files (`routeTree.gen.ts`) by hand.
- Keep kernel app-agnostic.
- Add new API routes under `src/routes/` or `src/app.ts`.
- Add new DB tables to `src/db/schema.ts` + migration SQL.
