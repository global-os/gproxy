import type { Meta, StoryObj } from '@storybook/react-vite'
import { Page } from './Page'

const meta: Meta = {
  component: Page,
  title: 'Page',
  parameters: { layout: 'fullscreen' },
}
export default meta

export const Default: StoryObj = {
  render: () => (
    <Page>
      <div style={{ color: 'white', padding: '2em' }}>Page content goes here</div>
    </Page>
  ),
}
