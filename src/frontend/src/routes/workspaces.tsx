import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { VerticalFrame } from '../components/VerticalFrame'
import { Page } from '../components/Page'
import { PageTitle } from '../components/PageTitle'
import { signOut } from '../lib/auth-client'
import { WorkspaceList } from '../components/WorkspaceList'

export const Route = createFileRoute('/workspaces')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogOut = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 500)
      })
      navigate({ to: '/' })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <Page>
      <VerticalFrame width="38em">
        <PageTitle>Workspaces</PageTitle>
        <WorkspaceList onLogOut={handleLogOut} isLoggingOut={isLoggingOut} />
      </VerticalFrame>
    </Page>
  )
}
