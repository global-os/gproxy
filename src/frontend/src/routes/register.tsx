import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authErrorMessage, runAuthAction, signUp } from '../lib/auth-client'
import { Page } from '../components/Page'
import { VerticalFrame } from '../components/VerticalFrame'
import { PageTitle } from '../components/PageTitle'

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
    <Page>
      <VerticalFrame>
        <div>
          <PageTitle>Create New Account</PageTitle>
          <form onSubmit={handleSubmit} className="grid gap-4 mt-4">
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
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
            <div className="grid gap-1">
              <label htmlFor="name" className="text-sm font-medium text-gray-600">
                Name (optional)
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div className="grid gap-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-600">
                Password
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
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-600">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors cursor-pointer border-0"
            >
              Register
            </button>
          </form>
        </div>
      </VerticalFrame>
    </Page>
  )
}
