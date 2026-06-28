import { MouseEvent } from 'react'
import { createComponent } from 'react-fela'
import { AppWindow } from './types'

const retroFont =
  'Tahoma, "MS Sans Serif", "Segoe UI", ui-sans-serif, system-ui, sans-serif'

const outsetBorder = {
  borderWidth: '2px',
  borderStyle: 'solid',
  borderTopColor: '#ffffff',
  borderLeftColor: '#ffffff',
  borderBottomColor: '#808080',
  borderRightColor: '#808080',
}

const insetBorder = {
  borderWidth: '2px',
  borderStyle: 'solid',
  borderTopColor: '#808080',
  borderLeftColor: '#808080',
  borderBottomColor: '#ffffff',
  borderRightColor: '#ffffff',
}

const Chrome = createComponent(
  ({
    left,
    top,
    width,
    height,
    zIndex,
    interacting,
  }: {
    left: string
    top: string
    width: string
    height: string
    zIndex: number
    interacting?: boolean
  }) => ({
    display: 'flex',
    flexDirection: 'column',
    position: 'absolute',
    zIndex,
    width,
    height,
    top,
    left,
    borderRadius: 0,
    overflow: 'visible',
    background: '#c0c0c0',
    padding: '3px',
    boxSizing: 'border-box',
    ...outsetBorder,
    boxShadow: '2px 2px 0 rgba(0,0,0,0.35)',
    userSelect: interacting ? 'none' : undefined,
  })
)

const TitleBar = createComponent(
  () => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 3px',
    minHeight: '26px',
    userSelect: 'none',
    cursor: 'default',
    flex: '0 0 auto',
    fontFamily: retroFont,
    background: 'linear-gradient(90deg, #4c1d95 0%, #7c3aed 38%, #6d28d9 62%, #4c1d95 100%)',
    borderBottom: '1px solid #2e1065',
  }),
  'div',
  ['data-window-index', 'data-title-bar', 'onMouseDown']
)

const TitleIcon = createComponent(
  () => ({
    flex: '0 0 auto',
    width: '16px',
    height: '16px',
    background: '#c0c0c0',
    ...outsetBorder,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    lineHeight: 1,
    color: '#4c1d95',
    fontWeight: 700,
    cursor: 'default',
    userSelect: 'none',
  })
)

const TitleMeta = createComponent(
  () => ({
    flex: '1 1 auto',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    paddingLeft: '2px',
    cursor: 'default',
    userSelect: 'none',
  })
)

const TitleLabel = createComponent(
  () => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: retroFont,
    letterSpacing: '0.01em',
    color: '#ffffff',
    textShadow: '1px 1px 0 rgba(0,0,0,0.45)',
    cursor: 'default',
    userSelect: 'none',
  }),
  'span'
)

const BundleHint = createComponent(
  () => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '10px',
    fontWeight: 400,
    fontFamily: retroFont,
    color: 'rgba(255,255,255,0.72)',
    cursor: 'default',
    userSelect: 'none',
  }),
  'span'
)

const TitleButtons = createComponent(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  flex: '0 0 auto',
}))

const ChromeButton = createComponent(
  ({ active }: { active?: boolean }) => ({
    flex: '0 0 auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: 0,
    padding: 0,
    margin: 0,
    fontFamily: retroFont,
    fontSize: '11px',
    fontWeight: 700,
    lineHeight: 1,
    color: '#000000',
    background: '#c0c0c0',
    cursor: active ? 'pointer' : 'default',
    ...(active ? outsetBorder : outsetBorder),
    ':hover': active
      ? {
          background: '#d4d4d4',
        }
      : {},
    ':active': active
      ? {
          ...insetBorder,
          paddingTop: '1px',
          paddingLeft: '1px',
        }
      : {},
  }),
  'button',
  ['type', 'onClick', 'onMouseDown', 'aria-label', 'disabled']
)

const ContentFrame = createComponent(() => ({
  flex: '1 1 auto',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: '#c0c0c0',
  padding: '2px',
  ...insetBorder,
}), 'div', ['data-window-index', 'onMouseDown'])

const ResizeHandle = createComponent(
  ({
    cursor,
    side,
  }: {
    cursor: string
    side: 'left' | 'right'
  }) => ({
    position: 'absolute',
    width: '22px',
    height: '22px',
    bottom: '-8px',
    left: side === 'left' ? '-8px' : undefined,
    right: side === 'right' ? '-8px' : undefined,
    cursor,
    zIndex: 2,
    background: 'rgba(255, 235, 59, 0.45)',
    boxSizing: 'border-box',
    border: '1px solid rgba(218, 165, 32, 0.55)',
  }),
  'div',
  ['data-window-index', 'data-resize-handle', 'onMouseDown']
)

const StyledIframe = createComponent(
  ({ dragging, frontmost }: { dragging: boolean; frontmost: boolean }) => ({
    border: '0',
    flex: '1 1 auto',
    minHeight: 0,
    width: '100%',
    background: '#ffffff',
    pointerEvents: dragging || !frontmost ? 'none' : 'auto',
    display: 'block',
  }),
  'iframe',
  ['src', 'innerRef', 'data-window-id']
)

type Props = {
  win: AppWindow
  windowIndex: number
  isInteracting: boolean
  frontmost: boolean
  left: string
  top: string
  onMouseDown: (e: MouseEvent) => void
  onClose: () => void
  onIframeRef?: (el: HTMLIFrameElement | null) => void
}

export function WorkspaceWindow({
  win,
  windowIndex,
  isInteracting,
  frontmost,
  left,
  top,
  onMouseDown,
  onClose,
  onIframeRef,
}: Props) {
  return (
    <Chrome
      left={left}
      top={top}
      width={win.width + 'px'}
      height={win.height + 'px'}
      zIndex={win.zIndex}
      interacting={isInteracting}
    >
      <TitleBar
        data-window-index={windowIndex}
        data-title-bar=""
        onMouseDown={onMouseDown}
      >
        <TitleIcon aria-hidden>◆</TitleIcon>
        <TitleMeta>
          <TitleLabel>{win.title}</TitleLabel>
          {win.bundleName && win.bundleName !== `${win.title}.gapp` && (
            <BundleHint>{win.bundleName}</BundleHint>
          )}
        </TitleMeta>
        <TitleButtons>
          <ChromeButton type="button" disabled aria-label="Minimize" onMouseDown={e => e.stopPropagation()}>
            <span style={{ marginTop: '-4px' }}>_</span>
          </ChromeButton>
          <ChromeButton type="button" disabled aria-label="Maximize" onMouseDown={e => e.stopPropagation()}>
            □
          </ChromeButton>
          <ChromeButton
            type="button"
            active
            aria-label={`Close ${win.title}`}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
              onClose()
            }}
          >
            ×
          </ChromeButton>
        </TitleButtons>
      </TitleBar>
      <ContentFrame data-window-index={windowIndex} onMouseDown={onMouseDown}>
        <StyledIframe
          dragging={isInteracting}
          frontmost={frontmost}
          src={win.src}
          data-window-id={String(win.id)}
          innerRef={onIframeRef}
        />
      </ContentFrame>
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