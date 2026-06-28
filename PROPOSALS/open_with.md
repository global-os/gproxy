# Open-with launch context for `.gapp` apps

Proposal for passing an opaque “open this target” payload when launching or focusing an app, so the workspace can open File Browser to a specific folder (or file) without app-specific kernel branches or new backend routes.

## Problem

Today, launching a `.gapp` only opens the app in its default state:

- `POST /api/sessions/:sessionId/launch` resolves process + instance + window.
- The iframe loads; apps that need kernel state send `ready` and receive `init` / `init:fresh`.
- There is no way to say “open File Browser **at** `Desktop/foobar/`” when the user clicks a folder icon on the desktop.

Desktop icons are heterogeneous: `.gapp` bundles launch themselves; ordinary folders and files do not. Users expect folder icons to open in a file manager, not to do nothing.

## Goals

1. **App-agnostic kernel** — one generic message shape; no `if (bundleName === 'filebrowser')` in `SessionKernel`
2. **Fast launch** — no new DB columns or server-side context storage; launch handler unchanged
3. **Focus + navigate** — if the target app is already running, focus its window and deliver a new target
4. **Opaque payload** — schema owned by the app; kernel forwards JSON as-is
5. **Incremental** — File Browser is the first consumer; other apps may ignore `openWith`

## Non-goals (for v1)

- Per-file-type association registry in the database
- `gapp.json` `opens:` manifest parsing in the shell (hardcode File Browser for folders/files on desktop for now)
- Opening files inside nested paths without a resolved parent directory id (desktop files only)
- Persisting launch context in `localStorage` process state (one-shot per launch/focus)

## Design

### `openWith` payload (app convention)

The kernel does not validate this shape. File Browser interprets:

```json
{
  "entryType": "directory",
  "id": 42,
  "name": "foobar"
}
```

| Field | Meaning |
|-------|---------|
| `entryType` | `"directory"` or `"file"` |
| `id` | `directory.id` or `file.id` in the user's filesystem |
| `name` | Optional display hint (path bar, selection label) |

**Directory:** browse `id` via `fs:browse` / `directoryId`.

**File (desktop):** browse Desktop (`directoryId` omitted), then select the entry matching `id`.

### Kernel API (workspace shell)

New methods on `SessionKernel` (exposed via `useSessionKernel`):

| Method | When |
|--------|------|
| `stageOpenWith(processId, openWith)` | New window: stash payload until iframe sends `ready` |
| `deliverOpenWith(processId, openWith)` | Existing window: `postMessage` immediately |

Internal map: `pendingOpenWith: Map<processId, Record<string, unknown>>`.

### Kernel → iframe messages

**On `ready` (unchanged flow, extended payload):**

```json
{ "type": "init:fresh", "reason": "fresh", "openWith": { ... } }
```

`openWith` is included only when staged; consumed once (deleted from `pendingOpenWith`).

If the app has saved process state, `init` may also include `openWith` when staged (one-shot overlay; not merged into persisted state).

**While running:**

```json
{ "type": "open:with", "openWith": { ... } }
```

Posted to every iframe bound to that `processId` when `deliverOpenWith` runs. If no iframe is registered yet, fall back to `stageOpenWith`.

### Workspace desktop behavior

| Desktop item | Action |
|--------------|--------|
| `*.gapp` directory | `launch(directoryId)` — no `openWith` |
| Ordinary folder | Find `filebrowser.gapp` on desktop → `launch` + `openWith: { entryType: 'directory', id, name }` |
| File on desktop | Same handler → `openWith: { entryType: 'file', id, name }` |

After `POST .../launch` returns:

- `action: 'open'` → `stageOpenWith(result.processId, openWith)` before the iframe mounts
- `action: 'focus'` → `deliverOpenWith(result.processId, openWith)` then `focusWindow`

Launch API body and response are **unchanged**; `processId` is already returned and used client-side.

### File Browser (first consumer)

1. On load: `postMessage({ type: 'ready' })` to parent (same as Hello World).
2. On `init` / `init:fresh`: read optional `openWith`, browse initial directory.
3. On `open:with`: update target and re-browse.

No kernel changes for `fs:*` syscalls.

## Flow

```
User clicks "foobar" on desktop
  → Workspace finds filebrowser.gapp
  → POST /api/sessions/:id/launch { directoryId: <filebrowser.gapp id> }
  → launch returns { action, processId, window }
  → stageOpenWith(processId, { entryType: 'directory', id: <foobar id> })
  → iframe loads, posts ready
  → kernel: init:fresh + openWith
  → filebrowser: fs:browse(directoryId: foobar)
```

If File Browser is already open:

```
  → launch returns { action: 'focus', processId, window }
  → deliverOpenWith(processId, { entryType: 'directory', id: <foobar id> })
  → filebrowser receives open:with, re-browses
```

## Files to change

| Area | File | Change |
|------|------|--------|
| Kernel | `src/frontend/src/kernel/session-kernel.ts` | `pendingOpenWith`, `stageOpenWith`, `deliverOpenWith`, extend `onReady` |
| Kernel hook | `src/frontend/src/kernel/useSessionKernel.ts` | Export staging/delivery helpers |
| Workspace | `src/frontend/src/components/Workspace/index.tsx` | Desktop click routing, launch + openWith |
| App | `fixtures/.../filebrowser.gapp/app.js` | `ready`, handle `init` / `open:with` |
| Fixture | `fixtures/.../Desktop/foobar/` | Demo folder for manual testing |
| Docs | `CLAUDE.md`, `README.md` | Document `open:with` in kernel message table (follow-up) |

## Testing

1. Seed fixtures (`npm run db:seed`).
2. Refresh workspace (kernel lives in shell frontend).
3. Close and relaunch File Browser once (new `.gapp` tar).
4. Click `filebrowser.gapp` → opens at Desktop.
5. Click `foobar` → opens (or focuses) File Browser inside `foobar`.
6. With File Browser already open, click `foobar` again → same window navigates without a second window.

## Future work

- **`gapp.json` `opens`:** e.g. `"opens": ["directory", "file"]` so the shell picks a handler without hardcoding `filebrowser.gapp`
- **Nested files:** extend desktop API or add `fs.resolve` syscall so `openWith` for a file includes `parentId`
- **Default app preferences:** user-chosen handler per MIME/type
- **Launch body `openWith`:** optional echo through API for logging or multi-client sync (not required for v1)