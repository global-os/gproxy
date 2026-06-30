import { createComponent } from 'react-fela'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { WorkspaceProps } from './types'
import { useWorkspace } from './useWorkspace'
import { WorkspaceWindow } from './WorkspaceWindow'
import { useWorkspaceKernel } from '../../kernel/useWorkspaceKernel'
import { WorkspaceLogger } from '../WorkspaceLogger'
import { Taskbar, TASKBAR_HEIGHT, type FileIndexEntry } from './Taskbar'
import { useWorkspaceEvents } from '../../hooks/useWorkspaceEvents'
import {
  iconsService,
  installIconsConsoleApi,
  type DesktopApiResponse,
} from '../../services/icons-service'

export type { WorkspaceActions } from './types'

type DesktopItem = {
  type: 'directory' | 'file'
  id: number
  name: string
  mime_type?: string
  /** Absolute path to icon BMP from gapp.json (e.g. /.Resources/icons/16x16/gem.bmp) */
  icon?: string
}

const isLaunchableApp = (item: DesktopItem) =>
  item.type === 'directory' && item.name.endsWith('.gapp')

const Frame = createComponent(
  ({ interacting }: { interacting?: boolean }) => ({
    position: 'relative',
    background: '#aca8c3',
    width: '100%',
    height: '100%',
    minHeight: '100%',
    paddingBottom: `${TASKBAR_HEIGHT}px`,
    boxSizing: 'border-box',
    overflow: 'hidden',
    cursor: interacting ? 'default' : undefined,
    userSelect: interacting ? 'none' : undefined,
  }),
  'div',
  ['interacting', 'onMouseMove', 'onMouseUp']
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
  ({ launchable }: { launchable?: boolean }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    cursor: launchable ? 'pointer' : 'default',
    userSelect: 'none',
    pointerEvents: 'auto',
    opacity: launchable ? 1 : 0.85,
  }),
  'div',
  ['launchable', 'onClick']
)

const iconChrome = {
  width: '48px',
  height: '48px',
  borderRadius: 0,
  borderWidth: '2px',
  borderStyle: 'solid',
  borderTopColor: '#ffffff',
  borderLeftColor: '#ffffff',
  borderBottomColor: '#808080',
  borderRightColor: '#808080',
  boxShadow: '1px 1px 0 rgba(0,0,0,0.2)',
  boxSizing: 'border-box' as const,
}

const IconShape = createComponent(
  (_props: { isDir?: boolean }) => ({
    ...iconChrome,
    background: '#c0c0c0',
  }),
  'div',
  ['isDir']
)

const IconBitmap = createComponent(
  () => ({
    ...iconChrome,
    display: 'block',
    objectFit: 'contain',
    imageRendering: 'pixelated',
    background: '#080a12',
  }),
  'img',
  ['src', 'alt']
)

const IconLabel = createComponent(
  () => ({
    fontSize: '11px',
    fontFamily: 'Tahoma, "MS Sans Serif", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    textAlign: 'center',
    maxWidth: '80px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#ffffff',
    textShadow: '1px 1px 0 #000000',
  }),
  'span'
)

const LaunchStatus = createComponent(
  () => ({
    position: 'absolute',
    left: '16px',
    bottom: `${TASKBAR_HEIGHT + 16}px`,
    padding: '8px 12px',
    borderRadius: '6px',
    background: 'rgba(0,0,0,0.45)',
    color: '#fff',
    fontSize: '12px',
    pointerEvents: 'none',
  }),
  'div'
)

const computeX = (x: number, width: number) =>
  (window as any).innerWidth / 2 - width / 2 + x

const computeY = (y: number, height: number) =>
  ((window as any).innerHeight - TASKBAR_HEIGHT) / 2 - height / 2 + y

type ServerWindow = {
  id: number
  processId: number
  instanceId: number | null
  instanceSlug?: string
  title: string
  bundleName: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  src: string
  srcdoc?: string | null
}

const serverWindowToAppWindow = (win: ServerWindow) => ({
  id: win.id,
  zIndex: win.zIndex,
  title: win.title,
  bundleName: win.bundleName,
  width: win.width,
  height: win.height,
  x: win.x,
  y: win.y,
  src: win.src,
  srcdoc: win.srcdoc,
  instanceId: win.instanceId,
  processId: win.processId,
})

export function Workspace({ workspaceId, children }: WorkspaceProps) {
  const { state, onMouseDown, onMouseUp, onMouseMove, actions } = useWorkspace(
    workspaceId,
    children.onStartup,
  )
  const [launchMessage, setLaunchMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: desktopData } = useQuery<DesktopApiResponse>({
    queryKey: ['desktop', workspaceId],
    queryFn: async () => {
      const r = await fetch(
        `/api/fs/desktop?workspaceId=${encodeURIComponent(workspaceId)}`,
        { credentials: 'include' },
      )
      if (!r.ok) return { globalPcId: 0, items: [] }
      const body = (await r.json()) as DesktopApiResponse
      if (body.globalPcId) {
        await iconsService.load(workspaceId)
      }
      return body
    },
  })
  const desktopItems = desktopData?.items ?? []
  const { syncWindow, iframeRef, releaseWindow } = useWorkspaceKernel(workspaceId)

  useWorkspaceEvents(workspaceId, {
    onProcessKilled: (event) => {
      for (const windowId of event.windowIds) {
        releaseWindow(windowId)
      }
      actions.closeProcessWindows(event.processId)
      void queryClient.invalidateQueries({ queryKey: ['workspace-windows', workspaceId] })
    },
  })

  useEffect(() => {
    const onWindowOpened = (event: Event) => {
      const win = (event as CustomEvent<ServerWindow>).detail
      if (!win?.id) return
      actions.openWindow(serverWindowToAppWindow(win))
    }
    window.addEventListener('globalos:window-opened', onWindowOpened)
    return () => window.removeEventListener('globalos:window-opened', onWindowOpened)
  }, [actions])

  const hydratedWorkspace = useRef<string | null>(null)

  const { data: workspaceWindows } = useQuery<ServerWindow[]>({
    queryKey: ['workspace-windows', workspaceId],
    queryFn: async () => {
      const r = await fetch(`/api/workspaces/${workspaceId}/windows`, {
        credentials: 'include',
      })
      if (!r.ok) return []
      return r.json()
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })

  useEffect(() => {
    hydratedWorkspace.current = null
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceWindows || hydratedWorkspace.current === workspaceId) return
    hydratedWorkspace.current = workspaceId
    actions.setWindows(workspaceWindows.map(serverWindowToAppWindow))
  }, [workspaceId, workspaceWindows, actions])

  // Stable iframe refs read win from a ref map; sync each render so mount + trace see current metadata.
  for (const win of state.windows) {
    syncWindow(win)
  }

  // Closing a window removes it from state but may not remount other iframes — release explicitly.
  const openWindowIdsRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    const openIds = new Set(state.windows.map((w) => w.id))
    for (const id of openWindowIdsRef.current) {
      if (!openIds.has(id)) releaseWindow(id)
    }
    openWindowIdsRef.current = openIds
  }, [state.windows, releaseWindow])

  useEffect(() => {
    installIconsConsoleApi(() => workspaceId)
  }, [workspaceId])

  useEffect(() => {
    const refreshDesktop = () => {
      void queryClient.invalidateQueries({ queryKey: ['desktop', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['file-index'] })
    }
    window.addEventListener('globalos:desktop-updated', refreshDesktop)
    return () => window.removeEventListener('globalos:desktop-updated', refreshDesktop)
  }, [queryClient, workspaceId])

  const openProgram = useCallback(async (item: DesktopItem) => {
    if (!isLaunchableApp(item)) return

    setLaunchMessage(`Launching ${item.name}…`)
    try {
      const r = await fetch(`/api/workspaces/${workspaceId}/launch`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          directoryId: item.id,
          directoryName: item.name,
        }),
      })

      if (!r.ok) {
        let message = `Launch failed (${r.status})`
        try {
          const body = (await r.json()) as { message?: string }
          if (body.message) message = body.message
        } catch {
          // ignore
        }
        setLaunchMessage(message)
        return
      }

      const result = (await r.json()) as {
        action: 'focus' | 'open'
        window: ServerWindow
      }

      const appWindow = serverWindowToAppWindow(result.window)
      if (result.action === 'focus') {
        actions.focusWindow(appWindow.id, appWindow.zIndex)
      } else {
        actions.openWindow(appWindow)
      }
      setLaunchMessage(null)
      void queryClient.invalidateQueries({ queryKey: ['workspace-logs', workspaceId] })
    } catch (err) {
      setLaunchMessage(err instanceof Error ? err.message : 'Launch failed')
    }
  }, [actions, queryClient, workspaceId])

  const closeWindow = useCallback(async (windowId: number) => {
    actions.closeWindow(windowId)
    try {
      const r = await fetch(`/api/workspaces/${workspaceId}/windows/${windowId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!r.ok) return
      await queryClient.invalidateQueries({ queryKey: ['workspace-windows', workspaceId] })
    } catch {
      // UI already updated; sync on next refresh
    }
  }, [actions, queryClient, workspaceId])

  const launchFromIndex = useCallback((entry: FileIndexEntry) => {
    if (!entry.launchable) return
    void openProgram({
      type: 'directory',
      id: entry.id,
      name: entry.name,
    })
  }, [openProgram])

  return (
    <Frame
      interacting={!!state.dragOrigin || !!state.resizeOrigin}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <IconGrid>
        {desktopItems.map(item => {
          const launchable = isLaunchableApp(item)
          return (
            <IconBox
              key={`${item.type}-${item.id}`}
              launchable={launchable}
              onClick={launchable ? () => void openProgram(item) : undefined}
            >
              {item.icon
                ? <IconBitmap src={`/api/fs/icons?path=${encodeURIComponent(item.icon)}`} alt="" />
                : <IconShape isDir={item.type === 'directory'} />}
              <IconLabel>{item.name}</IconLabel>
            </IconBox>
          )
        })}
      </IconGrid>
      {launchMessage && <LaunchStatus>{launchMessage}</LaunchStatus>}
      <Taskbar onLaunchApp={launchFromIndex} />
      <WorkspaceLogger workspaceId={workspaceId} />
      {state.windows.map((win, i) => {
        const topZIndex = state.windows.reduce(
          (max, w) => Math.max(max, w.zIndex),
          0,
        )
        return (
          <WorkspaceWindow
            key={win.id}
            win={win}
            windowIndex={i}
            isInteracting={!!state.dragOrigin || !!state.resizeOrigin}
            frontmost={win.zIndex >= topZIndex}
            left={computeX(win.x, win.width) + 'px'}
            top={computeY(win.y, win.height) + 'px'}
            onMouseDown={onMouseDown}
            onClose={() => void closeWindow(win.id)}
            onIframeRef={iframeRef(win.id)}
          />
        )
      })}
    </Frame>
  )
}