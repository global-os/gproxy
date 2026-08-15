// shell.js — a Nushell-inspired shell for GlobalOS, ported from
// ~/Code/nushell-replacement. Pipeline-based (`ls | filter type == file`),
// table-oriented (every command consumes and produces rows/columns), and
// self-documenting via `help`.
//
// Filesystem commands (`ls`, `open`, `cd`, `rm`, `rmdir`) talk to the GlobalOS
// desktop through the kernel bridge (toParent → fs.* syscalls) instead of
// Node's fs.

import { toParent } from './kernel.js'

// ── Parser ────────────────────────────────────────────────────────────────

function tokenize(input) {
  const tokens = []
  let i = 0
  while (i < input.length) {
    while (i < input.length && input[i] === ' ') i++
    if (i >= input.length) break

    if (input[i] === "'" || input[i] === '"') {
      const quote = input[i]
      i++
      let value = ''
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) {
          i++
          value += input[i]
        } else {
          value += input[i]
        }
        i++
      }
      i++
      tokens.push(value)
    } else {
      let value = ''
      while (i < input.length && input[i] !== ' ') {
        value += input[i]
        i++
      }
      tokens.push(value)
    }
  }
  return tokens
}

function parseCommand(raw) {
  const tokens = tokenize(raw)
  const name = tokens[0] ?? ''
  const args = []
  const flags = {}

  let i = 1
  while (i < tokens.length) {
    const token = tokens[i]
    if (token === '--' || token.startsWith('---')) {
      args.push(token)
      i += 1
    } else if (token.startsWith('--')) {
      const key = token.slice(2)
      const next = tokens[i + 1]
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = next
        i += 2
      } else {
        flags[key] = true
        i += 1
      }
    } else if (token.startsWith('-')) {
      const key = token.slice(1)
      const next = tokens[i + 1]
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = next
        i += 2
      } else {
        flags[key] = true
        i += 1
      }
    } else {
      args.push(token)
      i += 1
    }
  }

  return { name, args, flags }
}

function parsePipeline(source) {
  return source
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(parseCommand)
}

// ── Table rendering ───────────────────────────────────────────────────────

export function printTable(table) {
  if (table.length === 0) return '(empty)'

  const columns = [...new Set(table.flatMap((row) => Object.keys(row)))]
  if (columns.length === 0) return '(empty)'

  const colWidths = columns.map((col) => {
    let max = col.length
    for (const row of table) {
      max = Math.max(max, String(row[col] ?? '').length)
    }
    return max
  })

  const header =
    columns.map((col, i) => ` ${col.padEnd(colWidths[i])}`).join(' │') + ' │'
  const rows = table.map(
    (row) =>
      columns
        .map((col, i) => ` ${String(row[col] ?? '').padEnd(colWidths[i])}`)
        .join(' │') + ' │',
  )

  const sep = columns.map((_, i) => '─'.repeat(colWidths[i] + 2))
  const top = '─' + sep.join('─┬') + '─'
  const mid = '─' + sep.join('─┼') + '─'
  const bot = '─' + sep.join('─┴') + '─'

  if (table.length > 50) {
    const preview = rows.slice(0, 25)
    const rest = rows.slice(-25)
    return [top, header, mid, ...preview, ` ... ${table.length - 50} rows omitted ...`, ...rest, bot].join('\n')
  }

  return [top, header, mid, ...rows, bot].join('\n')
}

// ── Pure commands ─────────────────────────────────────────────────────────

function filter(input, args) {
  if (args.length === 0) return input

  if (args.length === 1) {
    const parsed = parseFilterExpr(args[0])
    return parsed ? input.filter((row) => compare(row[parsed.column], parsed.op, parsed.value)) : input
  }

  const [col, op, ...rest] = args
  const val = rest.join(' ')
  return input.filter((row) => compare(row[col], op, val))
}

function parseFilterExpr(expr) {
  const ops = ['!~', '=~', '!=', '==', '>=', '<=', '>', '<', '=', 'contains']
  for (const op of ops) {
    const idx = expr.indexOf(op)
    if (idx !== -1) {
      return { column: expr.slice(0, idx).trim(), op, value: expr.slice(idx + op.length).trim() }
    }
  }
  return null
}

function compare(cell, op, val) {
  const s = String(cell ?? '')
  switch (op) {
    case '==':
    case '=':
      return s === val
    case '!=':
      return s !== val
    case '=~':
    case 'contains': {
      try {
        return new RegExp(val).test(s)
      } catch {
        return s.includes(val)
      }
    }
    case '!~': {
      try {
        return !new RegExp(val).test(s)
      } catch {
        return !s.includes(val)
      }
    }
    case '>':
      return Number(cell) > Number(val)
    case '<':
      return Number(cell) < Number(val)
    case '>=':
      return Number(cell) >= Number(val)
    case '<=':
      return Number(cell) <= Number(val)
    default:
      return false
  }
}

function sortBy(input, args, flags) {
  if (args.length === 0) return input
  const column = args[0]
  const reverse = flags.r === true || flags.reverse === true

  const sorted = [...input].sort((a, b) => {
    const va = a[column]
    const vb = b[column]
    if (typeof va === 'number' && typeof vb === 'number') return va - vb
    const sa = String(va ?? '').toLowerCase()
    const sb = String(vb ?? '').toLowerCase()
    return sa < sb ? -1 : sa > sb ? 1 : 0
  })

  return reverse ? sorted.reverse() : sorted
}

function select(input, args) {
  if (args.length === 0) return input
  return input.map((row) => {
    const out = {}
    for (const col of args) if (col in row) out[col] = row[col]
    return out
  })
}

function first(input, args) {
  const n = args.length > 0 ? parseInt(args[0], 10) : 10
  return isNaN(n) || n < 0 ? input : input.slice(0, n)
}

function last(input, args) {
  const n = args.length > 0 ? parseInt(args[0], 10) : 10
  return isNaN(n) || n < 0 ? input : input.slice(-n)
}

function length(input) {
  return [{ length: input.length }]
}

function each(input, args) {
  if (args.length === 0) return input
  const template = args.join(' ')
  return input.map((row) => {
    const result = { ...row }
    result._ = template.replace(/\$(\w+)/g, (_, key) => String(row[key] ?? ''))
    return result
  })
}

function get(input, args) {
  if (args.length === 0) return input
  const column = args[0]
  return input
    .map((row) => row[column])
    .filter((v) => v !== undefined)
    .map((v) => ({ value: v }))
}

function echo(input, args) {
  if (args.length === 0) return input
  return args.map((value) => ({ value }))
}

// ── Filesystem helpers (async, via the kernel bridge) ────────────────────

// Browse a directory. Returns { directory_id, parent_id, can_go_up, name, path, entries }.
function browse(directoryId) {
  return toParent('fs:browse', directoryId == null ? {} : { directoryId })
}

function splitPath(path) {
  return path.split('/').filter(Boolean)
}

function expandTilde(raw, home) {
  if (raw === '~') return home
  if (raw.startsWith('~/')) return `${home}/${raw.slice(2)}`
  return raw
}

// Resolve `rawPath` against `baseParts` into a list of path segments.
function resolveParts(baseParts, rawPath) {
  const absolute = rawPath.startsWith('/')
  const parts = absolute ? [] : [...baseParts]
  for (const seg of splitPath(rawPath)) {
    if (seg === '.') continue
    if (seg === '..') {
      if (parts.length > 0) parts.pop()
      continue
    }
    parts.push(seg)
  }
  return parts
}

// Browse a path given as segments (e.g. ['Users', 'me', 'Desktop']). The first
// segment must be 'Users' (the filesystem root we expose).
async function browseByParts(parts, usersRootId) {
  if (!parts.length) {
    const users = await browse(usersRootId)
    return { directory_id: users.directory_id, parent_id: users.parent_id, name: users.name, path: users.path, entries: users.entries }
  }

  let listing
  let index = 0
  if (parts[0] === 'Users' && usersRootId != null) {
    listing = await browse(usersRootId)
    index = 1
  } else {
    throw new Error(`No such directory: /${parts.join('/')}`)
  }

  for (; index < parts.length; index++) {
    const entry = listing.entries.find((e) => e.type === 'directory' && e.name === parts[index])
    if (!entry) throw new Error(`No such directory: ${parts[index]}`)
    listing = await browse(entry.id)
  }

  return { directory_id: listing.directory_id, parent_id: listing.parent_id, name: listing.name, path: listing.path, entries: listing.entries }
}

// ── Shell ─────────────────────────────────────────────────────────────────

export class Shell {
  constructor() {
    this.cwdId = null
    this.cwdPath = ''
    this.usersRootId = null
    this.desktopId = null
    this.homePath = ''
    this.ready = false
  }

  async init() {
    const desktop = await browse(null)
    this.usersRootId = desktop.parent_id
    this.desktopId = desktop.directory_id
    this.cwdId = desktop.directory_id
    this.cwdPath = desktop.path
    this.homePath = desktop.path
    this.ready = true
  }

  // Run one line: shell builtins (cd/pwd/rm/rmdir/clear/exit) or a pipeline.
  // Returns { output, clear }.
  async run(line) {
    const trimmed = line.trim()
    if (!trimmed) return { output: '' }

    const parts = trimmed.split(/\s+/)
    const cmd = parts[0]
    const args = parts.slice(1)

    switch (cmd) {
      case 'cd':
        return { output: await this.cd(args) }
      case 'pwd':
        return { output: this.cwdPath }
      case 'rm':
        return { output: await this.rm(args) }
      case 'rmdir':
        return { output: await this.rmdir(args) }
      case 'clear':
        return { output: '', clear: true }
      case 'exit':
      case 'quit':
        return { output: '', exit: true }
      default:
        return { output: printTable(await this.exec(trimmed)) }
    }
  }

  // Pipeline execution: each stage's table feeds the next.
  async exec(source) {
    const commands = parsePipeline(source)
    let table = []
    for (const cmd of commands) {
      table = await this.runCommand(cmd, table)
    }
    return table
  }

  async runCommand(cmd, input) {
    const { name, args, flags } = cmd
    switch (name) {
      case 'ls':
        return this.cmdLs(args, flags)
      case 'filter':
      case 'where':
        return filter(input, args)
      case 'sort-by':
        return sortBy(input, args, flags)
      case 'select':
        return select(input, args)
      case 'first':
        return first(input, args)
      case 'last':
        return last(input, args)
      case 'length':
        return length(input)
      case 'each':
        return each(input, args)
      case 'get':
        return get(input, args)
      case 'open':
        return this.cmdOpen(args)
      case 'echo':
        return echo(input, args)
      case 'help':
        return help()
      default:
        return [{ error: `unknown command: ${name} (try "help")` }]
    }
  }

  // cd <path>
  async cd(args) {
    const target = args[0]
    if (!target || target === '~') {
      const home = await browse(this.desktopId)
      this.cwdId = home.directory_id
      this.cwdPath = home.path
      return ''
    }

    const loc = await this.resolveDirectory(target)
    this.cwdId = loc.directory_id
    this.cwdPath = loc.path
    return ''
  }

  // ls [path] [-r] [-a]
  async cmdLs(args, flags) {
    const target = args[0]
    const recursive = flags.r === true || flags.recursive === true
    const all = flags.a === true || flags.all === true

    const loc = target ? await this.resolveDirectory(target) : await browse(this.cwdId)
    const rows = []
    const walk = async (listing) => {
      for (const e of listing.entries) {
        if (!all && e.name.startsWith('.')) continue
        rows.push({ name: e.name, type: e.type === 'directory' ? 'dir' : 'file' })
        if (recursive && e.type === 'directory') {
          await walk(await browse(e.id))
        }
      }
    }
    await walk(loc)
    return rows
  }

  // open <path> — read a text file, one row per line.
  async cmdOpen(args) {
    if (args.length === 0) throw new Error('Usage: open <path>')
    const { entry } = await this.resolvePathArg(args[0])
    if (entry.type !== 'file') throw new Error(`Not a file: ${args[0]}`)
    const res = await toParent('fs:read', { fileId: entry.id })
    const content = typeof res.content === 'string' ? res.content : ''
    const lines = content.split('\n')
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
    return lines.map((line, i) => ({ index: i, line }))
  }

  // rm <file...>
  async rm(args) {
    if (args.length === 0) throw new Error('Usage: rm <file>')
    const out = []
    for (const arg of args) {
      const { entry } = await this.resolvePathArg(arg)
      if (entry.type !== 'file') throw new Error(`Not a file: ${arg}`)
      await toParent('fs:delete', { entryType: 'file', id: entry.id })
      out.push(`removed ${arg}`)
    }
    return out.join('\n')
  }

  // rmdir <directory...>
  async rmdir(args) {
    if (args.length === 0) throw new Error('Usage: rmdir <directory>')
    const out = []
    for (const arg of args) {
      const { entry } = await this.resolvePathArg(arg, { directoriesOnly: true })
      await this.deleteDirectoryRecursive(entry.id)
      out.push(`removed ${arg}`)
    }
    return out.join('\n')
  }

  async deleteDirectoryRecursive(directoryId) {
    const listing = await browse(directoryId)
    for (const entry of listing.entries) {
      if (entry.type === 'file') {
        await toParent('fs:delete', { entryType: 'file', id: entry.id })
      } else {
        await this.deleteDirectoryRecursive(entry.id)
      }
    }
    await toParent('fs:delete', { entryType: 'directory', id: directoryId })
  }

  // Resolve a path string to a directory listing (navigating from cwd).
  async resolveDirectory(path) {
    const raw = expandTilde(path.trim(), this.homePath)
    if (!raw || raw === '.') return browse(this.cwdId)
    if (raw === '/') return browseByParts([], this.usersRootId)
    const parts = resolveParts(this.cwdParts(), raw)
    return browseByParts(parts, this.usersRootId)
  }

  // Resolve a path string to { entry, parent } for a file/dir.
  async resolvePathArg(arg, opts = {}) {
    if (!arg) throw new Error('Path required')
    const parts = resolveParts(this.cwdParts(), expandTilde(arg, this.homePath))
    if (parts.length === 0) throw new Error(`Not a file: ${arg}`)
    const name = parts[parts.length - 1]
    const parent = await browseByParts(parts.slice(0, -1), this.usersRootId)
    const entry = parent.entries.find((e) => e.name === name)
    if (!entry) throw new Error(`No such file or directory: ${arg}`)
    if (opts.directoriesOnly && entry.type !== 'directory') throw new Error(`Not a directory: ${arg}`)
    return { entry, parent }
  }

  cwdParts() {
    return this.cwdPath === '/' ? [] : splitPath(this.cwdPath)
  }
}

// ── help ──────────────────────────────────────────────────────────────────

function help() {
  return [
    { command: 'ls', description: 'List directory contents', usage: 'ls [path] [-r|--recursive] [-a|--all]' },
    { command: 'filter', description: 'Filter rows (alias: where)', usage: 'filter col op value | filter col=~pattern' },
    { command: 'sort-by', description: 'Sort by column', usage: 'sort-by col [-r|--reverse]' },
    { command: 'select', description: 'Select columns', usage: 'select col1 col2 ...' },
    { command: 'first', description: 'Take first N rows', usage: 'first [n]' },
    { command: 'last', description: 'Take last N rows', usage: 'last [n]' },
    { command: 'length', description: 'Count rows', usage: 'length' },
    { command: 'each', description: 'Map rows with $col template', usage: 'each "text $name"' },
    { command: 'get', description: 'Get a column', usage: 'get col' },
    { command: 'open', description: 'Read a file as lines', usage: 'open path' },
    { command: 'echo', description: 'Print args as rows', usage: 'echo args...' },
    { command: 'cd', description: 'Change directory', usage: 'cd [path]' },
    { command: 'pwd', description: 'Print working directory', usage: 'pwd' },
    { command: 'rm', description: 'Remove a file', usage: 'rm file' },
    { command: 'rmdir', description: 'Remove a directory (recursive)', usage: 'rmdir dir' },
    { command: 'clear', description: 'Clear the screen', usage: 'clear' },
    { command: 'help', description: 'Show this help', usage: 'help' },
  ]
}

export function helpText() {
  return (
    'Pipelines: cmd | cmd | cmd — each stage passes its table along.\n\nCommands:\n' +
    help().map((r) => `  ${r.command.padEnd(8)} ${r.usage}`).join('\n')
  )
}
