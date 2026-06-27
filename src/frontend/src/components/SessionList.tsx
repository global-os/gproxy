import { createComponent } from 'react-fela'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { useSession } from '../lib/auth-client'

const accent = 'rgb(200, 128, 0)'
const accentLight = 'rgb(240, 178, 60)'

const Shell = createComponent(() => ({
  width: '100%',
  maxWidth: '36em',
}))

const TabsChrome = createComponent(() => ({
  '& [role="tablist"]': {
    display: 'flex',
    gap: '4px',
    marginBottom: '1.5em',
    padding: '4px',
    borderRadius: '12px',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  '& [role="tab"]': {
    flex: '1 1 0',
    border: 'none',
    borderRadius: '9px',
    padding: '0.55em 0.75em',
    fontSize: '0.88em',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.42)',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 120ms ease, color 120ms ease',
  },
  '& [role="tab"][data-selected], & [role="tab"][aria-selected="true"]': {
    background: 'rgba(200,128,0,0.18)',
    color: accentLight,
    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
  },
}))

const Panel = createComponent(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '1em',
}))

const SectionTitle = createComponent(() => ({
  margin: 0,
  fontSize: '0.98em',
  fontWeight: 700,
  letterSpacing: '0.01em',
  color: 'rgba(255,255,255,0.88)',
}))

const SectionHint = createComponent(() => ({
  margin: 0,
  fontSize: '0.83em',
  color: 'rgba(255,255,255,0.38)',
  lineHeight: 1.5,
}))

const SessionListBox = createComponent(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.55em',
}))

const SessionCard = createComponent(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75em',
  padding: '0.85em 1em',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(200,128,0,0.14)',
  transition: 'background 120ms ease, border-color 120ms ease',
  ':hover': {
    background: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(200,128,0,0.28)',
  },
}))

const SessionBadge = createComponent(() => ({
  flex: '0 0 auto',
  minWidth: '2em',
  textAlign: 'center',
  padding: '0.3em 0.5em',
  borderRadius: '8px',
  fontSize: '0.74em',
  fontWeight: 700,
  color: accentLight,
  background: 'rgba(200,128,0,0.16)',
  border: '1px solid rgba(200,128,0,0.28)',
}))

const SessionMeta = createComponent(() => ({
  flex: '1 1 auto',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15em',
}))

const SessionName = createComponent(() => ({
  fontSize: '0.93em',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.9)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const SessionId = createComponent(() => ({
  fontSize: '0.74em',
  color: 'rgba(255,255,255,0.3)',
  letterSpacing: '0.03em',
}))

const CardActions = createComponent(() => ({
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4em',
}))

const OpenLinkWrap = createComponent(() => ({
  '& a': {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.4em 0.9em',
    borderRadius: '8px',
    fontSize: '0.82em',
    fontWeight: 700,
    textDecoration: 'none',
    color: '#0d0020',
    background: `linear-gradient(160deg, rgb(230,155,20) 0%, ${accent} 100%)`,
    border: '1px solid rgba(220,155,15,0.5)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
    transition: 'filter 100ms ease',
  },
  '& a:hover': {
    filter: 'brightness(1.12)',
  },
}))

const DeleteButton = createComponent(
  ({ disabled }: { disabled?: boolean }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2em',
    height: '2em',
    borderRadius: '7px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
    color: disabled ? 'rgba(255,255,255,0.18)' : 'rgba(255,120,120,0.65)',
    fontSize: '1.05em',
    lineHeight: 1,
    cursor: disabled ? 'default' : 'pointer',
    transition: 'background 100ms ease, border-color 100ms ease, color 100ms ease',
    ':hover': disabled
      ? {}
      : {
          background: 'rgba(180,0,0,0.18)',
          borderColor: 'rgba(200,50,50,0.35)',
          color: 'rgb(255,120,120)',
        },
  }),
  'button',
  ['type', 'onClick', 'disabled', 'aria-label'],
)

const PrimaryButton = createComponent(
  ({ disabled }: { disabled?: boolean }) => ({
    alignSelf: 'flex-start',
    padding: '0.65em 1.25em',
    borderRadius: '10px',
    border: '1px solid rgba(200,128,0,0.32)',
    background: disabled
      ? 'rgba(255,255,255,0.04)'
      : 'rgba(200,128,0,0.1)',
    color: disabled ? 'rgba(255,255,255,0.22)' : 'rgb(228,168,55)',
    fontSize: '0.92em',
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    transition: 'background 100ms ease, border-color 100ms ease',
    ':hover': disabled
      ? {}
      : {
          background: 'rgba(200,128,0,0.2)',
          borderColor: 'rgba(200,128,0,0.5)',
        },
  }),
  'button',
  ['type', 'onClick', 'disabled'],
)

const FooterActions = createComponent(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6em',
  marginTop: '0.5em',
  paddingTop: '1em',
  borderTop: '1px solid rgba(255,255,255,0.07)',
}))

const AdminLinkWrap = createComponent(
  () => ({
    marginTop: '0.15em',
    fontSize: '0.82em',
    '& a': {
      color: 'rgba(200,128,0,0.55)',
      textDecoration: 'none',
      transition: 'color 100ms ease',
      ':hover': { color: accentLight },
    },
  }),
)

const EmptyState = createComponent(() => ({
  padding: '1.5em 1em',
  borderRadius: '10px',
  textAlign: 'center',
  color: 'rgba(255,255,255,0.32)',
  background: 'rgba(255,255,255,0.02)',
  border: '1px dashed rgba(255,255,255,0.1)',
  fontSize: '0.88em',
  lineHeight: 1.6,
}))

const StatusMessage = createComponent(({ tone }: { tone: 'error' | 'info' }) => ({
  margin: 0,
  fontSize: '0.85em',
  color: tone === 'error' ? 'rgba(255,100,100,0.9)' : 'rgba(255,255,255,0.45)',
}))

const LoadingState = createComponent(() => ({
  padding: '2em 1em',
  textAlign: 'center',
  color: 'rgba(255,255,255,0.35)',
  fontSize: '0.95em',
}))

type Session = {
  id: number
  name?: string | null
  user_id: string
}

async function fetchSessions(): Promise<Session[]> {
  const r = await fetch('/api/sessions', { credentials: 'include' })
  if (!r.ok) {
    throw new Error(`Failed to load sessions (${r.status})`)
  }
  return r.json()
}

async function createSession(): Promise<Session[]> {
  const r = await fetch('/api/sessions', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({}),
  })
  if (!r.ok) {
    let message = `Failed to create session (${r.status})`
    try {
      const body = (await r.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // ignore non-JSON error bodies
    }
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
    } catch {
      // ignore
    }
    throw new Error(message)
  }
}

function sessionLabel(sess: Session, index: number): string {
  if (sess.name && sess.name !== 'bar') return sess.name
  return `Session ${index + 1}`
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
    return <LoadingState>Loading your sessions…</LoadingState>
  }

  if (error) {
    return <StatusMessage tone="error">Error: {`${error}`}</StatusMessage>
  }

  const sessions = data ?? []

  return (
    <Shell>
      <Tabs.Root defaultValue="global-pc">
        <TabsChrome>
          <Tabs.List>
            <Tabs.Tab value="global-pc">My Global PC</Tabs.Tab>
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
            <Tabs.Tab value="help">Help</Tabs.Tab>
            <Tabs.Indicator hidden />
          </Tabs.List>

        <Tabs.Panel value="global-pc">
          <Panel>
          <div>
            <SectionTitle>My Sessions</SectionTitle>
            <SectionHint>
              Open a workspace desktop or remove sessions you no longer need.
            </SectionHint>
          </div>

          <SessionListBox>
            {sessions.length === 0 ? (
              <EmptyState>
                No sessions yet. Create one to launch apps on your Global PC desktop.
              </EmptyState>
            ) : (
              sessions.map((sess, i) => (
                <SessionCard key={sess.id}>
                  <SessionBadge>#{i + 1}</SessionBadge>
                  <SessionMeta>
                    <SessionName>{sessionLabel(sess, i)}</SessionName>
                    <SessionId>ID {sess.id}</SessionId>
                  </SessionMeta>
                  <CardActions>
                    <OpenLinkWrap>
                      <Link
                        to="/session/$sessionId"
                        params={{ sessionId: String(sess.id) }}
                      >
                        Open
                      </Link>
                    </OpenLinkWrap>
                    <DeleteButton
                      type="button"
                      disabled={deletingId === sess.id}
                      aria-label={`Delete ${sessionLabel(sess, i)}`}
                      onClick={() => void handleDeleteSession(sess.id)}
                    >
                      ×
                    </DeleteButton>
                  </CardActions>
                </SessionCard>
              ))
            )}
          </SessionListBox>

          {createError && (
            <StatusMessage tone="error" role="alert">
              {createError}
            </StatusMessage>
          )}
          {deleteError && (
            <StatusMessage tone="error" role="alert">
              {deleteError}
            </StatusMessage>
          )}

          <FooterActions>
            <PrimaryButton
              type="button"
              disabled={isCreating}
              onClick={() => void handleCreateSession()}
            >
              {isCreating ? 'Creating…' : 'Create New Session'}
            </PrimaryButton>
            {onLogOut && (
              <PrimaryButton
                type="button"
                disabled={isLoggingOut}
                onClick={() => void onLogOut()}
              >
                {isLoggingOut ? 'Logging out…' : 'Log Out'}
              </PrimaryButton>
            )}
            {isAdmin && (
              <AdminLinkWrap>
                <Link to="/admin">Admin panel</Link>
              </AdminLinkWrap>
            )}
          </FooterActions>
          </Panel>
        </Tabs.Panel>

        <Tabs.Panel value="settings">
          <Panel>
            <SectionTitle>Settings</SectionTitle>
            <SectionHint>Personal settings for your Global PC will appear here.</SectionHint>
          </Panel>
        </Tabs.Panel>

        <Tabs.Panel value="help">
          <Panel>
            <SectionTitle>Help</SectionTitle>
            <SectionHint>
              For support, email{' '}
              <a href="mailto:coldairnetworks@fastmail.com">coldairnetworks@fastmail.com</a>
              {' '}and we will assist as soon as possible.
            </SectionHint>
          </Panel>
        </Tabs.Panel>
        </TabsChrome>
      </Tabs.Root>
    </Shell>
  )
}