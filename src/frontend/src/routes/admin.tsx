import { createFileRoute, Link } from '@tanstack/react-router'
import { createComponent } from 'react-fela'
import { useQuery } from '@tanstack/react-query'
import { Page } from '../components/Page'
import { VerticalFrame } from '../components/VerticalFrame'
import { PageTitle } from '../components/PageTitle'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

const BackLink = createComponent(
  () => ({
    display: 'inline-block',
    marginBottom: '1.25em',
    fontSize: '0.88em',
    color: '#555',
    textDecoration: 'none',
    ':hover': { color: '#111' },
  }),
  Link,
  ['to'],
)

const Subtitle = createComponent(() => ({
  margin: '0 0 1.5em',
  fontSize: '0.88em',
  color: '#666',
}))

const Table = createComponent(
  () => ({
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.88em',
  }),
  'table',
)

const Th = createComponent(
  () => ({
    textAlign: 'left' as const,
    padding: '0.6em 0.85em',
    borderBottom: '2px solid rgba(0,0,0,0.12)',
    fontWeight: 700,
    color: '#333',
    whiteSpace: 'nowrap' as const,
  }),
  'th',
)

const Td = createComponent(
  ({ muted }: { muted?: boolean }) => ({
    padding: '0.65em 0.85em',
    borderBottom: '1px solid rgba(0,0,0,0.07)',
    color: muted ? '#777' : '#222',
    whiteSpace: 'nowrap' as const,
  }),
  'td',
  ['colSpan'],
)

const Chip = createComponent(
  ({ ok }: { ok: boolean }) => ({
    display: 'inline-block',
    padding: '0.2em 0.55em',
    borderRadius: '999px',
    fontSize: '0.82em',
    fontWeight: 600,
    color: ok ? '#166534' : '#92400e',
    background: ok ? '#dcfce7' : '#fef3c7',
  }),
  'span',
)

const EmptyRow = createComponent(
  () => ({
    padding: '2em 0.85em',
    color: '#888',
    fontStyle: 'italic',
  }),
  'td',
  ['colSpan'],
)

const StatusMsg = createComponent(
  ({ tone }: { tone: 'error' | 'loading' }) => ({
    padding: '2em 0',
    color: tone === 'error' ? '#b91c1c' : '#555',
    fontSize: '0.9em',
  }),
)

type AdminUser = {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  createdAt: string
}

type AdminUsersResponse = {
  count: number
  users: AdminUser[]
}

async function fetchAdminUsers(): Promise<AdminUsersResponse> {
  const r = await fetch('/api/admin/users', { credentials: 'include' })
  if (r.status === 403) throw new Error('Forbidden')
  if (!r.ok) throw new Error(`Failed to load users (${r.status})`)
  return r.json()
}

function AdminPage() {
  const { data, isPending, error } = useQuery<AdminUsersResponse>({
    queryKey: ['admin', 'users'],
    queryFn: fetchAdminUsers,
    retry: false,
  })

  return (
    <Page>
      <VerticalFrame width="65em">
        <BackLink to="/sessions">← Back to Sessions</BackLink>
        <PageTitle>Admin</PageTitle>

        {isPending && <StatusMsg tone="loading">Loading…</StatusMsg>}

        {error && (
          <StatusMsg tone="error">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </StatusMsg>
        )}

        {data && (
          <>
            <Subtitle>
              {data.count} user{data.count !== 1 ? 's' : ''} signed up
            </Subtitle>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Verified</Th>
                  <Th>Joined</Th>
                </tr>
              </thead>
              <tbody>
                {data.users.length === 0 ? (
                  <tr>
                    <EmptyRow colSpan={4}>No users yet.</EmptyRow>
                  </tr>
                ) : (
                  data.users.map((u) => (
                    <tr key={u.id}>
                      <Td>{u.name ?? <span style={{ color: '#aaa' }}>—</span>}</Td>
                      <Td>{u.email}</Td>
                      <Td>
                        <Chip ok={u.emailVerified}>
                          {u.emailVerified ? 'Yes' : 'No'}
                        </Chip>
                      </Td>
                      <Td muted>
                        {new Date(u.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </>
        )}
      </VerticalFrame>
    </Page>
  )
}
