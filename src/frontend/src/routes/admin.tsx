import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

type ProxyConfigResponse = {
  proxyUrl: string | null
  updatedAt: string | null
}

async function fetchProxyConfig(): Promise<ProxyConfigResponse> {
  const r = await fetch('/api/admin/proxy-config', { credentials: 'include' })
  if (r.status === 403) throw new Error('Forbidden')
  if (!r.ok) throw new Error(`Failed to load proxy config (${r.status})`)
  return r.json()
}

async function saveProxyConfig(proxyUrl: string): Promise<ProxyConfigResponse> {
  const r = await fetch('/api/admin/proxy-config', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proxyUrl: proxyUrl || null }),
  })
  if (!r.ok) throw new Error(`Failed to save proxy config (${r.status})`)
  return r.json()
}

function ProxyConfigSection() {
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery<ProxyConfigResponse>({
    queryKey: ['admin', 'proxy-config'],
    queryFn: fetchProxyConfig,
    retry: false,
  })
  const [draft, setDraft] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: saveProxyConfig,
    onSuccess: (result) => {
      queryClient.setQueryData(['admin', 'proxy-config'], result)
      setDraft(null)
    },
  })

  const value = draft ?? data?.proxyUrl ?? ''

  return (
    <div className="mb-8 rounded-xl border border-gray-200 p-5">
      <h2 className="m-0 mb-1 text-sm font-semibold text-gray-900">Residential proxy URL</h2>
      <p className="m-0 mb-3 text-xs text-gray-500">
        Used by the sidecar (mainframe-2) for outbound webview traffic. The sidecar polls this
        periodically and applies changes on its own — no redeploy needed.
        {data?.updatedAt && (
          <> Last updated {new Date(data.updatedAt).toLocaleString()}.</>
        )}
      </p>
      {isPending ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="http://user:pass@host:port"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
          />
          <button
            type="button"
            disabled={mutation.isPending || draft === null}
            onClick={() => draft !== null && mutation.mutate(draft)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
      {mutation.isError && (
        <p className="mt-2 text-xs text-red-600">
          {mutation.error instanceof Error ? mutation.error.message : 'Failed to save'}
        </p>
      )}
      {mutation.isSuccess && draft === null && (
        <p className="mt-2 text-xs text-green-700">Saved.</p>
      )}
    </div>
  )
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
          to="/workspaces"
          className="inline-block mb-5 text-sm text-gray-500 no-underline hover:text-gray-700 transition-colors duration-100"
        >
          ← Back to Sessions
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
          <PageTitle>Admin</PageTitle>
          <a
            href="/storybook/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-violet-600 no-underline hover:text-violet-800 transition-colors duration-100"
          >
            Storybook ↗
          </a>
        </div>

        <ProxyConfigSection />

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
