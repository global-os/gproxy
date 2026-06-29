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
  id?: number
  zIndex?: number
  title: string
  bundleName?: string
  width: number
  height: number
  x: number
  y: number
  src: string
  srcdoc?: string | null
  instanceId?: number | null
  processId?: number
}

export type AppWindow = {
  id: number
  zIndex: number
  title: string
  bundleName?: string
  width: number
  height: number
  x: number
  y: number
  src: string
  srcdoc?: string | null
  instanceId?: number | null
  processId?: number
}

export enum WorkspaceActionKind {
  SET_WINDOWS = 'SET_WINDOWS',
  OPEN_WINDOW = 'OPEN_WINDOW',
  FOCUS_WINDOW = 'FOCUS_WINDOW',
  CLOSE_WINDOW = 'CLOSE_WINDOW',
  CLOSE_PROCESS_WINDOWS = 'CLOSE_PROCESS_WINDOWS',
  DRAG_WINDOW = 'DRAG_WINDOW',
  RAISE_WINDOW = 'RAISE_WINDOW',
  START_DRAGGING_WINDOW = 'START_DRAGGING_WINDOW',
  STOP_DRAGGING_WINDOW = 'STOP_DRAGGING_WINDOW',
  START_RESIZING_WINDOW = 'START_RESIZING_WINDOW',
  RESIZE_WINDOW = 'RESIZE_WINDOW',
  STOP_RESIZING_WINDOW = 'STOP_RESIZING_WINDOW',
}

export type WorkspaceAction =
  | {
      type: WorkspaceActionKind.SET_WINDOWS
      payload: AppWindow[]
    }
  | {
      type: WorkspaceActionKind.OPEN_WINDOW
      payload: WindowSpec
    }
  | {
      type: WorkspaceActionKind.FOCUS_WINDOW
      windowId: number
      zIndex: number
    }
  | {
      type: WorkspaceActionKind.CLOSE_WINDOW
      windowId: number
    }
  | {
      type: WorkspaceActionKind.CLOSE_PROCESS_WINDOWS
      processId: number
    }
  | {
      type: WorkspaceActionKind.DRAG_WINDOW
      payload: [number, number]
    }
  | {
      type: WorkspaceActionKind.RAISE_WINDOW
      index: number
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
  setWindows: (windows: AppWindow[]) => void
  focusWindow: (windowId: number, zIndex: number) => void
  closeWindow: (windowId: number) => void
  closeProcessWindows: (processId: number) => void
}

export type WorkspaceProps = {
  workspaceId: string
  children: {
    onStartup?: (actions: WorkspaceActions) => void
  }
}
