import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { authErrorMessage, runAuthAction, signUp } from '../lib/auth-client'
import {
  AuthLayout,
  AuthCard,
  authInputCls,
  authLabelCls,
  authButtonCls,
  authLinkCls,
} from '../components/AuthLayout'

export const Route = createFileRoute('/register')({
  component: RouteComponent,
})

function RouteComponent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    await runAuthAction(
      () =>
        signUp.email(
          {
            email,
            password,
            name: name.trim(),
            roles: ['STUDENT'],
          },
          {
            onSuccess: () => {
              setError(null)
              navigate({ to: '/' })
            },
            onError: (ctx) => setError(authErrorMessage(ctx)),
          }
        ),
      setError
    )
  }

  return (
    <AuthLayout>
      <AuthCard>
        <h1 className="m-0 text-xl font-semibold text-gray-100 mb-6">
          Create your account
        </h1>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {error && (
            <p className="m-0 text-sm text-red-400" role="alert">
              {error}
            </p>
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
          <div className="grid gap-1.5">
            <label htmlFor="name" className={authLabelCls}>
              Name <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={authInputCls}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="password" className={authLabelCls}>
              Password
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
            <label htmlFor="confirmPassword" className={authLabelCls}>
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={authInputCls}
            />
          </div>
          <button type="submit" className={authButtonCls}>
            Register
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className={authLinkCls}>
            Log in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
