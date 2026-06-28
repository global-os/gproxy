# Window lifecycle: patterns, processes, and tasks

Proposal for how `.gapp` apps declare and use **windows** — singleton, optional, or multi — and when headless work belongs on a **workspace process** vs a **Global PC task**.

Canonical architecture: [`docs/architecture.md`](../docs/architecture.md).

## Problem

Window open/close behavior is implicit today:

- `POST /api/workspaces/:id/launch` always creates or focuses **one** window (`launch-program.ts`).
- `DELETE …/windows/:id` removes the window row only; the **process** (and instance) can survive with `windowCount: 0` (visible in Manage).
- textedit implements a cooperative `die` / `die:response` handshake, but the shell never sends `die` and the kernel ignores the response.
- **Tasks** exist in schema and architecture but have no launch/management path in product code yet.

We need explicit **patterns** (exactly one window, one-or-zero, many, zero always) and clear rules for **process vs task**, so lifecycle policy, controllers, and `gapp.json` manifest fields have a consistent target.

## Core distinction

| Concept | Role |
|---------|------|
| **Window** | Desk UI chrome (geometry, title, iframe `src`). Always belongs to a **process** on that workspace. |
| **Process** | Workspace-scoped execution for one launched `.gapp`. Owns windows + instances. State keyed `workspaceId:processId`. |
| **Task** | Global PC–scoped work. No workspace parent. May be headless; UI via **embed** (window on some process points at task instance) or **syscall**. State keyed `globalPcId:taskId`. |
| **Instance** | Extracted `.gapp` runtime at `{slug}.app.onetrueos.com`. Belongs to a process or task. |

**Rule of thumb:** if it can stay at **zero windows forever** and is not tied to one desk, prefer a **task**. If the user launched from Desktop on a workspace and the work is **desk-local**, use a **process**.

## Window patterns

| Pattern | User expectation | Examples | Launch | When last / all windows close |
|---------|------------------|----------|--------|-------------------------------|
| **Exactly one** | At most one frame; relaunch focuses it | textedit, helloworld, terminal | Focus existing window or open one | Kill process (`terminateWhen: no-windows`) |
| **One or zero** | May run without UI for a while on this desk | Tray-like app, deferred UI, “minimized” desk service | May start process + instance without window | Policy: kill immediately, after idle, or keep (`explicit` / `idle`) |
| **Many** | Multiple independent or related frames | Multi-doc editor, doc + palette | First launch opens one; app requests more | Kill when **last** window closes (or `explicit`) |
| **Zero always** | No desk chrome; background or embedded only | Indexer, sync daemon, compile queue | Start runtime, no `workspace_window` | Stop via task quit, Manage, or policy |

### Exactly one (singleton)

- **Launch:** if the process already has a window → focus; else `createWindow`.
- **Close:** cooperative close (`die` → `die:response`) then delete window; if `terminateWhen: no-windows` → `killWorkspaceProcess`.
- **Relaunch:** new process or reuse per terminate policy (today `findOrCreateProcess` reuses the row).

### One or zero

- **Launch:** may create process + instance **without** opening a window (not implemented today).
- **Open UI later:** platform API or syscall → `createWindow` on existing process.
- **Zero-window phase:** process row + instance may remain; Manage shows `windowCount: 0`.
- **Use when:** work is still **about this workspace** but UI is optional or intermittent.

### Many (multi-window)

- **New window:** `createWindow` on existing process (same or new instance TBD).
- **Close one window:** others remain; process stays alive.
- **State:** opaque kernel state today is per `processId`; multi-window apps may need per-window or per-instance keys later.

### Zero always (headless)

- **As process:** uncommon — process tied to one workspace, no chrome. Needs skip-window launch and a clear terminate policy.
- **As task:** default for headless PC work — survives workspace delete, optional embed elsewhere.

## Zero windows on a process

A process **can** exist with zero windows (current behavior after close without kill). It still:

- Belongs to one **workspace**
- May keep **instances** running (subdomain still serves the bundle)
- Keeps **kernel state** in `localStorage` under `workspaceId:processId`
- Appears in **Manage** with `windowCount: 0`

**Good fits (desk-local, temporary or policy-driven):**

1. **Deferred UI** — warm instance before showing chrome.
2. **Brief gap** — user closed the window; process kept warm for fast reopen (`terminateWhen: explicit` or idle timeout).
3. **Desk-scoped background** — autosave or undo for *this desk only*, no visible frame.
4. **Headless controller** — platform lifecycle logic without a user-facing window (see controller proposal below).

**Poor fits (use a task instead):**

- Should run with **no workspace visit** open and no desk UI ever.
- **Shared across workspaces** on the Global PC.
- Must **survive workspace delete**.

## When to use a task

| | Process (0 windows allowed) | Task |
|--|----------------------------|------|
| Parent | Workspace | Global PC |
| Survives workspace delete | No | Yes |
| Survives visit end (tab closed) | Yes (DB row + instance) | Yes |
| Window chrome | Optional on that process | Only via **embed** in another process’s window |
| Discovery | Desktop launch, taskbar | PC task manager, syscalls, embed |
| Typical UI | iframe on desk | iframe `src` = task instance URL inside someone else’s window |

**Use a task when:**

- Headless by default (sync, watch folder, notifications, tracer).
- One runtime serves **multiple desks** (shared file index, auth helper).
- Lifetime is **PC-wide**, not “this workspace’s scratch pad.”
- UI is optional and hosted inside another app’s window (**embed**).

**Stay on process when:**

- User double-clicked a Desktop `.gapp` on a workspace (desk app semantics).
- State and lifetime are **per workspace**.
- UI is the normal interaction mode; zero windows is a phase, not the steady state.

## Decision flow

```text
User launches .gapp from Desktop on a workspace
  │
  ├─ Desk-local, usually has UI?
  │     ├─ Always exactly one window     → process, singleton
  │     ├─ Sometimes zero, sometimes one → process, one-or-zero
  │     ├─ Multiple windows              → process, multi
  │     └─ No desk UI / PC-wide / survives workspace delete
  │           → task (optional embed window elsewhere)
  │
  └─ Opened via “Open with” / syscall / embed only
        → usually process on that desk, or task if provider is PC-scoped
```

## `gapp.json` manifest (sketch)

Declarative policy for the shell **process controller** (CEL or JsonLogic for conditions — see lifecycle expressions in separate work):

```json
{
  "name": "textedit",
  "entry": "index.html",
  "runtime": "process",
  "windows": {
    "mode": "singleton"
  },
  "lifecycle": {
    "terminateWhen": "no-windows",
    "idleMs": null,
    "windowClose": "state.content != state.lastSaved ? 'confirm' : 'close'"
  }
}
```

### `windows.mode`

| Value | Meaning |
|-------|---------|
| `singleton` | At most one window; launch focuses or creates |
| `optional` | Zero or more; launch may omit window |
| `multi` | Zero or more; app may request additional windows |
| `none` | Process should not own desk windows (rare; prefer `runtime: task`) |

### `runtime`

| Value | Meaning |
|-------|---------|
| `process` | Default desk launch; workspace-scoped |
| `task` | Start on Global PC; no workspace window unless embed |

### `lifecycle.terminateWhen`

| Value | Meaning |
|-------|---------|
| `no-windows` | Kill process when last window is removed |
| `explicit` | Process lives until Manage kill or app `process:exit` |
| `idle` | Kill after `idleMs` with zero windows |

### `lifecycle.windowClose`

CEL expression (or JsonLogic rule) evaluated by the platform controller on close. Returns `close`, `cancel`, or `confirm`. App iframe may still implement `die` for rich UI; policy can live in manifest for simple cases.

## Platform work per pattern

| Pattern | Launch API | Close path | Zero-window launch | Multi-window API |
|---------|------------|------------|--------------------|------------------|
| Singleton | Focus or one `createWindow` | `die` handshake + kill on last | No | N/A |
| One-or-zero | Optional skip window | Policy on last close + idle | **Needed** | Optional |
| Multi | First window + `POST …/windows` | Kill on last (or explicit) | Optional | **Needed** |
| Zero (process) | Process + instance only | Kill via Manage / policy | **Needed** | N/A |
| Task | `POST …/tasks` (TBD) | Task quit | Default | Embed only |

### Process controller (shell)

Every workspace process gets a platform **ProcessController** (TypeScript):

- Tracks windows per `processId`
- On close: run `lifecycle.windowClose` (CEL) and/or cooperative `die` with timeout
- After window delete: apply `terminateWhen`
- Guaranteed termination: watchdog + `killWorkspaceProcess` (not app code)

Optional app **controller** script in `.gapp` is out of scope for v1; prefer CEL in `gapp.json` + iframe `die` for presentation.

## Fixture mapping (current tree)

| Bundle | Suggested `windows.mode` | `runtime` | Notes |
|--------|--------------------------|-----------|-------|
| textedit.gapp | `singleton` | `process` | `terminateWhen: no-windows`; dirty check in app + CEL |
| helloworld.gapp | `singleton` | `process` | Simple demo |
| terminal.gapp | `singleton` | `process` | Usually one frame |
| filebrowser.gapp | `singleton` or `multi` | `process` | Open-with may focus + navigate; multi-folder later |
| squint-editor.gapp | `multi` | `process` | Multi-doc |
| (future) file-indexer | `none` | `task` | Headless; terminal or filebrowser embeds |

## Interaction with other proposals

- **Open with** ([`open_with.md`](open_with.md)) — focus existing singleton/multi window and deliver payload; does not change window count rules.
- **PATH / command registry** ([`PATH_ADDITION.md`](PATH_ADDITION.md)) — orthogonal; terminal builtins vs desk launch.
- **Process controller + CEL** — `lifecycle.windowClose` and terminate policies; not duplicated here.

## Current gaps (implementation)

1. Launch always opens a window (`launch-program.ts`).
2. Close does not kill process when `windowCount` → 0.
3. `die` / `die:response` not wired in kernel or `Workspace/index.tsx`.
4. No `gapp.json` `windows` / `lifecycle` fields in `GappManifest`.
5. No task start/stop API or UI.
6. No `POST …/windows` for app-requested additional windows.
7. Kernel state keyed per `processId` only; multi-window may need per-window keys.

## Non-goals (v1)

- Per-app kernel branches (`if (bundleName === …)`).
- Persisting window-close rules in DB (manifest in bundle is enough).
- Cross-workspace window drag or shared windows.
- macOS-style “app runs with no windows” globally without explicit `terminateWhen: explicit`.

## Suggested implementation order

1. `GappManifest` + `windows.mode` + `lifecycle.terminateWhen` defaults.
2. Shell `ProcessController` + cooperative `die` with timeout.
3. Kill process on last window when `no-windows`.
4. Singleton focus-or-open (already mostly true).
5. `POST …/windows` for `multi`.
6. Skip-window launch for `optional` / `none` process modes.
7. Task launch API + embed contract for headless `.gapp`.

## Summary

- **Windows** are desk UI on a **process**; they never exist alone.
- **Exactly one**, **one-or-zero**, **many**, and **zero always** are distinct product patterns with different launch/close/platform needs.
- **Zero windows on a process** is valid for desk-local, often-temporary states; **zero windows forever** for PC-wide headless work → **task**.
- Declare behavior in **`gapp.json`** (`windows.mode`, `runtime`, `lifecycle`) and enforce in a per-process **controller** with CEL policy and hard timeouts.