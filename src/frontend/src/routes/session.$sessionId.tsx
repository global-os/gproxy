import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Page } from '../components/Page'
import { Workspace, WorkspaceActions } from '../components/Workspace'
import { useSession } from '../lib/auth-client'

export const Route = createFileRoute('/session/$sessionId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { sessionId } = Route.useParams()
  const navigate = useNavigate()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session?.user) {
      navigate({ to: '/login' })
    }
  }, [isPending, session?.user, navigate])

  const runProgram = () => {
    // create iframe
    // load (HTML) code into subdomain
    // have record of process
  };

  return (
    <Page>
      <Workspace>
        {{
          onStartup: (actions: WorkspaceActions) => {
            actions.openWindow({
              title: 'Foo',

              width: 300,
              height: 300,

              x: 0,
              y: 0,
            })
            actions.openWindow({
              title: 'Bar',

              width: 300,
              height: 300,

              x: 20,
              y: 20,
            })
            console.log('added 2nd window')
          },
        }}
      </Workspace>
    </Page>
  )
}
