import { createComponent } from 'react-fela'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { Tabs } from '@base-ui/react/tabs'

const accent = 'rgb(200, 128, 0)'

const Shell = createComponent(() => ({
  width: '100%',
  maxWidth: '36em',
}))

const TabsChrome = createComponent(() => ({
  '& [role="tablist"]': {
    display: 'flex',
    gap: '6px',
    marginBottom: '1.25em',
    padding: '4px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(0,0,0,0.12)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
  },
  '& [role="tab"]': {
    flex: '1 1 0',
    border: 'none',
    borderRadius: '8px',
    padding: '0.55em 0.75em',
    fontSize: '0.92em',
    fontWeight: 600,
    color: '#444',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 120ms ease, color 120ms ease',
  },
  '& [role="tab"][data-selected], & [role="tab"][aria-selected="true"]': {
    background: '#fff',
    color: '#1a1a1a',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  },
}))

const Panel = createComponent(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '1em',
}))

const SectionTitle = createComponent(() => ({
  margin: 0,
  fontSize: '1.05em',
  fontWeight: 700,
  letterSpacing: '0.02em',
  color: '#2a2a2a',
}))

const SectionHint = createComponent(() => ({
  margin: 0,
  fontSize: '0.85em',
  color: '#666',
  lineHeight: 1.45,
}))

const SessionListBox = createComponent(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65em',
}))

const SessionCard = createComponent(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75em',
  padding: '0.75em 0.85em',
  borderRadius: '10px',
  background: 'linear-gradient(180deg, #fff 0%, #f7f7f7 100%)',
  border: '1px solid rgba(0,0,0,0.1)',
  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
}))

const SessionBadge = createComponent(() => ({
  flex: '0 0 auto',
  minWidth: '2.1em',
  textAlign: 'center',
  padding: '0.35em 0.5em',
  borderRadius: '999px',
  fontSize: '0.78em',
  fontWeight: 700,
  color: '#fff',
  background: accent,
  boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.15)',
}))

const SessionMeta = createComponent(() => ({
  flex: '1 1 auto',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.15em',
}))

const SessionName = createComponent(() => ({
  fontSize: '0.95em',
  fontWeight: 600,
  color: '#222',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const SessionId = createComponent(() => ({
  fontSize: '0.78em',
  color: '#777',
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
    padding: '0.4em 0.85em',
    borderRadius: '8px',
    fontSize: '0.82em',
    fontWeight: 600,
    textDecoration: 'none',
    color: '#fff',
    background: `linear-gradient(180deg, ${accent} 0%, #b86f00 100%)`,
    border: '1px solid rgba(0,0,0,0.15)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
  },
  '& a:hover': {
    filter: 'brightness(1.05)',
  },
}))

const DeleteButton = createComponent(
  ({ disabled }: { disabled?: boolean }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2em',
    height: '2em',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.14)',
    background: disabled ? '#eee' : '#fff',
    color: disabled ? '#aaa' : '#8b1e1e',
    fontSize: '1.05em',
    lineHeight: 1,
    cursor: disabled ? 'default' : 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    ':hover': disabled
      ? {}
      : {
          background: '#fff5f5',
          borderColor: '#d9a3a3',
        },
  }),
  'button',
  ['type', 'onClick', 'disabled', 'aria-label'],
)

const PrimaryButton = createComponent(
  ({ disabled }: { disabled?: boolean }) => ({
    alignSelf: 'flex-start',
    padding: '0.65em 1.2em',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.14)',
    background: disabled
      ? '#e8e8e8'
      : `linear-gradient(180deg, #fff 0%, #f2f2f2 100%)`,
    color: disabled ? '#888' : '#222',
    fontSize: '0.92em',
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    boxShadow: disabled ? 'none' : '0 2px 5px rgba(0,0,0,0.08)',
    ':hover': disabled
      ? {}
      : {
          background: '#fff',
        },
  }),
  'button',
  ['type', 'onClick', 'disabled'],
)

const FooterActions = createComponent(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65em',
  marginTop: '0.5em',
  paddingTop: '1em',
  borderTop: '1px solid rgba(0,0,0,0.1)',
}))

const EmptyState = createComponent(() => ({
  padding: '1.25em 1em',
  borderRadius: '10px',
  textAlign: 'center',
  color: '#666',
  background: 'rgba(255,255,255,0.65)',
  border: '1px dashed rgba(0,0,0,0.15)',
  fontSize: '0.9em',
  lineHeight: 1.5,
}))

const StatusMessage = createComponent(({ tone }: { tone: 'error' | 'info' }) => ({
  margin: 0,
  fontSize: '0.85em',
  color: tone === 'error' ? '#b91c1c' : '#555',
}))

const LoadingState = createComponent(() => ({
  padding: '2em 1em',
  textAlign: 'center',
  color: '#666',
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