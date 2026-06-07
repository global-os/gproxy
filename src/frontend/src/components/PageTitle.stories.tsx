import type { Meta, StoryObj } from '@storybook/react-vite'
import { PageTitle } from './PageTitle'

const meta: Meta = { component: PageTitle, title: 'PageTitle' }
export default meta

export const Default: StoryObj = {
  render: () => <PageTitle>My Session</PageTitle>,
}

export const Long: StoryObj = {
  render: () => <PageTitle>A Very Long Session Title That Goes On For A While</PageTitle>,
}
