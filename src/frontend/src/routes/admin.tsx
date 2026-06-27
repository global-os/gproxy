import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Page } from '../components/Page'
import { VerticalFrame } from '../components/VerticalFrame'
import { PageTitle } from '../components/PageTitle'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

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
        <Link
          to="/sessions"
          className="inline-block mb-5 text-[0.88em] text-white/45 no-underline hover:text-white/70 transition-colors duration-100"
        >
          ← Back to Sessions
        </Link>
        <PageTitle>Admin</PageTitle>

        {isPending && (
          <p className="py-8 text-center text-white/35 text-[0.9em]">Loading…</p>
        )}

        {error && (
          <p className="text-[0.9em] text-[rgba(255,100,100,0.9)]">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        )}

        {data && (
          <>
            <p className="m-0 mb-5 text-[0.88em] text-white/45">
              {data.count} user{data.count !== 1 ? 's' : ''} signed up
            </p>

            <div className="overflow-hidden rounded-xl border border-amber/14">
              <table className="w-full text-[0.88em] border-collapse">
                <thead>
                  <tr className="border-b border-amber/14">
                    <th className="text-left px-4 py-3 font-semibold text-white/55 whitespace-nowrap">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/55 whitespace-nowrap">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/55 whitespace-nowrap">Verified</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/55 whitespace-nowrap">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-white/30 italic">
                        No users yet.
                      </td>
                    </tr>
                  ) : (
                    data.users.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors duration-75">
                        <td className="px-4 py-3 text-white/88">
                          {u.name ?? <span className="text-white/25">—</span>}
                        </td>
                        <td className="px-4 py-3 text-white/70">{u.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              u.emailVerified
                                ? 'inline-block px-2 py-[0.2em] rounded-full text-[0.82em] font-semibold bg-green-900/40 text-green-300 border border-green-700/40'
                                : 'inline-block px-2 py-[0.2em] rounded-full text-[0.82em] font-semibold bg-amber/10 text-amber-light border border-amber/25'
                            }
                          >
                            {u.emailVerified ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/40 whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </VerticalFrame>
    </Page>
  )
}
