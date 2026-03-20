import type { Meta, StoryObj } from '@storybook/react'
import { EmptyState } from '@/presentation/components/common/layout'

const meta: Meta<typeof EmptyState> = {
  title: 'Common/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof EmptyState>

export const Default: Story = {
  render: () => <EmptyState>データがありません</EmptyState>,
}

export const ImportPrompt: Story = {
  render: () => <EmptyState>データをインポートしてください</EmptyState>,
}

export const NotCalculated: Story = {
  render: () => <EmptyState>在庫設定が未入力のため計算できません</EmptyState>,
}
