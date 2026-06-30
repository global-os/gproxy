import { MouseEvent, useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { reducer } from './reducer'
import { ResizeHandle, State, WorkspaceActionKind, WorkspaceActions } from './types'

const initialState: State = {
  nextWindowID: 1,
  windows: [],
  dragOrigin: undefined,
  draggingWindow: undefined,
  resizeOrigin: undefined,
  resizingWindow: undefined,
  resizeHandle: undefined,
  zIndexCounter: 1,
}

function persistWindowGeometry(workspaceId: string, windowId: number, patch: { x: number; y: number; width?: number; height?: number }) {
  void fetch(`/api/workspaces/${workspaceId}/windows/${windowId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export function useWorkspace(workspaceId: string, onStartup?: (actions: WorkspaceActions) => void) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actions = useMemo<WorkspaceActions>(() => ({
    openWindow(windowSpec) {
      dispatch({ type: WorkspaceActionKind.OPEN_WINDOW, payload: windowSpec })
    },
    setWindows(windows) {
      dispatch({ type: WorkspaceActionKind.SET_WINDOWS, payload: windows })
    },
    focusWindow(windowId, zIndex) {
      dispatch({ type: WorkspaceActionKind.FOCUS_WINDOW, windowId, zIndex })
    },
    closeWindow(windowId) {
      dispatch({ type: WorkspaceActionKind.CLOSE_WINDOW, windowId })
    },
    closeProcessWindows(processId) {
      dispatch({ type: WorkspaceActionKind.CLOSE_PROCESS_WINDOWS, processId })
    },
  }), [])

  const hasRun = useRef(false)
  useEffect(() => {
    if (hasRun.current || !onStartup) return
    hasRun.current = true
    onStartup(actions)
  }, [onStartup])

  const prevDraggingWindow = useRef<number | undefined>(undefined)
  useEffect(() => {
    const prev = prevDraggingWindow.current
    prevDraggingWindow.current = state.draggingWindow
    if (prev !== undefined && state.draggingWindow === undefined) {
      const win = state.windows[prev]
      if (win) persistWindowGeometry(workspaceId, win.id, { x: win.x, y: win.y })
    }
  }, [state.draggingWindow, state.windows, workspaceId])

  const prevResizingWindow = useRef<number | undefined>(undefined)
  useEffect(() => {
    const prev = prevResizingWindow.current
    prevResizingWindow.current = state.resizingWindow
    if (prev !== undefined && state.resizingWindow === undefined) {
      const win = state.windows[prev]
      if (win) persistWindowGeometry(workspaceId, win.id, { x: win.x, y: win.y, width: win.width, height: win.height })
    }
  }, [state.resizingWindow, state.windows, workspaceId])

  const onMouseDown = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement
    const windowEl = target.closest('[data-window-index]')
    if (!windowEl) return

    const index = Number.parseInt(
      windowEl.getAttribute('data-window-index') ?? '-1',
      10,
    )
    if (index < 0) return

    event.preventDefault()

    dispatch({ type: WorkspaceActionKind.RAISE_WINDOW, index })

    const resizeHandle = target.closest('[data-resize-handle]')?.getAttribute(
      'data-resize-handle',
    ) as ResizeHandle | null

    if (resizeHandle === 'bottom-left' || resizeHandle === 'bottom-right') {
      dispatch({
        type: WorkspaceActionKind.START_RESIZING_WINDOW,
        index,
        handle: resizeHandle,
        payload: [event.clientX, event.clientY],
      })
      return
    }

    if (target.closest('[data-title-bar]')) {
      dispatch({
        type: WorkspaceActionKind.START_DRAGGING_WINDOW,
        index,
        payload: [event.clientX, event.clientY],
      })
    }
  }, [])

  const onMouseUp = useCallback(() => {
    dispatch({ type: WorkspaceActionKind.STOP_DRAGGING_WINDOW })
    dispatch({ type: WorkspaceActionKind.STOP_RESIZING_WINDOW })
  }, [])

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (event.eventPhase !== 3) return
      if (event.buttons && state.resizeOrigin) {
        dispatch({
          type: WorkspaceActionKind.RESIZE_WINDOW,
          payload: [event.clientX, event.clientY],
        })
      } else if (event.buttons && state.dragOrigin) {
        dispatch({
          type: WorkspaceActionKind.DRAG_WINDOW,
          payload: [event.clientX, event.clientY],
        })
      }
      event.stopPropagation()
      event.preventDefault()
    },
    [state.dragOrigin, state.resizeOrigin]
  )

  return { state, actions, onMouseDown, onMouseUp, onMouseMove }
}
