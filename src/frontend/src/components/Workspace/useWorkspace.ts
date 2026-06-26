import { MouseEvent, useCallback, useEffect, useReducer, useRef } from 'react'
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

export function useWorkspace(onStartup: (actions: WorkspaceActions) => void) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actions: WorkspaceActions = {
    openWindow(windowSpec) {
      dispatch({ type: WorkspaceActionKind.OPEN_WINDOW, payload: windowSpec })
    },
  }

  const hasRun = useRef(false)
  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true
    onStartup(actions)
  }, [])

  const onMouseDown = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement
    const index = Number.parseInt(
      target.getAttribute('data-window-index') ?? '0',
      10
    )
    const resizeHandle = target.getAttribute(
      'data-resize-handle'
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

    dispatch({
      type: WorkspaceActionKind.START_DRAGGING_WINDOW,
      index,
      payload: [event.clientX, event.clientY],
    })
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

  return { state, onMouseDown, onMouseUp, onMouseMove }
}
