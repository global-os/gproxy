import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { requestPasswordReset } from '../lib/auth-client'
import {
  AuthLayout,
  AuthCard,
  authInputCls,
  authLabelCls,
  authButtonCls,
  authLinkCls,
} from '../components/AuthLayout'

export const Route = createFileRoute('/forgot-password')({
  component: RouteComponent,
})

function RouteComponent() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    await requestPasswordReset(
      { email, redirectTo: '/reset-password' },
      {
        onSuccess: () => setSubmitted(true),
        onError: (ctx: { error: { message: string } }) => setError(ctx.error.message),
      }
    )
  }

  return (
    <AuthLayout>
      <AuthCard>
        <h1 className="m-0 text-xl font-semibold text-gray-100 mb-2">Reset password</h1>

        {submitted ? (
          <div className="mt-4 grid gap-4">
            <p className="m-0 text-sm text-gray-400 leading-relaxed">
              If an account exists for <strong>{email}</strong>, you&apos;ll receive a reset link shortly.
            </p>
            <Link to="/login" className={authLinkCls}>
              ← Back to login
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 mb-6 text-sm text-gray-400 leading-relaxed">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="grid gap-4">
              {error && (
                <p className="m-0 text-sm text-red-400">{error}</p>
              )}
              <div className="grid gap-1.5">
                <label htmlFor="email" className={authLabelCls}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={authInputCls}
                />
              </div>
              <button type="submit" className={authButtonCls}>
                Send reset link
              </button>
              <Link to="/login" className={`${authLinkCls} text-center`}>
                ← Back to login
              </Link>
            </form>
          </>
        )}
      </AuthCard>
    </AuthLayout>
  )
}