import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AuthLayout, AuthCard, authButtonCls, authSecondaryButtonCls } from '../components/AuthLayout'
import { useSession } from '../lib/auth-client'

export const Route = createFileRoute('/')({
  component: Index,
})

function AuthLoading() {
  return (
    <AuthLayout>
      <div
        className="flex flex-col items-center gap-3 text-sm text-gray-500"
        role="status"
        aria-live="polite"
        aria-label="Checking sign-in status"
      >
        <div
          className="h-8 w-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin"
          aria-hidden
        />
        <span>Loading…</span>
      </div>
    </AuthLayout>
  )
}

function Index() {
  const navigate = useNavigate()
  const { data: session, isPending, error } = useSession()
  const userId = session?.user.id

  useEffect(() => {
    if (!isPending && !error && userId !== undefined) {
      navigate({ to: '/workspaces' })
    }
  }, [isPending, error, userId, navigate])

  if (isPending || userId !== undefined) {
    return <AuthLoading />
  }

  return (
    <AuthLayout>
      <AuthCard>
        <h1 className="m-0 text-xl font-semibold text-gray-800">Welcome to GlobalOS</h1>
        <p className="mt-2 mb-8 text-sm text-gray-500 leading-relaxed">
          Your workspace desktop, anywhere globally.
        </p>
        <div className="grid gap-3">
          <Link to="/login" className={authButtonCls}>
            Log in
          </Link>
          <Link to="/register" className={authSecondaryButtonCls}>
            Create account
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}