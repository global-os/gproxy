# PATH addition: short name → canonical → exec

Proposal for an **additional** command-discovery layer alongside `$PATH` (Unix) and alongside launch/syscall resolution (GlobalOS). This does not replace PATH or `.gapp` launch; it sits above them.

## Problem

`$PATH` only answers: “Is there an executable **file** named `git` in these directories, in this order?”

It does not answer:

- Which **`git`** is intended when several exist (system, Homebrew, user wrapper)
- **Version** or provider
- **Metadata** (title, docs, completions)
- **Policy** (trusted provider, workspace scope)
- **Stable identity** for scripts and upgrades

GlobalOS has a related gap: `.gapp` bundles on Desktop are **apps**, not a general command namespace; the terminal uses **builtins** and **syscalls**, not `execve` of PATH files.

## Model: three layers

```text
short name  →  canonical  →  exec
```

| Layer | What it is | Example |
|-------|------------|---------|
| **Short name** | What the user or script types | `git`, `ls`, `terminal` |
| **Canonical** | Stable registered identity + metadata | `command://local/homebrew/git` |
| **Exec** | How the OS/platform actually starts it | `execve("/opt/homebrew/bin/git", …)` or `POST …/launch` |

**Short name** stays human-friendly. **Canonical** disambiguates and survives upgrades. **Exec** is the real backend (path, interpreter, or launch handler).

## Canonical record (sketch)

```text
id:        command://local/homebrew/git
title:     Git
aliases:   [git]
priority:  100
provider:  homebrew
version:   2.43.0
kind:      binary | script | delegate | launch-bundle
run:       /opt/homebrew/bin/git
```

Multiple canonical entries may share one alias; **policy** picks the winner (user > local > system, or workspace-scoped overrides).

Discovery UI (palette, `command info`) uses the registry. Execution still ends in `execve`, a script interpreter, or GlobalOS launch/syscall.

## Resolution order (Unix shell + registry)

Today (POSIX, no registry):

```text
1. aliases
2. shell functions
3. shell builtins
4. $PATH (first executable filename match)
5. command not found
```

Proposed **with** registry (addition, not replacement):

```text
1. aliases
2. shell functions
3. shell builtins
4. registry (short name → canonical → run)
5. $PATH fallback (unregistered binaries, legacy)
6. command not found
```

`$PATH` remains for bootstrapping, ad-hoc scripts, and tools that never registered.

## Hierarchical registry

Flat `commands.db` works; a **tree** helps ownership and policy:

```text
system/              # OS vendor
  coreutils/
local/{provider}/    # homebrew, apt, nix, …
user/{uid}/            # personal commands
workspace/{id}/        # project-scoped (optional)
```

Users still type short names. Automation can pin `command://local/homebrew/git`.

CLI surface (Unix-shaped):

```bash
command info git          # providers, chosen canonical, exec path
command run git status    # explicit registry resolution
git status                # shell resolves via registry first, then PATH
```

## GlobalOS mapping

| Layer | GlobalOS today / proposed |
|-------|---------------------------|
| Short name | Palette / terminal token (`terminal`, `filebrowser`) |
| Canonical | Registered entry: `.gapp` directory id, path, icon, title |
| Exec | `POST /api/workspaces/:id/launch`, or syscall (`fs.browse`, …) |

Provider sources to merge in one fzf index:

- **Platform** — launch app, focus window, kill process
- **User** — aliases / pins on Global PC (like `global_pc_icon`)
- **App** — `commands:register` over session kernel `postMessage` (per process, app-agnostic kernel)
- **Files** — existing `/api/fs/index` entries (launchable `.gapp`)

Optional later: virtual `~/bin` as PATH-like exec dirs; registry remains the discovery layer.

## Security

- User-defined canonical entries: **allowlisted** syscall ops only; no arbitrary server code from profile JSON.
- App commands: active only while iframe is registered.
- Registry precedence must be **explicit**, not accidental directory order.

## Non-goals (for v1)

- Replacing `$PATH` on Unix or removing PATH fallback
- Arbitrary remote execution from the registry
- Per-app branches in the session kernel

## Suggested rollout (GlobalOS)

1. **Command registry in workspace shell** — refactor Start menu from “files only” to pluggable providers.
2. **User aliases** on Global PC — shared by terminal and palette.
3. **`commands:register` / `command:run`** — generic kernel messages; apps own handlers.
4. Optional virtual **`/Users/bin`** — PATH-like files for users who want Unix muscle memory.

## One-line summary

**Short name** is what you type; **canonical** is what the platform chose; **exec** is how it starts. PATH (or launch/syscall) stays the execution primitive underneath.