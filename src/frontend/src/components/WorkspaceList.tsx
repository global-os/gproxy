import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { useSession } from '../lib/auth-client'

type WorkspaceProcessWindow = {
  id: number
  title: string
}

type WorkspaceProcess = {
  id: number
  workspaceId: number
  directoryId: number
  bundleName: string
  windows: WorkspaceProcessWindow[]
  instances: Array<{
    id: number
    slug: string
    state: 'starting' | 'running'
  }>
}

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

type Workspace = {
  id: number
  name?: string | null
  user_id: string
}

async function fetchWorkspaces(): Promise<Workspace[]> {
  const r = await fetch('/api/workspaces', { credentials: 'include' })
  if (!r.ok) throw new Error(`Failed to load workspaces (${r.status})`)
  return r.json()
}

async function createWorkspace(): Promise<Workspace[]> {
  const r = await fetch('/api/workspaces', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({}),
  })
  if (!r.ok) {
    let message = `Failed to create workspace (${r.status})`
    try {
      const body = (await r.json()) as { message?: string }
      if (body.message) message = body.message
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return r.json()
}

async function fetchWorkspaceProcesses(workspaceId: number): Promise<WorkspaceProcess[]> {
  const r = await fetch(`/api/workspaces/${workspaceId}/processes`, { credentials: 'include' })
  if (!r.ok) throw new Error(`Failed to load processes (${r.status})`)
  return r.json()
}

async function closeWorkspaceWindow(workspaceId: number, windowId: number): Promise<void> {
  const r = await fetch(`/api/workspaces/${workspaceId}/windows/${windowId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!r.ok) {
    let message = `Failed to close window (${r.status})`
    try {
      const body = (await r.json()) as { message?: string }
      if (body.message) message = body.message
    } catch { /* ignore */ }
    throw new Error(message)
  }
}

async function killWorkspaceProcess(workspaceId: number, processId: number): Promise<void> {
  const r = await fetch(`/api/workspaces/${workspaceId}/processes/${processId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!r.ok) {
    let message = `Failed to kill process (${r.status})`
    try {
      const body = (await r.json()) as { message?: string }
      if (body.message) message = body.message
    } catch { /* ignore */ }
    throw new Error(message)
  }
}

async function deleteWorkspace(workspaceId: number): Promise<void> {
  const r = await fetch(`/api/workspaces/${workspaceId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!r.ok) {
    let message = `Failed to delete workspace (${r.status})`
    try {
      const body = (await r.json()) as { message?: string }
      if (body.message) message = body.message
    } catch { /* ignore */ }
    throw new Error(message)
  }
}

function workspaceLabel(ws: Workspace, index: number): string {
  if (ws.name && ws.name !== 'bar') return ws.name
  return `Workspace ${index + 1}`
}

function instanceStateLabel(state: WorkspaceProcess['instances'][number]['state']): string {
  switch (state) {
    case 'running':
      return 'running'
    case 'starting':
      return 'starting'
  }
}

function instanceStateCls(state: WorkspaceProcess['instances'][number]['state']): string {
  switch (state) {
    case 'running':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    case 'starting':
      return 'text-amber-700 bg-amber-50 border-amber-200'
  }
}

function WindowRow({ win, workspaceId }: { win: WorkspaceProcessWindow; workspaceId: number }) {
  const queryClient = useQueryClient()
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = async () => {
    setClosing(true)
    setError(null)
    try {
      await closeWorkspaceWindow(workspaceId, win.id)
      await queryClient.invalidateQueries({ queryKey: ['workspace-processes', workspaceId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close window')
    } finally {
      setClosing(false)
    }
  }

  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-600 truncate">{win.title}</span>
      {error && <span className="text-xs text-red-500 shrink-0">{error}</span>}
      <button
        type="button"
        disabled={closing}
        onClick={() => void handleClose()}
        className={cn(
          'shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors duration-100',
          closing
            ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-default'
            : 'bg-white border-gray-200 text-gray-500 cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600',
        )}
      >
        {closing ? '…' : '×'}
      </button>
    </li>
  )
}

function ProcessRow({ proc, workspaceId }: { proc: WorkspaceProcess; workspaceId: number }) {
  const queryClient = useQueryClient()
  const [killing, setKilling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleKill = async () => {
    setKilling(true)
    setError(null)
    try {
      await killWorkspaceProcess(workspaceId, proc.id)
      await queryClient.invalidateQueries({ queryKey: ['workspace-processes', workspaceId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to kill process')
    } finally {
      setKilling(false)
    }
  }

  const windowCount = proc.windows.length

  return (
    <li className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-sm font-medium text-gray-900 truncate">{proc.bundleName}</p>
          <p className="m-0 mt-0.5 text-xs text-gray-400">
            Process {proc.id} · {windowCount} window{windowCount === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          disabled={killing}
          onClick={() => void handleKill()}
          className={cn(
            'shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors duration-100',
            killing
              ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-default'
              : 'bg-white border-red-200 text-red-600 cursor-pointer hover:bg-red-50 hover:border-red-300',
          )}
        >
          {killing ? 'Killing…' : 'Kill'}
        </button>
      </div>
      {error && (
        <p role="alert" className="m-0 text-xs text-red-600">{error}</p>
      )}
      {proc.windows.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-1 pl-2 border-l-2 border-gray-100">
          {proc.windows.map((win) => (
            <WindowRow key={win.id} win={win} workspaceId={workspaceId} />
          ))}
        </ul>
      )}
      {proc.instances.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
          {proc.instances.map((inst) => (
            <li
              key={inst.id}
              className="flex items-center justify-between gap-2 text-xs text-gray-600"
            >
              <span className="font-mono truncate">{inst.slug}</span>
              <span
                className={cn(
                  'shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize',
                  instanceStateCls(inst.state),
                )}
              >
                {instanceStateLabel(inst.state)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function WorkspaceProcessPanel({
  workspaceId,
  expanded,
}: {
  workspaceId: number
  expanded: boolean
}) {
  const { data, isPending, error } = useQuery<WorkspaceProcess[]>({
    queryKey: ['workspace-processes', workspaceId],
    queryFn: () => fetchWorkspaceProcesses(workspaceId),
    enabled: expanded,
  })

  if (!expanded) return null

  if (isPending) {
    return (
      <div className="px-4 py-3 text-sm text-gray-400 border-t border-gray-200 bg-white/60">
        Loading processes…
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-sm text-red-600 border-t border-gray-200 bg-white/60">
        {error instanceof Error ? error.message : 'Failed to load processes'}
      </div>
    )
  }

  const processes = data ?? []

  if (processes.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-gray-400 border-t border-gray-200 bg-white/60">
        No processes on this workspace yet. Open the desk and launch a .gapp to start one.
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 bg-white/60">
      <ul className="m-0 p-0 list-none divide-y divide-gray-100">
        {processes.map((proc) => (
          <ProcessRow key={proc.id} proc={proc} workspaceId={workspaceId} />
        ))}
      </ul>
    </div>
  )
}

function WorkspaceManageCard({
  ws,
  index,
  expanded,
  onToggle,
}: {
  ws: Workspace
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const label = workspaceLabel(ws, index)

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden transition-colors duration-100 hover:border-violet-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent border-none cursor-pointer hover:bg-violet-50/40 transition-colors duration-100"
      >
        <span
          className={cn(
            'shrink-0 w-6 text-center text-xs text-gray-400 transition-transform duration-100',
            expanded && 'rotate-90',
          )}
          aria-hidden
        >
          ▶
        </span>
        <span className="shrink-0 min-w-8 text-center px-2 py-1 rounded-md text-xs font-semibold text-violet-700 bg-violet-100">
          #{index + 1}
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-sm font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">
            {label}
          </span>
          <span className="text-xs text-gray-400">ID {ws.id}</span>
        </div>
        <Link
          to="/workspace/$workspaceId"
          params={{ workspaceId: String(ws.id) }}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold no-underline text-violet-700 bg-violet-100 hover:bg-violet-200 transition-colors duration-100"
        >
          Open
        </Link>
      </button>
      <WorkspaceProcessPanel
        workspaceId={ws.id}
        expanded={expanded}
      />
    </div>
  )
}

function PrimaryButton({
  disabled,
  onClick,
  children,
  type = 'button',
  variant = 'primary',
}: {
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary'
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'self-start px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-100',
        variant === 'primary' && (
          disabled
            ? 'bg-violet-200 text-white cursor-default'
            : 'bg-violet-600 text-white hover:bg-violet-700 cursor-pointer'
        ),
        variant === 'secondary' && (
          disabled
            ? 'bg-gray-50 border border-gray-200 text-gray-300 cursor-default'
            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 cursor-pointer'
        ),
      )}
    >
      {children}
    </button>
  )
}

type WorkspaceListProps = {
  onLogOut?: () => void | Promise<void>
  isLoggingOut?: boolean
}

export const WorkspaceList = ({ onLogOut, isLoggingOut }: WorkspaceListProps) => {
  const queryClient = useQueryClient()
  const [screen, setScreen] = useState<'global-pc' | 'manage'>('global-pc')
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [expandedManageIds, setExpandedManageIds] = useState<Set<number>>(() => new Set())
  const { data: authSession } = useSession()
  const isAdmin = authSession?.user?.email === 'peterson@sent.com'

  const { data, isPending, error } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
  })

  const { isPending: isCreating, mutateAsync: createMutate } = useMutation({
    mutationKey: ['workspaces', 'create'],
    mutationFn: createWorkspace,
    onSuccess: (workspaces) => {
      queryClient.setQueryData(['workspaces'], workspaces)
      setCreateError(null)
    },
  })

  const handleCreateWorkspace = useCallback(async () => {
    setCreateError(null)
    try {
      await createMutate()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create workspace')
    }
  }, [createMutate])

  const openManage = useCallback((workspaceId: number) => {
    setDeleteError(null)
    setExpandedManageIds(new Set([workspaceId]))
    setScreen('manage')
  }, [])

  const toggleManage = useCallback((workspaceId: number) => {
    setExpandedManageIds((current) => {
      const next = new Set(current)
      if (next.has(workspaceId)) next.delete(workspaceId)
      else next.add(workspaceId)
      return next
    })
  }, [])

  const handleDeleteWorkspace = useCallback(async (workspaceId: number) => {
    setDeleteError(null)
    setDeletingId(workspaceId)
    try {
      await deleteWorkspace(workspaceId)
      queryClient.setQueryData<Workspace[]>(['workspaces'], (current) =>
        (current ?? []).filter((ws) => ws.id !== workspaceId),
      )
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete workspace')
    } finally {
      setDeletingId(null)
    }
  }, [queryClient])

  if (isPending) {
    return <div className="py-8 px-4 text-center text-gray-400 text-sm">Loading your workspaces…</div>
  }

  if (error) {
    return <p className="m-0 text-sm text-red-600">Error: {`${error}`}</p>
  }

  const workspaces = data ?? []

  const tabCls = cn(
    'flex-1 border-none rounded-lg px-3 py-2 text-sm font-medium bg-transparent',
    'text-gray-500 cursor-pointer transition-colors duration-100',
    'aria-selected:bg-white aria-selected:text-violet-700 aria-selected:shadow-sm',
  )

  if (screen === 'manage') {
    return (
      <div className="w-full">
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setScreen('global-pc')}
            className="self-start text-sm text-gray-500 bg-transparent border-none p-0 cursor-pointer hover:text-gray-700 transition-colors duration-100"
          >
            ← Back to My Global PC
          </button>

          <div>
            <p className="m-0 text-base font-semibold text-gray-900">Manage</p>
            <p className="m-0 mt-1 text-sm text-gray-500 leading-normal">
              Task manager for workspace processes — kill a process to close its windows and stop its instances.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {workspaces.length === 0 ? (
              <div className="px-4 py-8 rounded-xl text-center text-gray-400 bg-gray-50 border border-dashed border-gray-200 text-sm leading-relaxed">
                No workspaces yet. Create one on My Global PC to manage processes here.
              </div>
            ) : (
              workspaces.map((ws, i) => (
                <WorkspaceManageCard
                  key={ws.id}
                  ws={ws}
                  index={i}
                  expanded={expandedManageIds.has(ws.id)}
                  onToggle={() => toggleManage(ws.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Tabs.Root defaultValue="global-pc">
        <div className="p-1 rounded-xl bg-gray-100 mb-6">
          <Tabs.List className="flex gap-1">
            <Tabs.Tab value="global-pc" className={tabCls}>My Global PC</Tabs.Tab>
            <Tabs.Tab value="settings" className={tabCls}>Settings</Tabs.Tab>
            <Tabs.Tab value="help" className={tabCls}>Help</Tabs.Tab>
            <Tabs.Indicator hidden />
          </Tabs.List>
        </div>

        <Tabs.Panel value="global-pc">
          <div className="flex flex-col gap-4">
            <div>
              <p className="m-0 text-base font-semibold text-gray-900">My Workspaces</p>
              <p className="m-0 mt-1 text-sm text-gray-500 leading-normal">
                Open a desk or remove workspaces you no longer need.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {workspaces.length === 0 ? (
                <div className="px-4 py-8 rounded-xl text-center text-gray-400 bg-gray-50 border border-dashed border-gray-200 text-sm leading-relaxed">
                  No workspaces yet. Create one to launch apps on your Global PC desktop.
                </div>
              ) : (
                workspaces.map((ws, i) => (
                  <div
                    key={ws.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 transition-colors duration-100 hover:bg-violet-50/50 hover:border-violet-200"
                  >
                    <span className="shrink-0 min-w-8 text-center px-2 py-1 rounded-md text-xs font-semibold text-violet-700 bg-violet-100">
                      #{i + 1}
                    </span>

                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">
                        {workspaceLabel(ws, i)}
                      </span>
                      <span className="text-xs text-gray-400">ID {ws.id}</span>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Link
                        to="/workspace/$workspaceId"
                        params={{ workspaceId: String(ws.id) }}
                        className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-semibold no-underline text-white bg-violet-600 hover:bg-violet-700 transition-colors duration-100"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => openManage(ws.id)}
                        className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors duration-100 cursor-pointer"
                      >
                        Manage
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === ws.id}
                        aria-label={`Delete ${workspaceLabel(ws, i)}`}
                        onClick={() => void handleDeleteWorkspace(ws.id)}
                        className={cn(
                          'inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-100 text-lg leading-none',
                          deletingId === ws.id
                            ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-default'
                            : 'bg-white border-gray-200 text-gray-400 cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-500',
                        )}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {createError && (
              <p role="alert" className="m-0 text-sm text-red-600">{createError}</p>
            )}
            {deleteError && (
              <p role="alert" className="m-0 text-sm text-red-600">{deleteError}</p>
            )}

            <div className="flex flex-col gap-2.5 mt-2 pt-5 border-t border-gray-200">
              <PrimaryButton disabled={isCreating} onClick={() => void handleCreateWorkspace()}>
                {isCreating ? 'Creating…' : 'Create New Workspace'}
              </PrimaryButton>
              {onLogOut && (
                <PrimaryButton
                  variant="secondary"
                  disabled={isLoggingOut}
                  onClick={() => void onLogOut()}
                >
                  {isLoggingOut ? 'Logging out…' : 'Log Out'}
                </PrimaryButton>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="mt-1 text-sm text-violet-600 no-underline hover:text-violet-800 transition-colors duration-100"
                >
                  Admin panel
                </Link>
              )}
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="settings">
          <div className="flex flex-col gap-4">
            <p className="m-0 text-base font-semibold text-gray-900">Settings</p>
            <p className="m-0 text-sm text-gray-500 leading-normal">
              Personal settings for your Global PC will appear here.
            </p>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="help">
          <div className="flex flex-col gap-4">
            <p className="m-0 text-base font-semibold text-gray-900">Help</p>
            <p className="m-0 text-sm text-gray-500 leading-normal">
              For support, email{' '}
              <a href="mailto:coldairnetworks@fastmail.com" className="text-violet-600 hover:text-violet-800">
                coldairnetworks@fastmail.com
              </a>{' '}
              and we will assist as soon as possible.
            </p>
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}