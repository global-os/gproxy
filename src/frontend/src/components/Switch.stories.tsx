import type { Meta, StoryObj } from '@storybook/react-vite'
import { Switch } from './Switch'

const meta: Meta<typeof Switch> = {
  component: Switch,
  title: 'Switch',
  parameters: { layout: 'centered' },
}
export default meta

type Story = StoryObj<typeof Switch>

export const Off: Story = {}

export const On: Story = {
  args: { defaultChecked: true },
}
