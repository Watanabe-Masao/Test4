import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardTitle } from '@/presentation/components/common'

const meta: Meta<typeof Card> = {
  title: 'Common/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    $accent: {
      control: 'color',
      description: '上部のアクセントカラー',
    },
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardTitle>売上サマリー</CardTitle>
      <p style={{ fontSize: '0.78rem' }}>カードコンテンツがここに入ります。</p>
    </Card>
  ),
}

export const WithAccent: Story = {
  render: () => (
    <Card $accent="#6366f1">
      <CardTitle>重要指標</CardTitle>
      <p style={{ fontSize: '0.78rem' }}>アクセント付きカードのコンテンツ。</p>
    </Card>
  ),
}

export const MultipleCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
      <Card $accent="#6366f1">
        <CardTitle>売上</CardTitle>
        <p style={{ fontSize: '0.78rem' }}>¥1,234,567</p>
      </Card>
      <Card $accent="#34d399">
        <CardTitle>粗利</CardTitle>
        <p style={{ fontSize: '0.78rem' }}>¥456,789</p>
      </Card>
      <Card $accent="#f87171">
        <CardTitle>経費</CardTitle>
        <p style={{ fontSize: '0.78rem' }}>¥123,456</p>
      </Card>
    </div>
  ),
}
