import type { Meta, StoryObj } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkspaceList } from './WorkspaceList'

const meta: Meta = { component: WorkspaceList, title: 'WorkspaceList' }
export default meta

const WORKSPACES = [
  { id: 1, name: 'Design desk', user_id: 'user-1' },
  { id: 2, user_id: 'user-1' },
  { id: 3, name: 'Experiment', user_id: 'user-1' },
]

function seededClient(data: unknown) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(['workspaces'], data)
  return client
}

export const WithWorkspaces: StoryObj = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={seededClient(WORKSPACES)}>
        <Story />
      </QueryClientProvider>
    ),
  ],
}

export const Empty: StoryObj = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={seededClient([])}>
        <Story />
      </QueryClientProvider>
    ),
  ],
}

export const Loading: StoryObj = {
  decorators: [
    (Story) => {
      globalThis.fetch = () => new Promise(() => {})
      return (
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <Story />
        </QueryClientProvider>
      )
    },
  ],
}

export const WithError: StoryObj = {
  decorators: [
    (Story) => {
      globalThis.fetch = () => Promise.reject(new Error('Network error'))
      return (
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <Story />
        </QueryClientProvider>
      )
    },
  ],
}
