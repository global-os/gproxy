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
          className="inline-block mb-5 text-sm text-gray-500 no-underline hover:text-gray-700 transition-colors duration-100"
        >
          ← Back to Sessions
        </Link>
        <PageTitle>Admin</PageTitle>

        {isPending && (
          <p className="py-8 text-center text-gray-400 text-sm">Loading…</p>
        )}

        {error && (
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        )}

        {data && (
          <>
            <p className="m-0 mb-5 text-sm text-gray-500">
              {data.count} user{data.count !== 1 ? 's' : ''} signed up
            </p>

            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Verified</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                        No users yet.
                      </td>
                    </tr>
                  ) : (
                    data.users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors duration-75">
                        <td className="px-4 py-3 text-gray-900">
                          {u.name ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              u.emailVerified
                                ? 'inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200'
                                : 'inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200'
                            }
                          >
                            {u.emailVerified ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
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
