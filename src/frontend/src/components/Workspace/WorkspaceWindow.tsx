import { MouseEvent } from 'react'
import { createComponent } from 'react-fela'
import { AppWindow } from './types'

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

const TitleBar = createComponent(
  () => ({
    borderBottom: '1px solid rgba(0,0,0, 0.5)',
    background: 'rgba(255,255,255, 0.8)',
    userSelect: 'none',
    flex: '0 0',
  }),
  'div',
  ['data-window-index', 'onMouseDown']
)

const ResizeHandle = createComponent(
  ({
    cursor,
    side,
  }: {
    cursor: string
    side: 'left' | 'right'
  }) => ({
    position: 'absolute',
    width: '14px',
    height: '14px',
    bottom: 0,
    left: side === 'left' ? 0 : undefined,
    right: side === 'right' ? 0 : undefined,
    cursor,
    zIndex: 1,
  }),
  'div',
  ['data-window-index', 'data-resize-handle', 'onMouseDown']
)

const StyledIframe = createComponent(
  ({ dragging }: { dragging: boolean }) => ({
    border: '0',
    flex: '1 1',
    width: '100%',
    pointerEvents: dragging ? 'none' : 'auto',
  }),
  'iframe',
  ['src']
)

type Props = {
  win: AppWindow
  windowIndex: number
  isInteracting: boolean
  left: string
  top: string
  onMouseDown: (e: MouseEvent) => void
}

export function WorkspaceWindow({
  win,
  windowIndex,
  isInteracting,
  left,
  top,
  onMouseDown,
}: Props) {
  return (
    <Chrome
      left={left}
      top={top}
      width={win.width + 'px'}
      height={win.height + 'px'}
      zIndex={win.zIndex}
    >
      <TitleBar data-window-index={windowIndex} onMouseDown={onMouseDown}>
        {win.title}
      </TitleBar>
      <StyledIframe
        dragging={isInteracting}
        src="https://app.app.onetrueos.com/"
      />
      <ResizeHandle
        cursor="nesw-resize"
        side="left"
        data-window-index={windowIndex}
        data-resize-handle="bottom-left"
        onMouseDown={onMouseDown}
      />
      <ResizeHandle
        cursor="nwse-resize"
        side="right"
        data-window-index={windowIndex}
        data-resize-handle="bottom-right"
        onMouseDown={onMouseDown}
      />
    </Chrome>
  )
}