import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { useSession } from '../lib/auth-client'

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

type Session = {
  id: number
  name?: string | null
  user_id: string
}

async function fetchSessions(): Promise<Session[]> {
  const r = await fetch('/api/sessions', { credentials: 'include' })
  if (!r.ok) throw new Error(`Failed to load sessions (${r.status})`)
  return r.json()
}

async function createSession(): Promise<Session[]> {
  const r = await fetch('/api/sessions', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({}),
  })
  if (!r.ok) {
    let message = `Failed to create session (${r.status})`
    try {
      const body = (await r.json()) as { message?: string }
      if (body.message) message = body.message
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return r.json()
}

async function deleteSession(sessionId: number): Promise<void> {
  const r = await fetch(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!r.ok) {
    let message = `Failed to delete session (${r.status})`
    try {
      const body = (await r.json()) as { message?: string }
      if (body.message) message = body.message
    } catch { /* ignore */ }
    throw new Error(message)
  }
}

function sessionLabel(sess: Session, index: number): string {
  if (sess.name && sess.name !== 'bar') return sess.name
  return `Session ${index + 1}`
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
            ? 'bg-blue-200 text-white cursor-default'
            : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
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

type SessionListProps = {
  onLogOut?: () => void | Promise<void>
  isLoggingOut?: boolean
}

export const SessionList = ({ onLogOut, isLoggingOut }: SessionListProps) => {
  const queryClient = useQueryClient()
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { data: sessionData } = useSession()
  const isAdmin = sessionData?.user?.email === 'peterson@sent.com'

  const { data, isPending, error } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  })

  const { isPending: isCreating, mutateAsync: createMutate } = useMutation({
    mutationKey: ['sessions', 'create'],
    mutationFn: createSession,
    onSuccess: (sessions) => {
      queryClient.setQueryData(['sessions'], sessions)
      setCreateError(null)
    },
  })

  const handleCreateSession = useCallback(async () => {
    setCreateError(null)
    try {
      await createMutate()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create session')
    }
  }, [createMutate])

  const handleDeleteSession = useCallback(async (sessionId: number) => {
    setDeleteError(null)
    setDeletingId(sessionId)
    try {
      await deleteSession(sessionId)
      queryClient.setQueryData<Session[]>(['sessions'], (current) =>
        (current ?? []).filter((sess) => sess.id !== sessionId),
      )
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete session')
    } finally {
      setDeletingId(null)
    }
  }, [queryClient])

  if (isPending) {
    return <div className="py-8 px-4 text-center text-gray-400 text-sm">Loading your sessions…</div>
  }

  if (error) {
    return <p className="m-0 text-sm text-red-600">Error: {`${error}`}</p>
  }

  const sessions = data ?? []

  const tabCls = cn(
    'flex-1 border-none rounded-lg px-3 py-2 text-sm font-medium bg-transparent',
    'text-gray-500 cursor-pointer transition-colors duration-100',
    'aria-selected:bg-white aria-selected:text-blue-700 aria-selected:shadow-sm',
  )

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
              <p className="m-0 text-base font-semibold text-gray-900">My Sessions</p>
              <p className="m-0 mt-1 text-sm text-gray-500 leading-normal">
                Open a workspace desktop or remove sessions you no longer need.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {sessions.length === 0 ? (
                <div className="px-4 py-8 rounded-xl text-center text-gray-400 bg-gray-50 border border-dashed border-gray-200 text-sm leading-relaxed">
                  No sessions yet. Create one to launch apps on your Global PC desktop.
                </div>
              ) : (
                sessions.map((sess, i) => (
                  <div
                    key={sess.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 transition-colors duration-100 hover:bg-blue-50/50 hover:border-blue-200"
                  >
                    <span className="shrink-0 min-w-8 text-center px-2 py-1 rounded-md text-xs font-semibold text-blue-700 bg-blue-100">
                      #{i + 1}
                    </span>

                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">
                        {sessionLabel(sess, i)}
                      </span>
                      <span className="text-xs text-gray-400">ID {sess.id}</span>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Link
                        to="/session/$sessionId"
                        params={{ sessionId: String(sess.id) }}
                        className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-semibold no-underline text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-100"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === sess.id}
                        aria-label={`Delete ${sessionLabel(sess, i)}`}
                        onClick={() => void handleDeleteSession(sess.id)}
                        className={cn(
                          'inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-100 text-lg leading-none',
                          deletingId === sess.id
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
              <PrimaryButton disabled={isCreating} onClick={() => void handleCreateSession()}>
                {isCreating ? 'Creating…' : 'Create New Session'}
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
                  className="mt-1 text-sm text-blue-600 no-underline hover:text-blue-800 transition-colors duration-100"
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
              <a href="mailto:coldairnetworks@fastmail.com" className="text-blue-600 hover:text-blue-800">
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