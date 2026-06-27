import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Page } from '../components/Page'
import { Workspace } from '../components/Workspace'
import { useSession } from '../lib/auth-client'

export const Route = createFileRoute('/session/$sessionId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { sessionId } = Route.useParams()
  const navigate = useNavigate()
  const { data: session, isPending, error, isRefetching, refetch } = useSession()

  useEffect(() => {
    if (isPending || isRefetching || error) return
    if (!session?.user) {
      navigate({ to: '/login' })
    }
  }, [isPending, isRefetching, error, session?.user, navigate])

  useEffect(() => {
    if (!error) return
    const id = setInterval(() => {
      void refetch()
    }, 3000)
    return () => clearInterval(id)
  }, [error, refetch])

  if (isPending || isRefetching) {
    return <Page>Loading…</Page>
  }

  if (error) {
    return <Page>Reconnecting…</Page>
  }

  if (!session?.user) {
    return null
  }

  return (
    <Page>
      <Workspace sessionId={sessionId}>{{}}</Workspace>
    </Page>
  )
}