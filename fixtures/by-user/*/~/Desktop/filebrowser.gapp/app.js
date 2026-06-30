// @ts-check
import { toParent } from 'kernel'
import { createBrowserPanel } from 'filepicker'

const upBtn = /** @type {HTMLButtonElement} */ (document.getElementById('up-btn'))
const mkdirBtn = /** @type {HTMLButtonElement} */ (document.getElementById('mkdir-btn'))
const renameBtn = /** @type {HTMLButtonElement} */ (document.getElementById('rename-btn'))
const deleteBtn = /** @type {HTMLButtonElement} */ (document.getElementById('delete-btn'))
const refreshBtn = /** @type {HTMLButtonElement} */ (document.getElementById('refresh-btn'))
const pathbar = /** @type {HTMLElement} */ (document.getElementById('pathbar'))
const listBody = /** @type {HTMLElement} */ (document.getElementById('list-body'))
const statusEl = /** @type {HTMLElement} */ (document.getElementById('statusbar'))

let busy = false

function setStatus(text, error = false) {
  statusEl.textContent = text
  statusEl.classList.toggle('error', error)
}

function updateButtons() {
  const sel = panel.getSelected()
  upBtn.disabled = busy || !panel.canGoUp()
  mkdirBtn.disabled = busy
  renameBtn.disabled = busy || sel == null
  deleteBtn.disabled = busy || sel == null
  refreshBtn.disabled = busy
}

async function withBusy(fn) {
  busy = true
  updateButtons()
  try {
    await fn()
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Request failed', true)
  } finally {
    busy = false
    updateButtons()
  }
}

let panel
panel = createBrowserPanel(listBody, {
  onSelectionChange() {
    updateButtons()
  },
  onNavigate({ canGoUp, dirName, entryCount }) {
    pathbar.textContent = dirName
    setStatus(`${entryCount} item${entryCount === 1 ? '' : 's'}`)
    updateButtons()
  },
})

upBtn.addEventListener('click', () => { withBusy(() => panel.goUp()) })
refreshBtn.addEventListener('click', () => { withBusy(() => panel.refresh()) })

mkdirBtn.addEventListener('click', () => {
  const name = window.prompt('New folder name:')
  if (name === null) return
  const trimmed = name.trim()
  if (!trimmed) { setStatus('Folder name is required', true); return }
  withBusy(async () => {
    await toParent('fs:mkdir', { parentId: panel.getCwd(), name: trimmed })
    setStatus(`Created folder "${trimmed}"`)
    await panel.refresh()
  })
})

renameBtn.addEventListener('click', () => {
  const sel = panel.getSelected()
  if (!sel) return
  const next = window.prompt('Rename to:', sel.name)
  if (next === null) return
  const trimmed = next.trim()
  if (!trimmed) { setStatus('Name is required', true); return }
  if (trimmed === sel.name) return
  withBusy(async () => {
    await toParent('fs:rename', { entryType: sel.type, id: sel.id, name: trimmed })
    setStatus(`Renamed to "${trimmed}"`)
    await panel.refresh()
  })
})

deleteBtn.addEventListener('click', () => {
  const sel = panel.getSelected()
  if (!sel) return
  if (!window.confirm(`Delete "${sel.name}"?`)) return
  withBusy(async () => {
    await toParent('fs:delete', { entryType: sel.type, id: sel.id })
    setStatus(`Deleted "${sel.name}"`)
    await panel.refresh()
  })
})

// Announce readiness to the kernel (no state to restore, so we ignore init reply).
window.parent.postMessage({ type: 'ready' }, '*')

setStatus('Loading…')
panel.start().catch((err) => {
  setStatus(err instanceof Error ? err.message : 'Failed to load', true)
})
