import type { Meta, StoryObj } from '@storybook/react'
import { ImportProgressBar } from '@/presentation/components/common/ImportProgressBar'

const meta: Meta<typeof ImportProgressBar> = {
  title: 'Common/ImportProgressBar',
  component: ImportProgressBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ImportProgressBar>

export const InProgress: Story = {
  args: {
    progress: { current: 3, total: 10, filename: 'sales_2026_03.xlsx' },
  },
}

export const NearComplete: Story = {
  args: {
    progress: { current: 9, total: 10, filename: 'purchase_data.csv' },
  },
}

export const JustStarted: Story = {
  args: {
    progress: { current: 1, total: 50, filename: 'budget_2026.xlsx' },
  },
}
