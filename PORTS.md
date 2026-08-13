# Ports

## Local Dev

| Port | What | Where |
|------|------|-------|
| **3000** | Hono backend (`tsx src/index.tsx`) | `src/index.tsx:49` |
| **3443** | Vite frontend, HTTPS (`vite dev`) — non-privileged | `src/frontend/vite.config.ts` |
| **443** | Vite frontend, HTTPS (`vite dev`) — privileged | `src/frontend/vite.config.ts` |
| **5173** | Vite default (legacy, unused) | killed on startup as cleanup |
| **6006** | Storybook (`storybook dev`) | `src/frontend/package.json:12` |

## Production

| Port | What | Where |
|------|------|-------|
| **443** | Standard HTTPS (Vercel edge) | implicit in all `https://` URLs |
| **5432** | PostgreSQL database | `DATABASE_URL` in `.env` |
| **8080** | TLS sidecar HTTP server | `sidecar/server.mjs:20` (on `mainframe-2` VM) |
| **10001** | Outbound residential proxy | admin panel `proxy_config` table (dev in `.env`) |

## Rules

- **Backend (`npm run dev:backend`)** kills old process on **3000** before starting.
- **Frontend (`npm run dev:frontend`)** binds to **443** (requires `sudo` on macOS/Linux).
  - **`npm run dev:frontend:3443`** binds to **3443** (no `sudo` needed) — secondary target.
  - Both kill old processes on the target port + **5173**, generate mkcert certs, then start Vite.
- On Vercel (production), the dev port logic is gated behind `!process.env.VERCEL` — none of these scripts run.
- The browser auto-opens `https://app.app.dev.onetrueos.com:{port}` (no `:443` suffix when binding to 443).
- Vite proxies `/api` → `http://127.0.0.1:3000/app/api` (rewrites the path prefix).
