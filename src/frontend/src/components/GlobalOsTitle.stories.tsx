import type { Meta, StoryObj } from '@storybook/react-vite'
import { GlobalOsTitle } from './GlobalOsTitle'

const meta: Meta = { component: GlobalOsTitle, title: 'GlobalOsTitle' }
export default meta

export const Default: StoryObj = {
  render: () => <GlobalOsTitle>GlobalOS</GlobalOsTitle>,
}
