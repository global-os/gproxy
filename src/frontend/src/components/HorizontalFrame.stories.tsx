import type { Meta, StoryObj } from '@storybook/react-vite'
import { HorizontalFrame } from './HorizontalFrame'

const meta: Meta = { component: HorizontalFrame, title: 'HorizontalFrame' }
export default meta

export const Default: StoryObj = {
  render: () => (
    <HorizontalFrame>
      <div style={{ padding: '1em' }}>Right side content</div>
    </HorizontalFrame>
  ),
}
