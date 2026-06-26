import { createComponent } from 'react-fela'
import { useQuery } from '@tanstack/react-query'
import { WorkspaceProps } from './types'
import { useWorkspace } from './useWorkspace'
import { WorkspaceWindow } from './WorkspaceWindow'

export type { WorkspaceActions } from './types'

type DesktopItem = {
  type: 'directory' | 'file'
  id: number
  name: string
  mime_type?: string
}

const Frame = createComponent(
  () => ({
    position: 'relative',
    background: '#e5a455ff',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  }),
  'div',
  ['onMouseMove', 'onMouseUp']
)

const IconGrid = createComponent(
  () => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 80px)',
    gap: '16px',
    padding: '16px',
    alignContent: 'start',
    pointerEvents: 'none',
  }),
  'div'
)

const IconBox = createComponent(
  () => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    cursor: 'default',
    userSelect: 'none',
    pointerEvents: 'auto',
  }),
  'div'
)

const IconShape = createComponent(
  (_props: { isDir?: boolean }) => ({
    width: '48px',
    height: '48px',
    background: 'rgba(255,255,255,0.75)',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.12)',
  }),
  'div',
  ['isDir']
)

const IconLabel = createComponent(
  () => ({
    fontSize: '11px',
    textAlign: 'center',
    maxWidth: '80px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  }),
  'span'
)

const computeX = (x: number, width: number) =>
  (window as any).innerWidth / 2 - width / 2 + x

const computeY = (y: number, height: number) =>
  (window as any).innerHeight / 2 - height / 2 + y

export function Workspace({ children }: WorkspaceProps) {
  const { state, onMouseDown, onMouseUp, onMouseMove } = useWorkspace(
    children.onStartup
  )

  const { data: desktopItems = [] } = useQuery<DesktopItem[]>({
    queryKey: ['desktop'],
    queryFn: async () => {
      const r = await fetch('/api/fs/desktop', { credentials: 'include' })
      if (!r.ok) return []
      return r.json()
    },
  })

  return (
    <Frame onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <IconGrid>
        {desktopItems.map(item => (
          <IconBox key={`${item.type}-${item.id}`}>
            <IconShape isDir={item.type === 'directory'} />
            <IconLabel>{item.name}</IconLabel>
          </IconBox>
        ))}
      </IconGrid>
      {state.windows.map((win, i) => (
        <WorkspaceWindow
          key={win.id}
          win={win}
          windowIndex={i}
          isInteracting={!!state.dragOrigin || !!state.resizeOrigin}
          left={computeX(win.x, win.width) + 'px'}
          top={computeY(win.y, win.height) + 'px'}
          onMouseDown={onMouseDown}
        />
      ))}
    </Frame>
  )
}
