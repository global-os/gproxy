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

const FileList = createComponent(
  () => ({
    margin: 0,
    padding: '16px 24px',
    listStyle: 'disc',
    color: '#fff',
    fontSize: '14px',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
    pointerEvents: 'none',
  }),
  'ul'
)

const FileListItem = createComponent(
  () => ({
    marginBottom: '4px',
  }),
  'li'
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
      const r = await fetch('/api/fs/desktop')
      if (!r.ok) return []
      return r.json()
    },
  })

  return (
    <Frame onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      {desktopItems.length > 0 && (
        <FileList>
          {desktopItems.map(item => (
            <FileListItem key={`${item.type}-${item.id}`}>
              {item.name}
              {item.type === 'directory' ? '/' : ''}
            </FileListItem>
          ))}
        </FileList>
      )}
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
