import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/presentation/components/common'

const meta: Meta<typeof Button> = {
  title: 'Common/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    $variant: {
      control: 'select',
      options: ['primary', 'success', 'outline', 'ghost'],
      description: 'ボタンのスタイルバリアント',
    },
    $fullWidth: {
      control: 'boolean',
      description: '幅100%で表示',
    },
    disabled: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { $variant: 'primary', children: 'プライマリ' },
}

export const Success: Story = {
  args: { $variant: 'success', children: '保存する' },
}

export const Outline: Story = {
  args: { $variant: 'outline', children: 'キャンセル' },
}

export const Ghost: Story = {
  args: { $variant: 'ghost', children: 'リセット' },
}

export const Disabled: Story = {
  args: { $variant: 'primary', children: '無効', disabled: true },
}

export const FullWidth: Story = {
  args: { $variant: 'primary', children: 'フルワイドボタン', $fullWidth: true },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Button $variant="primary">Primary</Button>
      <Button $variant="success">Success</Button>
      <Button $variant="outline">Outline</Button>
      <Button $variant="ghost">Ghost</Button>
      <Button $variant="primary" disabled>Disabled</Button>
    </div>
  ),
}
