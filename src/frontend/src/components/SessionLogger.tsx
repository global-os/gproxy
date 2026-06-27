import { useQuery } from '@tanstack/react-query'
import { createComponent } from 'react-fela'

type SessionLogEntry = {
  id: number
  level: 'info' | 'warn' | 'error'
  source: string
  message: string
  detail: string | null
  createdAt: string
}

const Panel = createComponent(
  () => ({
    position: 'absolute',
    right: '16px',
    bottom: '16px',
    width: 'min(420px, calc(100% - 32px))',
    maxHeight: '220px',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '8px',
    background: 'rgba(12, 12, 16, 0.88)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e8e8ec',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '11px',
    pointerEvents: 'auto',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  }),
  'div'
)

const Header = createComponent(
  () => ({
    padding: '8px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#a8a8b3',
  }),
  'div'
)

const List = createComponent(
  () => ({
    overflowY: 'auto',
    padding: '6px 0',
    flex: '1 1 auto',
  }),
  'div'
)

const Row = createComponent(
  ({ level }: { level: string }) => ({
    padding: '4px 10px',
    borderLeft: `3px solid ${
      level === 'error' ? '#f87171' : level === 'warn' ? '#fbbf24' : '#6ee7b7'
    }`,
    marginBottom: '2px',
  }),
  'div',
  ['level']
)

const Meta = createComponent(
  () => ({
    color: '#7c7c8a',
    marginRight: '6px',
  }),
  'span'
)

const Detail = createComponent(
  () => ({
    marginTop: '4px',
    whiteSpace: 'pre-wrap',
    color: '#fca5a5',
    fontSize: '10px',
    lineHeight: 1.4,
  }),
  'pre'
)

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString()
  } catch {
    return iso
  }
}

export function SessionLogger({ sessionId }: { sessionId: string }) {
  const { data: logs = [] } = useQuery<SessionLogEntry[]>({
    queryKey: ['session-logs', sessionId],
    queryFn: async () => {
      const r = await fetch(`/api/sessions/${sessionId}/logs`, {
        credentials: 'include',
      })
      if (!r.ok) return []
      return r.json()
    },
    refetchInterval: 2000,
  })

  return (
    <Panel>
      <Header>Session log</Header>
      <List>
        {logs.length === 0 ? (
          <Row level="info">
            <Meta>—</Meta>
            Waiting for activity…
          </Row>
        ) : null}
        {[...logs].reverse().map((entry) => (
          <Row key={entry.id} level={entry.level}>
            <Meta>
              {formatTime(entry.createdAt)} {entry.source}
            </Meta>
            {entry.message}
            {entry.detail ? <Detail>{entry.detail}</Detail> : null}
          </Row>
        ))}
      </List>
    </Panel>
  )
}