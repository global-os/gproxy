// @ts-check
import { toParent } from 'kernel'

/**
 * @typedef {{ type: 'directory' | 'file', id: number, name: string }} FsEntry
 */

function entryIcon(entry) {
  if (entry.type === 'directory') return entry.name.endsWith('.gapp') ? '◆' : '📁'
  return '📄'
}

function entryKind(entry) {
  if (entry.type === 'directory') return entry.name.endsWith('.gapp') ? 'App' : 'Folder'
  return 'File'
}

/**
 * Render a live directory listing into `listBody`.
 *
 * Single-click selects. Double-click navigates into directories.
 * The caller supplies `onSelectionChange` and `onNavigate` callbacks to update
 * surrounding toolbar/status UI when state changes.
 *
 * @param {HTMLElement} listBody
 * @param {{
 *   onSelectionChange?: (entry: FsEntry | null) => void,
 *   onNavigate?: (info: { canGoUp: boolean, dirName: string, entryCount: number, parentId: number | null }) => void,
 * }} [opts]
 * @returns {{
 *   start: () => Promise<void>,
 *   goUp: () => Promise<void>,
 *   refresh: () => Promise<void>,
 *   navigateTo: (dirId: number | null) => Promise<void>,
 *   canGoUp: () => boolean,
 *   getCwd: () => number | null,
 *   getParentId: () => number | null,
 *   getSelected: () => FsEntry | null,
 * }}
 */
export function createBrowserPanel(listBody, opts = {}) {
  let cwd = /** @type {number | null} */ (null)
  let parentId = /** @type {number | null} */ (null)
  let canGoUpFlag = false
  let entries = /** @type {FsEntry[]} */ ([])
  let selected = /** @type {FsEntry | null} */ (null)

  function isSelected(entry) {
    return selected != null && selected.type === entry.type && selected.id === entry.id
  }

  function render() {
    listBody.innerHTML = ''
    if (entries.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = 'This folder is empty.'
      listBody.appendChild(empty)
      return
    }
    for (const entry of entries) {
      const row = document.createElement('div')
      row.className = 'list-row' + (isSelected(entry) ? ' selected' : '')

      const icon = document.createElement('span')
      icon.className = 'icon'
      icon.textContent = entryIcon(entry)

      const name = document.createElement('span')
      name.className = 'name'
      name.textContent = entry.name

      const kind = document.createElement('span')
      kind.className = 'kind'
      kind.textContent = entryKind(entry)

      row.append(icon, name, kind)

      row.addEventListener('click', () => {
        selected = isSelected(entry) ? null : entry
        render()
        opts.onSelectionChange?.(selected)
      })

      row.addEventListener('dblclick', () => {
        if (entry.type === 'directory') void navigateTo(entry.id)
      })

      listBody.appendChild(row)
    }
  }

  async function navigateTo(/** @type {number | null} */ dirId) {
    const result = /** @type {any} */ (
      await toParent('fs:browse', dirId != null ? { directoryId: dirId } : {})
    )
    cwd = result.directory_id
    parentId = result.parent_id
    canGoUpFlag = result.can_go_up
    entries = Array.from(result.entries)
    selected = null
    render()
    opts.onNavigate?.({ canGoUp: canGoUpFlag, dirName: result.name, entryCount: entries.length, parentId })
  }

  return {
    start: () => navigateTo(null),
    goUp: () => canGoUpFlag ? navigateTo(parentId) : Promise.resolve(),
    refresh: () => navigateTo(cwd),
    navigateTo,
    canGoUp: () => canGoUpFlag,
    getCwd: () => cwd,
    getParentId: () => parentId,
    getSelected: () => selected,
  }
}

const PICKER_STYLE = `
  .fp-overlay{position:absolute;inset:0;background:rgba(0,0,0,.35);
    display:flex;align-items:center;justify-content:center;z-index:100}
  .fp-box{background:#fff;border:1px solid #ccc;border-radius:8px;padding:1rem;
    display:flex;flex-direction:column;gap:.5rem;min-width:240px;max-width:320px;
    box-shadow:0 4px 16px rgba(0,0,0,.15)}
  .fp-title{font-size:.9rem;font-weight:600;color:#333}
  .fp-path{display:flex;align-items:center;gap:.4rem;font-size:12px;color:#555}
  #fp-up{padding:2px 8px;font-size:11px;flex-shrink:0;
    border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer}
  #fp-up:hover:not(:disabled){background:#f5f5f5}
  #fp-up:disabled{opacity:.45;cursor:not-allowed}
  #fp-dir{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #fp-list{border:1px solid #ddd;border-radius:6px;font-size:13px;
    width:100%;min-height:150px;max-height:200px;overflow-y:auto}
  #fp-list .list-row{display:flex;align-items:center;gap:4px;
    padding:5px 8px;cursor:pointer;user-select:none;white-space:nowrap;overflow:hidden}
  #fp-list .list-row .kind{display:none}
  #fp-list .list-row:hover:not(.selected){background:#f0f4ff}
  #fp-list .list-row.selected{background:#2563eb;color:#fff}
  #fp-list .empty{padding:16px;text-align:center;color:#666;font-size:12px}
  #fp-status{font-size:12px;color:#b91c1c;min-height:1em}
  .fp-buttons{display:flex;gap:.5rem;justify-content:flex-end}
  .fp-buttons button{padding:6px 14px;font-size:13px;border:1px solid #ccc;
    border-radius:6px;background:#fff;cursor:pointer}
  .fp-buttons button:hover:not(:disabled){background:#f5f5f5}
  .fp-buttons button:disabled{opacity:.45;cursor:not-allowed}
`

/**
 * Show a modal file picker. Resolves to {filename, content} on selection, or null on cancel.
 * Rejects if the initial directory load fails.
 *
 * Clicking a directory navigates into it. Clicking a file selects it for opening.
 *
 * @returns {Promise<{ filename: string, content: string } | null>}
 */
export function openFilePicker() {
  return new Promise((resolve, reject) => {
    const styleEl = document.createElement('style')
    styleEl.textContent = PICKER_STYLE
    document.head.appendChild(styleEl)

    const overlay = document.createElement('div')
    overlay.className = 'fp-overlay'
    overlay.innerHTML = `
      <div class="fp-box">
        <div class="fp-title">Open file</div>
        <div class="fp-path">
          <button id="fp-up" type="button" disabled>↑ Up</button>
          <span id="fp-dir">Desktop</span>
        </div>
        <div id="fp-list"></div>
        <div id="fp-status"></div>
        <div class="fp-buttons">
          <button id="fp-cancel" type="button">Cancel</button>
          <button id="fp-open" type="button" disabled>Open</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)

    const upBtn = /** @type {HTMLButtonElement} */ (overlay.querySelector('#fp-up'))
    const dirEl = /** @type {HTMLElement} */ (overlay.querySelector('#fp-dir'))
    const listEl = /** @type {HTMLElement} */ (overlay.querySelector('#fp-list'))
    const statusEl = /** @type {HTMLElement} */ (overlay.querySelector('#fp-status'))
    const cancelBtn = /** @type {HTMLButtonElement} */ (overlay.querySelector('#fp-cancel'))
    const openBtn = /** @type {HTMLButtonElement} */ (overlay.querySelector('#fp-open'))

    function cleanup() {
      overlay.remove()
      styleEl.remove()
    }

    let panel
    panel = createBrowserPanel(listEl, {
      onSelectionChange(entry) {
        if (entry?.type === 'directory') {
          void panel.navigateTo(entry.id)
          return
        }
        openBtn.disabled = entry == null
        statusEl.textContent = ''
      },
      onNavigate({ canGoUp, dirName }) {
        upBtn.disabled = !canGoUp
        dirEl.textContent = dirName
      },
    })

    upBtn.addEventListener('click', () => { void panel.goUp() })

    cancelBtn.addEventListener('click', () => { cleanup(); resolve(null) })

    openBtn.addEventListener('click', async () => {
      const entry = panel.getSelected()
      if (!entry) return
      openBtn.disabled = true
      statusEl.textContent = 'Opening…'
      try {
        const result = /** @type {any} */ (await toParent('fs:read', { fileId: entry.id }))
        cleanup()
        resolve({ filename: result.name, content: result.content })
      } catch (err) {
        openBtn.disabled = false
        statusEl.textContent = err instanceof Error ? err.message : 'Failed to open'
        reject(err)
      }
    })

    panel.start().catch((err) => {
      if (statusEl.isConnected) statusEl.textContent = err instanceof Error ? err.message : 'Failed to load'
      reject(err)
    })
  })
}

globalThis.openFilePicker = openFilePicker
