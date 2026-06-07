import type { Meta, StoryObj } from '@storybook/react-vite'
import { Workspace } from './Workspace'

const meta: Meta = {
  component: Workspace,
  title: 'Workspace',
  parameters: { layout: 'fullscreen' },
}
export default meta

export const Empty: StoryObj = {
  render: () => <Workspace>{{ onStartup: () => {} }}</Workspace>,
}

export const WithWindows: StoryObj = {
  render: () => (
    <Workspace>
      {{
        onStartup: (actions) => {
          actions.openWindow({ title: 'Window 1', width: 400, height: 300, x: -200, y: -100 })
          actions.openWindow({ title: 'Window 2', width: 350, height: 250, x: 150, y: 80 })
        },
      }}
    </Workspace>
  ),
}
