import type { Meta, StoryObj } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionList } from './SessionList'

const meta: Meta = { component: SessionList, title: 'SessionList' }
export default meta

const SESSIONS = [
  { id: 'abc123', name: 'My Work Session' },
  { id: 'def456' },
  { id: 'ghi789', name: 'Experiment' },
]

function seededClient(data: unknown) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['sessions'], data)
  return client
}

export const WithSessions: StoryObj = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={seededClient(SESSIONS)}>
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
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
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
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <Story />
        </QueryClientProvider>
      )
    },
  ],
}
