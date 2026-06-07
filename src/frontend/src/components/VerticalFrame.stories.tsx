import type { Meta, StoryObj } from '@storybook/react-vite'
import { VerticalFrame } from './VerticalFrame'

const meta: Meta = { component: VerticalFrame, title: 'VerticalFrame' }
export default meta

export const Default: StoryObj = {
  render: () => <VerticalFrame><p>Main content area</p></VerticalFrame>,
}

export const Wide: StoryObj = {
  render: () => <VerticalFrame width="800px"><p>Wide layout content</p></VerticalFrame>,
}
