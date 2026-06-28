// @ts-check
/// <reference path="./preact-gapp.d.ts" />

import { h, render } from 'preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { toParent } from './kernel.js'

/**
 * @typedef {{ type: 'directory' | 'file', id: number, name: string }} FsEntry
 * @typedef {{
 *   directory_id: number,
 *   parent_id: number | null,
 *   can_go_up: boolean,
 *   name: string,
 *   entries: FsEntry[],
 * }} BrowseResult
 */

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
  const [busy, setBusy] = useState(/** @type {boolean} */ (false))
  const [cwd, setCwd] = useState(/** @type {number | null} */ (null))
  const [parentId, setParentId] = useState(/** @type {number | null} */ (null))
  const [canGoUp, setCanGoUp] = useState(/** @type {boolean} */ (false))
  const [folderName, setFolderName] = useState(/** @type {string} */ ('Desktop'))
  const [entries, setEntries] = useState(/** @type {FsEntry[]} */ ([]))
  const [selected, setSelected] = useState(/** @type {FsEntry | null} */ (null))
  const [status, setStatus] = useState(/** @type {string} */ ('Loading…'))
  const [statusError, setStatusError] = useState(/** @type {boolean} */ (false))
  const loadGeneration = useRef(0)

  const applyBrowse = useCallback(/** @param {BrowseResult} result */ (result) => {
    setCwd(result.directory_id)
    setParentId(result.parent_id)
    setCanGoUp(result.can_go_up)
    setFolderName(result.name)
    setEntries(result.entries)
    setSelected(null)
  }, [])

  const loadDirectory = useCallback(/** @param {number | null} directoryId */ async (directoryId) => {
    const generation = ++loadGeneration.current
    setBusy(true)
    setStatus('Loading…')
    setStatusError(false)

    try {
      const payload = directoryId == null ? {} : { directoryId }
      const result = await toParent('fs:browse', payload)
      if (generation !== loadGeneration.current) return
      applyBrowse(result)
      setStatus(`${result.entries.length} item${result.entries.length === 1 ? '' : 's'}`)
    } catch (err) {
      if (generation !== loadGeneration.current) return
      setStatus(err instanceof Error ? err.message : 'Failed to load folder')
      setStatusError(true)
    } finally {
      if (generation === loadGeneration.current) setBusy(false)
    }
  }, [applyBrowse])

  useEffect(() => {
    const run = async () => {
      await loadDirectory(null)
    }
    run()
    return () => {
      loadGeneration.current += 1
    }
  }, [loadDirectory])

  const hasSelection = selected != null

  const goUp = async () => {
    if (busy || !canGoUp || parentId == null) return
    await loadDirectory(parentId)
  }

  const refresh = async () => {
    await loadDirectory(cwd)
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
          onClick: () => {
            debugger;
            setSelected(entry)
          },
          onDblClick: async () => {
            debugger;
            if (entry.type === 'directory') await loadDirectory(entry.id)
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
        onClick: createFolder,
      }, 'New Folder'),
      h('button', {
        type: 'button',
        disabled: busy || !hasSelection,
        onClick: renameSelected,
      }, 'Rename'),
      h('button', {
        type: 'button',
        disabled: busy || !hasSelection,
        onClick: deleteSelected,
      }, 'Delete'),
      h('button', {
        type: 'button',
        disabled: busy,
        onClick: refresh,
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