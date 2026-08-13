import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { RendererProvider } from 'react-fela'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import createRenderer from '../lib/renderer'
import { AnimationContext } from '../contexts/animation'
import { VersionStamp } from '../components/VersionStamp'

const createRenderResult = createRenderer()
const queryClient = new QueryClient()

export const Route = createRootRoute({
  component: RouteComponent,
  notFoundComponent: () => <div>404 - Page Not Found</div>,
})

function RouteComponent() {
  return (
    <RendererProvider renderer={createRenderResult.renderer}>
      <QueryClientProvider client={queryClient}>
        <AnimationContext value={createRenderResult.animations}>
          <Outlet />
          <VersionStamp />
          <TanStackRouterDevtools />
        </AnimationContext>
      </QueryClientProvider>
    </RendererProvider>
  )
}
