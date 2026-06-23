import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { requestPasswordReset } from '../lib/auth-client'
import { Page } from '../components/Page'
import { VerticalFrame } from '../components/VerticalFrame'

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
    <Page>
      <VerticalFrame width="380px">
        <div className="w-full px-2 pb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-1 pb-2 border-b border-gray-300">
            Reset password
          </h2>

          {submitted ? (
            <div className="mt-4 grid gap-3">
              <p className="text-sm text-gray-600">
                If an account exists for <strong>{email}</strong>, you'll receive a reset link shortly.
              </p>
              <Link
                to="/login"
                className="text-sm text-amber-700 hover:text-amber-800 font-medium"
              >
                ← Back to login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mt-3 mb-4">
                Enter your email and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="grid gap-4">
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <div className="grid gap-1">
                  <label htmlFor="email" className="text-sm font-medium text-gray-600">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors cursor-pointer border-0"
                >
                  Send reset link
                </button>
                <Link
                  to="/login"
                  className="text-sm text-center text-amber-700 hover:text-amber-800 font-medium"
                >
                  ← Back to login
                </Link>
              </form>
            </>
          )}
        </div>
      </VerticalFrame>
    </Page>
  )
}
