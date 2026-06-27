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
}: {
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'self-start px-5 py-[0.65em] rounded-[10px] border text-[0.92em] font-semibold transition-colors duration-100',
        disabled
          ? 'bg-white/4 border-amber/32 text-white/22 cursor-default'
          : 'bg-amber/10 border-amber/32 text-[rgb(228,168,55)] hover:bg-amber/20 hover:border-amber/50 cursor-pointer',
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
    return <div className="py-8 px-4 text-center text-white/35 text-[0.95em]">Loading your sessions…</div>
  }

  if (error) {
    return <p className="m-0 text-[0.85em] text-[rgba(255,100,100,0.9)]">Error: {`${error}`}</p>
  }

  const sessions = data ?? []

  const tabCls = cn(
    'flex-1 border-none rounded-[9px] px-3 py-[0.55em] text-[0.88em] font-semibold bg-transparent',
    'text-white/42 cursor-pointer transition-colors duration-100',
    'data-[selected]:bg-amber/18 data-[selected]:text-amber-light',
  )

  return (
    <div className="w-full max-w-[36em]">
      <Tabs.Root defaultValue="global-pc">
        {/* Tab bar */}
        <div className="p-1 rounded-xl bg-black/35 border border-white/7 mb-6">
          <Tabs.List className="flex gap-1">
            <Tabs.Tab value="global-pc" className={tabCls}>My Global PC</Tabs.Tab>
            <Tabs.Tab value="settings" className={tabCls}>Settings</Tabs.Tab>
            <Tabs.Tab value="help" className={tabCls}>Help</Tabs.Tab>
            <Tabs.Indicator hidden />
          </Tabs.List>
        </div>

        {/* My Global PC panel */}
        <Tabs.Panel value="global-pc">
          <div className="flex flex-col gap-4">
            <div>
              <p className="m-0 text-[0.98em] font-bold tracking-[0.01em] text-white/88">My Sessions</p>
              <p className="m-0 mt-1 text-[0.83em] text-white/38 leading-normal">
                Open a workspace desktop or remove sessions you no longer need.
              </p>
            </div>

            {/* Session list */}
            <div className="flex flex-col gap-[0.55em]">
              {sessions.length === 0 ? (
                <div className="px-4 py-6 rounded-[10px] text-center text-white/32 bg-white/2 border border-dashed border-white/10 text-[0.88em] leading-relaxed">
                  No sessions yet. Create one to launch apps on your Global PC desktop.
                </div>
              ) : (
                sessions.map((sess, i) => (
                  <div
                    key={sess.id}
                    className="flex items-center gap-3 px-4 py-[0.85em] rounded-xl bg-white/4 border border-amber/14 transition-colors duration-100 hover:bg-white/7 hover:border-amber/28"
                  >
                    {/* Badge */}
                    <span className="shrink-0 min-w-8 text-center px-2 py-[0.3em] rounded text-[0.74em] font-bold text-amber-light bg-amber/16 border border-amber/28">
                      #{i + 1}
                    </span>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 flex flex-col gap-[0.15em]">
                      <span className="text-[0.93em] font-semibold text-white/90 overflow-hidden text-ellipsis whitespace-nowrap">
                        {sessionLabel(sess, i)}
                      </span>
                      <span className="text-[0.74em] text-white/30 tracking-[0.03em]">ID {sess.id}</span>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-[0.4em]">
                      <Link
                        to="/session/$sessionId"
                        params={{ sessionId: String(sess.id) }}
                        className="inline-flex items-center px-[0.9em] py-[0.4em] rounded text-[0.82em] font-bold no-underline text-[#0d0020] border border-[rgba(220,155,15,0.5)] shadow-[0_1px_4px_rgba(0,0,0,0.4)] hover:brightness-110 transition-[filter] duration-100"
                        style={{ background: 'linear-gradient(160deg, rgb(230,155,20) 0%, rgb(200,128,0) 100%)' }}
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === sess.id}
                        aria-label={`Delete ${sessionLabel(sess, i)}`}
                        onClick={() => void handleDeleteSession(sess.id)}
                        className={cn(
                          'inline-flex items-center justify-center w-8 h-8 rounded border transition-colors duration-100 text-[1.05em] leading-none',
                          deletingId === sess.id
                            ? 'bg-white/2 border-white/8 text-white/18 cursor-default'
                            : 'bg-white/5 border-white/8 text-[rgba(255,120,120,0.65)] cursor-pointer hover:bg-[rgba(180,0,0,0.18)] hover:border-[rgba(200,50,50,0.35)] hover:text-[rgb(255,120,120)]',
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
              <p role="alert" className="m-0 text-[0.85em] text-[rgba(255,100,100,0.9)]">{createError}</p>
            )}
            {deleteError && (
              <p role="alert" className="m-0 text-[0.85em] text-[rgba(255,100,100,0.9)]">{deleteError}</p>
            )}

            {/* Footer */}
            <div className="flex flex-col gap-[0.6em] mt-2 pt-4 border-t border-white/7">
              <PrimaryButton disabled={isCreating} onClick={() => void handleCreateSession()}>
                {isCreating ? 'Creating…' : 'Create New Session'}
              </PrimaryButton>
              {onLogOut && (
                <PrimaryButton disabled={isLoggingOut} onClick={() => void onLogOut()}>
                  {isLoggingOut ? 'Logging out…' : 'Log Out'}
                </PrimaryButton>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="mt-1 text-[0.82em] text-amber/55 no-underline hover:text-amber-light transition-colors duration-100"
                >
                  Admin panel
                </Link>
              )}
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="settings">
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[0.98em] font-bold text-white/88">Settings</p>
            <p className="m-0 text-[0.83em] text-white/38 leading-normal">
              Personal settings for your Global PC will appear here.
            </p>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="help">
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[0.98em] font-bold text-white/88">Help</p>
            <p className="m-0 text-[0.83em] text-white/38 leading-normal">
              For support, email{' '}
              <a href="mailto:coldairnetworks@fastmail.com" className="text-amber-light hover:text-amber-light/80">
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
