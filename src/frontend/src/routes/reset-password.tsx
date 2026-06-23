import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { resetPassword } from '../lib/auth-client'
import { Page } from '../components/Page'
import { VerticalFrame } from '../components/VerticalFrame'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    await resetPassword(
      { newPassword: password, token },
      {
        onSuccess: () => navigate({ to: '/login' }),
        onError: (ctx) => setError(ctx.error.message),
      }
    )
  }

  if (!token) {
    return (
      <Page>
        <VerticalFrame width="380px">
          <div className="w-full px-2 pb-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-300">
              Invalid link
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              This reset link is missing or invalid. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="text-sm text-amber-700 hover:text-amber-800 font-medium"
            >
              Request a new reset link
            </Link>
          </div>
        </VerticalFrame>
      </Page>
    )
  }

  return (
    <Page>
      <VerticalFrame width="380px">
        <div className="w-full px-2 pb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-300">
            Choose a new password
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="grid gap-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-600">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div className="grid gap-1">
              <label htmlFor="confirm" className="text-sm font-medium text-gray-600">
                Confirm new password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors cursor-pointer border-0"
            >
              Reset password
            </button>
          </form>
        </div>
      </VerticalFrame>
    </Page>
  )
}
