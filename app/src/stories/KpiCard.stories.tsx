import type { Meta, StoryObj } from '@storybook/react'
import { KpiCard, KpiGrid } from '@/presentation/components/common'

const meta: Meta<typeof KpiCard> = {
  title: 'Common/KpiCard',
  component: KpiCard,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    subText: { control: 'text' },
    accent: { control: 'color' },
  },
}

export default meta
type Story = StoryObj<typeof KpiCard>

export const Default: Story = {
  args: {
    label: '月間売上',
    value: '¥12,345,678',
    subText: '前月比 +5.2%',
  },
}

export const WithAccent: Story = {
  args: {
    label: '粗利率',
    value: '32.5%',
    subText: '目標: 30.0%',
    accent: '#34d399',
  },
}

export const WithoutSubText: Story = {
  args: {
    label: '客数',
    value: '8,234人',
  },
}

export const DashboardGrid: Story = {
  render: () => (
    <KpiGrid>
      <KpiCard label="月間売上" value="¥12,345,678" subText="前月比 +5.2%" accent="#6366f1" />
      <KpiCard label="粗利率" value="32.5%" subText="目標: 30.0%" accent="#34d399" />
      <KpiCard label="客数" value="8,234人" subText="前年比 -2.1%" accent="#fbbf24" />
      <KpiCard label="客単価" value="¥1,499" subText="前月比 +7.5%" accent="#38bdf8" />
    </KpiGrid>
  ),
}
