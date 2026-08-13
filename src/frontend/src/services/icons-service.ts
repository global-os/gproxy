type IconsApiResponse = {
  globalPcId: number
  icons: Record<string, string>
}

type DesktopApiResponse = {
  globalPcId: number
  items: Array<{
    type: 'directory' | 'file'
    id: number
    name: string
    mime_type?: string
    icon?: string
  }>
}

const cacheByGlobalPc = new Map<number, Record<string, string>>()
let activeGlobalPcId: number | null = null

function iconForEntry(entryName: string): string | undefined {
  if (activeGlobalPcId == null) return undefined
  return cacheByGlobalPc.get(activeGlobalPcId)?.[entryName]
}

async function loadIcons(workspaceId: string): Promise<number> {
  const r = await fetch(
    `/api/global-pc/icons?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      credentials: 'include',
    }
  )
  if (!r.ok) throw new Error(`Failed to load icons (${r.status})`)

  const body = (await r.json()) as IconsApiResponse
  cacheByGlobalPc.set(body.globalPcId, { ...body.icons })
  activeGlobalPcId = body.globalPcId
  return body.globalPcId
}

async function setIcon(
  workspaceId: string,
  entryName: string,
  iconId: string
): Promise<void> {
  const workspaceIdNum = Number.parseInt(workspaceId, 10)
  const r = await fetch('/api/global-pc/icons', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspaceId: Number.isFinite(workspaceIdNum) ? workspaceIdNum : undefined,
      entryName,
      iconId,
    }),
  })
  if (!r.ok) throw new Error(`Failed to set icon (${r.status})`)

  const body = (await r.json()) as {
    globalPcId: number
    entryName: string
    iconId: string
  }
  const map = cacheByGlobalPc.get(body.globalPcId) ?? {}
  map[body.entryName] = body.iconId
  cacheByGlobalPc.set(body.globalPcId, map)
  activeGlobalPcId = body.globalPcId
}

async function resetIcons(workspaceId: string): Promise<void> {
  const r = await fetch(
    `/api/global-pc/icons?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  )
  if (!r.ok) throw new Error(`Failed to reset icons (${r.status})`)

  const body = (await r.json()) as { globalPcId: number }
  cacheByGlobalPc.delete(body.globalPcId)
  activeGlobalPcId = body.globalPcId
}

export type IconsService = {
  load: (workspaceId: string) => Promise<number>
  get: (entryName: string) => string | undefined
  set: (workspaceId: string, entryName: string, iconId: string) => Promise<void>
  reset: (workspaceId: string) => Promise<void>
  activeGlobalPcId: () => number | null
}

export const iconsService: IconsService = {
  load: loadIcons,
  get: iconForEntry,
  set: setIcon,
  reset: resetIcons,
  activeGlobalPcId: () => activeGlobalPcId,
}

export type { DesktopApiResponse }

declare global {
  interface Window {
    globalos?: {
      icons?: {
        reset: (workspaceId?: string) => Promise<void>
        set: (
          entryName: string,
          iconId: string,
          workspaceId?: string
        ) => Promise<void>
        get: (entryName: string) => string | undefined
      }
    }
  }
}

export function installIconsConsoleApi(getWorkspaceId: () => string | null) {
  window.globalos ??= {}
  window.globalos.icons = {
    get: (entryName) => iconForEntry(entryName),
    set: async (entryName, iconId, workspaceId) => {
      const wid = workspaceId ?? getWorkspaceId()
      if (!wid) throw new Error('No active workspace')
      await setIcon(wid, entryName, iconId)
      window.dispatchEvent(new CustomEvent('globalos:desktop-updated'))
    },
    reset: async (workspaceId) => {
      const wid = workspaceId ?? getWorkspaceId()
      if (!wid) throw new Error('No active workspace')
      await resetIcons(wid)
      window.dispatchEvent(new CustomEvent('globalos:desktop-updated'))
    },
  }
}
