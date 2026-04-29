import type { Meta, StoryObj } from '@storybook/react'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from '@/presentation/components/charts/ChartState'

const meta: Meta<typeof ChartCard> = {
  title: 'Charts/ChartCard',
  component: ChartCard,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    height: { control: 'number' },
    variant: { control: 'radio', options: ['card', 'section'] },
    collapsible: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof ChartCard>

const READY_PLACEHOLDER = (
  <div
    style={{
      width: '100%',
      height: 240,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
      borderRadius: 8,
      color: '#1e3a8a',
      fontSize: '0.9rem',
    }}
  >
    chart body (placeholder)
  </div>
)

export const Ready: Story = {
  args: {
    title: '売上推移',
    subtitle: '直近30日',
  },
  render: (args) => <ChartCard {...args}>{READY_PLACEHOLDER}</ChartCard>,
}

export const Loading: Story = {
  args: {
    title: '売上推移',
    subtitle: '直近30日',
  },
  render: (args) => (
    <ChartCard {...args}>
      <ChartLoading height={240} />
    </ChartCard>
  ),
}

export const Error: Story = {
  args: {
    title: '売上推移',
    subtitle: '直近30日',
  },
  render: (args) => (
    <ChartCard {...args}>
      <ChartError message="データの取得に失敗しました" height={240} />
    </ChartCard>
  ),
}

export const Empty: Story = {
  args: {
    title: '売上推移',
    subtitle: '直近30日',
  },
  render: (args) => (
    <ChartCard {...args}>
      <ChartEmpty height={240} />
    </ChartCard>
  ),
}

export const SectionVariant: Story = {
  args: {
    title: 'カテゴリ別構成',
    subtitle: 'サブセクション表示',
    variant: 'section',
  },
  render: (args) => <ChartCard {...args}>{READY_PLACEHOLDER}</ChartCard>,
}

export const Collapsible: Story = {
  args: {
    title: '折りたたみ可能なチャート',
    subtitle: 'タイトル帯クリックで開閉',
    collapsible: true,
  },
  render: (args) => <ChartCard {...args}>{READY_PLACEHOLDER}</ChartCard>,
}
