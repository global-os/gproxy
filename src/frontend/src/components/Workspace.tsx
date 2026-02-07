import {
  HTMLProps,
  MouseEvent,
  MouseEventHandler,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import { createComponent } from 'react-fela'

const replaceNth = function<T>(arr: T[], n: number, replacement: T): T[] {
  const copy = [...arr];
  copy[n] = replacement;
  return copy;
}

const StyledIframe = createComponent(
  () => ({
    border: '0',
    flex: '1 1',
    width: '100%',
  }),
  'iframe',
  ['src']
)

const Frame = createComponent(
  () => ({
    position: 'relative',
    background: '#e5a455ff',
    width: '100%',
    height: '100%',
  }),
  'div',
  ['onMouseMove', 'onMouseUp']
)

const Chrome = createComponent(
  ({
    left,
    top,
    width,
    height,
    zIndex,
  }: {
    left: string
    top: string
    width: string
    height: string
    zIndex: number
  }) => ({
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(0,0,0, 0.5)',
    background: 'red',
    position: 'absolute',
    zIndex: zIndex,
    width,
    height,
    top,
    left,
  })
)

const Title = createComponent(
  () => ({
    borderBottom: '1px solid rgba(0,0,0, 0.5)',
    background: 'rgba(255,255,255, 0.8)',
    userSelect: 'none',
    flex: '0 0',
  }),
  'div',
  ['data-window-index', 'onMouseMove', 'onMouseDown']
)

type State = {
  windows: Window[]
  nextWindowID: number
  draggingWindow: number | undefined
  dragOrigin: undefined | [number, number]
  zIndexCounter: number
}

type WindowSpec = {
  title: string

  width: number
  height: number

  x: number
  y: number
}

type Window = {
  id: number
  zIndex: number

  title: string

  width: number
  height: number

  x: number
  y: number
}

enum WorkspaceActionKind {
  OPEN_WINDOW = 'OPEN_WINDOW',
  DRAG_WINDOW = 'DRAG_WINDOW',
  START_DRAGGING_WINDOW = 'START_DRAGGING_WINDOW',
  STOP_DRAGGING_WINDOW = 'STOP_DRAGGING_WINDOW',
}

type WorkspaceAction =
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

function reducer(state: State, action: WorkspaceAction): State {
  console.log('event', action.type)
  switch (action.type) {
    case WorkspaceActionKind.OPEN_WINDOW: {
      return {
        ...state,
        nextWindowID: state.nextWindowID + 1,
        windows: [
          ...state.windows,
          { ...action.payload, id: state.nextWindowID, zIndex: state.zIndexCounter },
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
  }
}

type Props = {
  children: {
    onStartup: (actions: WorkspaceActions) => void
  }
}

export type WorkspaceActions = {
  openWindow: (window: WindowSpec) => void
}

export const Workspace = ({ children }: Props) => {
  const [workspaceState, workspaceDispatch]: [
    State,
    React.Dispatch<WorkspaceAction>,
  ] = useReducer(reducer, {
    nextWindowID: 1,
    windows: [],
    dragOrigin: undefined,
    draggingWindow: undefined,
    zIndexCounter: 1,
  })

  const workspaceActions: WorkspaceActions = {
    openWindow(windowSpec: WindowSpec) {
      workspaceDispatch({
        type: WorkspaceActionKind.OPEN_WINDOW,
        payload: windowSpec,
      })
    },
  }

  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    children.onStartup(workspaceActions)
  }, [])

  const computeX = (x: number, width: number) => {
    return (window as any).innerWidth / 2 - width / 2 + x
  }
  const computeY = (y: number, height: number) => {
    return (window as any).innerHeight / 2 - height / 2 + y
  }

  const onMouseDown = useCallback((event: MouseEvent) => {
    const index = Number.parseInt(
      (event.target as HTMLElement).getAttribute('data-window-index') ?? '0',
      10
    )

    workspaceDispatch({
      type: WorkspaceActionKind.START_DRAGGING_WINDOW,
      index,
      payload: [event.clientX, event.clientY],
    })
  }, [])

  const onMouseUp = useCallback(() => {
    workspaceDispatch({
      type: WorkspaceActionKind.STOP_DRAGGING_WINDOW,
    })
  }, [])

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (event.eventPhase !== 3) {
        return
      }
      if (event.buttons && workspaceState.dragOrigin) {
        workspaceDispatch({
          type: WorkspaceActionKind.DRAG_WINDOW,
          payload: [event.clientX, event.clientY],
        })
      }
      event.stopPropagation()
      event.preventDefault()
    },
    [workspaceState.dragOrigin]
  )

  return (
    <Frame onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      {workspaceState.windows.map((win, i) => {
        return (
          <Chrome
            key={win.id}
            left={computeX(win.x, win.width) + 'px'}
            top={computeY(win.y, win.height) + 'px'}
            width={win.width + 'px'}
            height={win.height + 'px'}
            zIndex={win.zIndex}
          >
            <Title data-window-index={i} onMouseDown={onMouseDown}>
              {win.title}
            </Title>
            <StyledIframe src="http://news.ycombinator.com"></StyledIframe>
          </Chrome>
        )
      })}
    </Frame>
  )
}
