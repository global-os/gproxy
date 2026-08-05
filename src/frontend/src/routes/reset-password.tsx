import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { resetPassword } from '../lib/auth-client'
import {
  AuthLayout,
  AuthCard,
  authInputCls,
  authLabelCls,
  authButtonCls,
  authLinkCls,
} from '../components/AuthLayout'

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
      <AuthLayout>
        <AuthCard>
          <h1 className="m-0 text-xl font-semibold text-gray-100 mb-2">Invalid link</h1>
          <p className="mt-2 mb-6 text-sm text-gray-400 leading-relaxed">
            This reset link is missing or invalid. Please request a new one.
          </p>
          <Link to="/forgot-password" className={authLinkCls}>
            Request a new reset link
          </Link>
        </AuthCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthCard>
        <h1 className="m-0 text-xl font-semibold text-gray-100 mb-6">Choose a new password</h1>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {error && (
            <p className="m-0 text-sm text-red-400">{error}</p>
          )}
          <div className="grid gap-1.5">
            <label htmlFor="password" className={authLabelCls}>
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputCls}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="confirm" className={authLabelCls}>
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={authInputCls}
            />
          </div>
          <button type="submit" className={authButtonCls}>
            Reset password
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  )
}