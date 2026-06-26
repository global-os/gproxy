import { ResizeHandle, State, WorkspaceAction, WorkspaceActionKind } from './types'

const MIN_WINDOW_WIDTH = 120
const MIN_WINDOW_HEIGHT = 80

function applyResize(
  win: State['windows'][number],
  handle: ResizeHandle,
  dx: number,
  dy: number
) {
  if (handle === 'bottom-right') {
    const newWidth = Math.max(MIN_WINDOW_WIDTH, win.width + dx)
    const newHeight = Math.max(MIN_WINDOW_HEIGHT, win.height + dy)
    const dw = newWidth - win.width
    const dh = newHeight - win.height
    return {
      ...win,
      width: newWidth,
      height: newHeight,
      x: win.x + dw / 2,
      y: win.y + dh / 2,
    }
  }

  const newWidth = Math.max(MIN_WINDOW_WIDTH, win.width - dx)
  const newHeight = Math.max(MIN_WINDOW_HEIGHT, win.height + dy)
  const dw = win.width - newWidth
  const dh = newHeight - win.height
  return {
    ...win,
    width: newWidth,
    height: newHeight,
    x: win.x + dw / 2,
    y: win.y + dh / 2,
  }
}

export function replaceNth<T>(arr: T[], n: number, replacement: T): T[] {
  const copy = [...arr]
  copy[n] = replacement
  return copy
}

export function reducer(state: State, action: WorkspaceAction): State {
  console.log('event', action.type)
  switch (action.type) {
    case WorkspaceActionKind.OPEN_WINDOW: {
      return {
        ...state,
        nextWindowID: state.nextWindowID + 1,
        windows: [
          ...state.windows,
          {
            ...action.payload,
            id: state.nextWindowID,
            zIndex: state.zIndexCounter,
          },
        ],
        zIndexCounter: state.zIndexCounter + 1,
      }
    }
    case WorkspaceActionKind.DRAG_WINDOW: {
      if (state.dragOrigin === undefined) {
        throw new Error('cannot drag while drag origin is undefined')
      }
      if (state.draggingWindow === undefined) {
        throw new Error('cannot drag while dragging window is undefined')
      }
      const index = state.draggingWindow
      const windows = [...state.windows]
      const win = windows[index]
      windows[index] = {
        ...win,
        x: win.x + (action.payload[0] - state.dragOrigin[0]),
        y: win.y + (action.payload[1] - state.dragOrigin[1]),
      }
      return {
        ...state,
        windows,
        dragOrigin: action.payload,
      }
    }
    case WorkspaceActionKind.START_DRAGGING_WINDOW: {
      return {
        ...state,
        windows: replaceNth(state.windows, action.index, {
          ...state.windows[action.index],
          zIndex: state.zIndexCounter,
        }),
        zIndexCounter: state.zIndexCounter + 1,
        dragOrigin: action.payload,
        draggingWindow: action.index,
      }
    }
    case WorkspaceActionKind.STOP_DRAGGING_WINDOW: {
      return {
        ...state,
        dragOrigin: undefined,
        draggingWindow: undefined,
      }
    }
    case WorkspaceActionKind.RESIZE_WINDOW: {
      if (state.resizeOrigin === undefined) {
        throw new Error('cannot resize while resize origin is undefined')
      }
      if (state.resizingWindow === undefined) {
        throw new Error('cannot resize while resizing window is undefined')
      }
      if (state.resizeHandle === undefined) {
        throw new Error('cannot resize while resize handle is undefined')
      }
      const index = state.resizingWindow
      const dx = action.payload[0] - state.resizeOrigin[0]
      const dy = action.payload[1] - state.resizeOrigin[1]
      const windows = [...state.windows]
      windows[index] = applyResize(
        windows[index],
        state.resizeHandle,
        dx,
        dy
      )
      return {
        ...state,
        windows,
        resizeOrigin: action.payload,
      }
    }
    case WorkspaceActionKind.START_RESIZING_WINDOW: {
      return {
        ...state,
        windows: replaceNth(state.windows, action.index, {
          ...state.windows[action.index],
          zIndex: state.zIndexCounter,
        }),
        zIndexCounter: state.zIndexCounter + 1,
        resizeOrigin: action.payload,
        resizingWindow: action.index,
        resizeHandle: action.handle,
      }
    }
    case WorkspaceActionKind.STOP_RESIZING_WINDOW: {
      return {
        ...state,
        resizeOrigin: undefined,
        resizingWindow: undefined,
        resizeHandle: undefined,
      }
    }
  }
}
