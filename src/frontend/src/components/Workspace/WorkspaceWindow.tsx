import { MouseEvent } from 'react'
import { createComponent } from 'react-fela'
import { AppWindow } from './types'

const accent = 'rgb(200, 128, 0)'

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
    position: 'absolute',
    zIndex,
    width,
    height,
    top,
    left,
    borderRadius: '10px',
    overflow: 'hidden',
    background: '#12121a',
    boxShadow:
      '0 14px 36px rgba(0,0,0,0.38), 0 0 0 1px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
  })
)

const TitleBar = createComponent(
  () => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '7px 10px 6px',
    minHeight: '36px',
    userSelect: 'none',
    flex: '0 0 auto',
    background: `linear-gradient(180deg, #4f4372 0%, #342a52 45%, #221a38 100%)`,
    borderBottom: `2px solid ${accent}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
  }),
  'div',
  ['data-window-index', 'onMouseDown']
)

const TitleDots = createComponent(
  () => ({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flex: '0 0 auto',
  })
)

const TitleDot = createComponent(
  ({ tone }: { tone?: 'accent' | 'muted' }) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background:
      tone === 'accent'
        ? `radial-gradient(circle at 30% 30%, #ffd68a, ${accent})`
        : 'rgba(255,255,255,0.18)',
    boxShadow:
      tone === 'accent'
        ? '0 0 6px rgba(200,128,0,0.55)'
        : 'inset 0 1px 2px rgba(0,0,0,0.35)',
  })
)

const TitleMeta = createComponent(
  () => ({
    flex: '1 1 auto',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  })
)

const TitleLabel = createComponent(
  () => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.03em',
    color: '#faf3e6',
    textShadow: '0 1px 2px rgba(0,0,0,0.55)',
  }),
  'span'
)

const BundleHint = createComponent(
  () => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '10px',
    fontWeight: 500,
    color: 'rgba(250,243,230,0.55)',
    letterSpacing: '0.02em',
  }),
  'span'
)

const CloseButton = createComponent(
  () => ({
    flex: '0 0 auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    height: '26px',
    borderRadius: '7px',
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.07)',
    color: '#f2dcc0',
    fontSize: '17px',
    lineHeight: 1,
    padding: 0,
    cursor: 'pointer',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
    transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease',
    ':hover': {
      background: 'linear-gradient(180deg, #ff7b6b 0%, #c0392b 100%)',
      borderColor: '#ffb3a8',
      color: '#fff',
    },
  }),
  'button',
  ['type', 'onClick', 'onMouseDown', 'aria-label']
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
    flex: '1 1 auto',
    minHeight: 0,
    width: '100%',
    background: '#fff',
    pointerEvents: dragging ? 'none' : 'auto',
  }),
  'iframe',
  ['src', 'innerRef']
)

type Props = {
  win: AppWindow
  windowIndex: number
  isInteracting: boolean
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
    >
      <TitleBar data-window-index={windowIndex} onMouseDown={onMouseDown}>
        <TitleDots aria-hidden>
          <TitleDot tone="accent" />
          <TitleDot />
          <TitleDot />
        </TitleDots>
        <TitleMeta>
          <TitleLabel>{win.title}</TitleLabel>
          {win.bundleName && win.bundleName !== `${win.title}.gapp` && (
            <BundleHint>{win.bundleName}</BundleHint>
          )}
        </TitleMeta>
        <CloseButton
          type="button"
          aria-label={`Close ${win.title}`}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation()
            onClose()
          }}
        >
          ×
        </CloseButton>
      </TitleBar>
      <StyledIframe
        dragging={isInteracting}
        src={win.src}
        innerRef={onIframeRef}
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