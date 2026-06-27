console.log('🚀 Main.tsx executing');

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter, type ErrorComponentProps } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { Page } from './components/Page'

import './index.css'

function RouteError({ error, reset }: ErrorComponentProps) {
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred'

  return (
    <Page>
      <div style={{ padding: '1.5em', color: '#eee', maxWidth: '36em' }}>
        <h1 style={{ margin: '0 0 0.5em', fontSize: '1.1em' }}>Something went wrong</h1>
        <p style={{ margin: '0 0 1em', color: '#fca5a5', lineHeight: 1.5 }}>{message}</p>
        {reset && (
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.5em 1em',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        )}
      </div>
    </Page>
  )
}

console.log('main.tsx')

const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => {
    return <div>Could not find page</div>
  },
  defaultErrorComponent: RouteError,
})

console.log('Registered routes:', router.routeTree)
console.log('Current location:', window.location.pathname)

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.body
const root = ReactDOM.createRoot(rootElement)
root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
