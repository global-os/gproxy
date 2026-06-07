import React from 'react'
import type { Preview } from '@storybook/react-vite'
import { RendererProvider } from 'react-fela'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import createRenderer from '../src/lib/renderer'
import { AnimationContext } from '../src/contexts/animation'

const { renderer, animations } = createRenderer()
const queryClient = new QueryClient()

const preview: Preview = {
  decorators: [
    (Story) => (
      <RendererProvider renderer={renderer}>
        <QueryClientProvider client={queryClient}>
          <AnimationContext value={animations}>
            <Story />
          </AnimationContext>
        </QueryClientProvider>
      </RendererProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
}

export default preview
