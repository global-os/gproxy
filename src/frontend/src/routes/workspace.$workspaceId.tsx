import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Page } from '../components/Page'
import { Workspace } from '../components/Workspace'
import { useSession } from '../lib/auth-client'

export const Route = createFileRoute('/workspace/$workspaceId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId } = Route.useParams()
  const navigate = useNavigate()
  const {
    data: authSession,
    isPending,
    error,
    isRefetching,
    refetch,
  } = useSession()

  useEffect(() => {
    if (isPending || isRefetching || error) return
    if (!authSession?.user) {
      navigate({ to: '/login' })
    }
  }, [isPending, isRefetching, error, authSession?.user, navigate])

  useEffect(() => {
    if (!error) return
    const id = setInterval(() => {
      void refetch()
    }, 3000)
    return () => clearInterval(id)
  }, [error, refetch])

  if (isPending || isRefetching) {
    return (
      <Page variant="workspace">
        <div className="h-full flex items-center justify-center bg-[#aca8c3] text-gray-800 text-sm font-sans">
          Loading…
        </div>
      </Page>
    )
  }

  if (error) {
    return (
      <Page variant="workspace">
        <div className="h-full flex items-center justify-center bg-[#aca8c3] text-gray-800 text-sm font-sans">
          Reconnecting…
        </div>
      </Page>
    )
  }

  if (!authSession?.user) {
    return null
  }

  return (
    <Page variant="workspace">
      <Workspace workspaceId={workspaceId}>{{}}</Workspace>
    </Page>
  )
}
