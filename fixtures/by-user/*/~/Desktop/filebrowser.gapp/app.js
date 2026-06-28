import { h, render } from 'preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { toParent, whenKernelAttached } from './kernel.js'

function entryIcon(entry) {
  if (entry.type === 'directory') {
    return entry.name.endsWith('.gapp') ? '◆' : '📁'
  }
  return '📄'
}

function entryKind(entry) {
  if (entry.type === 'directory') {
    return entry.name.endsWith('.gapp') ? 'App' : 'Folder'
  }
  return 'File'
}

function isSelected(selected, entry) {
  return (
    selected != null &&
    selected.type === entry.type &&
    selected.id === entry.id
  )
}

function FileBrowserApp() {
  const [busy, setBusy] = useState(false)
  const [cwd, setCwd] = useState(null)
  const [parentId, setParentId] = useState(null)
  const [canGoUp, setCanGoUp] = useState(false)
  const [folderName, setFolderName] = useState('Desktop')
  const [entries, setEntries] = useState([])
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('Loading…')
  const [statusError, setStatusError] = useState(false)
  const loadGeneration = useRef(0)

  const applyBrowse = useCallback((result) => {
    setCwd(result.directory_id)
    setParentId(result.parent_id)
    setCanGoUp(result.can_go_up)
    setFolderName(result.name)
    setEntries(result.entries)
    setSelected(null)
  }, [])

  const loadDirectory = useCallback(async (directoryId) => {
    const generation = ++loadGeneration.current
    setBusy(true)
    setStatusError(false)

    try {
      for (let attempt = 0; attempt <= 4; attempt += 1) {
        if (generation !== loadGeneration.current) return
        setStatus(attempt > 0 ? 'Retrying…' : 'Loading…')

        try {
          await whenKernelAttached()
          if (generation !== loadGeneration.current) return

          const payload = directoryId == null ? {} : { directoryId }
          const result = await toParent('fs:browse', payload)
          if (generation !== loadGeneration.current) return
          applyBrowse(result)
          setStatus(`${result.entries.length} item${result.entries.length === 1 ? '' : 's'}`)
          return
        } catch (err) {
          if (generation !== loadGeneration.current) return
          if (attempt < 4) {
            await new Promise((resolve) => window.setTimeout(resolve, 200 * (attempt + 1)))
            continue
          }
          setStatus(err instanceof Error ? err.message : 'Failed to load folder')
          setStatusError(true)
        }
      }
    } finally {
      if (generation === loadGeneration.current) setBusy(false)
    }
  }, [applyBrowse])

  useEffect(() => {
    void loadDirectory(null)
    return () => {
      loadGeneration.current += 1
    }
    // Mount once; generation bump cancels stale browse on Strict Mode remount.
  }, [loadDirectory])

  const hasSelection = selected != null

  const goUp = () => {
    if (busy || !canGoUp || parentId == null) return
    void loadDirectory(parentId)
  }

  const createFolder = async () => {
    const name = window.prompt('New folder name:')
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) {
      setStatus('Folder name is required')
      setStatusError(true)
      return
    }

    setBusy(true)
    try {
      await toParent('fs:mkdir', { parentId: cwd, name: trimmed })
      setStatus(`Created folder “${trimmed}”`)
      setStatusError(false)
      await loadDirectory(cwd)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to create folder')
      setStatusError(true)
      setBusy(false)
    }
  }

  const renameSelected = async () => {
    if (!hasSelection) return
    const current = selected.name
    const next = window.prompt('Rename to:', current)
    if (next === null) return
    const trimmed = next.trim()
    if (!trimmed) {
      setStatus('Name is required')
      setStatusError(true)
      return
    }
    if (trimmed === current) return

    setBusy(true)
    try {
      await toParent('fs:rename', {
        entryType: selected.type,
        id: selected.id,
        name: trimmed,
      })
      setStatus(`Renamed to “${trimmed}”`)
      setStatusError(false)
      await loadDirectory(cwd)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to rename')
      setStatusError(true)
      setBusy(false)
    }
  }

  const deleteSelected = async () => {
    if (!hasSelection) return
    const label = selected.name
    if (!window.confirm(`Delete “${label}”?`)) return

    setBusy(true)
    try {
      await toParent('fs:delete', {
        entryType: selected.type,
        id: selected.id,
      })
      setStatus(`Deleted “${label}”`)
      setStatusError(false)
      await loadDirectory(cwd)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to delete')
      setStatusError(true)
      setBusy(false)
    }
  }

  const listBody = busy && entries.length === 0
    ? h('div', { class: 'empty' }, 'Loading…')
    : entries.length === 0
      ? h('div', { class: 'empty' }, 'This folder is empty.')
      : entries.map((entry) => h('div', {
          key: `${entry.type}-${entry.id}`,
          class: `list-row${isSelected(selected, entry) ? ' selected' : ''}`,
          onClick: () => setSelected(entry),
          onDblClick: () => {
            if (entry.type === 'directory') void loadDirectory(entry.id)
          },
        },
        h('span', { class: 'icon' }, entryIcon(entry)),
        h('span', { class: 'name' }, entry.name),
        h('span', { class: 'kind' }, entryKind(entry)),
      ))

  return h('div', { class: 'shell' },
    h('div', { class: 'toolbar' },
      h('button', {
        type: 'button',
        title: 'Up',
        disabled: busy || !canGoUp,
        onClick: goUp,
      }, '↑ Up'),
      h('button', {
        type: 'button',
        disabled: busy,
        onClick: () => void createFolder(),
      }, 'New Folder'),
      h('button', {
        type: 'button',
        disabled: busy || !hasSelection,
        onClick: () => void renameSelected(),
      }, 'Rename'),
      h('button', {
        type: 'button',
        disabled: busy || !hasSelection,
        onClick: () => void deleteSelected(),
      }, 'Delete'),
      h('button', {
        type: 'button',
        disabled: busy,
        onClick: () => void loadDirectory(cwd),
      }, 'Refresh'),
      h('div', { class: 'pathbar' }, folderName),
    ),
    h('div', { class: 'panel' },
      h('div', { class: 'list-head' },
        h('span', null),
        h('span', null, 'Name'),
        h('span', null, 'Type'),
      ),
      h('div', { class: 'list-body' }, listBody),
    ),
    h('div', { class: `statusbar${statusError ? ' error' : ''}` }, status),
  )
}

render(h(FileBrowserApp), document.getElementById('root'))