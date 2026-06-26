export type ResizeHandle = 'bottom-left' | 'bottom-right'

export type State = {
  windows: AppWindow[]
  nextWindowID: number
  draggingWindow: number | undefined
  dragOrigin: undefined | [number, number]
  resizingWindow: number | undefined
  resizeOrigin: undefined | [number, number]
  resizeHandle: ResizeHandle | undefined
  zIndexCounter: number
}

export type WindowSpec = {
  title: string
  width: number
  height: number
  x: number
  y: number
}

export type AppWindow = {
  id: number
  zIndex: number
  title: string
  width: number
  height: number
  x: number
  y: number
}

export enum WorkspaceActionKind {
  OPEN_WINDOW = 'OPEN_WINDOW',
  DRAG_WINDOW = 'DRAG_WINDOW',
  START_DRAGGING_WINDOW = 'START_DRAGGING_WINDOW',
  STOP_DRAGGING_WINDOW = 'STOP_DRAGGING_WINDOW',
  START_RESIZING_WINDOW = 'START_RESIZING_WINDOW',
  RESIZE_WINDOW = 'RESIZE_WINDOW',
  STOP_RESIZING_WINDOW = 'STOP_RESIZING_WINDOW',
}

export type WorkspaceAction =
  | {
      type: WorkspaceActionKind.OPEN_WINDOW
      payload: WindowSpec
    }
  | {
      type: WorkspaceActionKind.DRAG_WINDOW
      payload: [number, number]
    }
  | {
      type: WorkspaceActionKind.START_DRAGGING_WINDOW
      index: number
      payload: [number, number]
    }
  | {
      type: WorkspaceActionKind.STOP_DRAGGING_WINDOW
    }
  | {
      type: WorkspaceActionKind.START_RESIZING_WINDOW
      index: number
      handle: ResizeHandle
      payload: [number, number]
    }
  | {
      type: WorkspaceActionKind.RESIZE_WINDOW
      payload: [number, number]
    }
  | {
      type: WorkspaceActionKind.STOP_RESIZING_WINDOW
    }

export type WorkspaceActions = {
  openWindow: (window: WindowSpec) => void
}

export type WorkspaceProps = {
  children: {
    onStartup: (actions: WorkspaceActions) => void
  }
}
