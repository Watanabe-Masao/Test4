import type { Meta, StoryObj } from '@storybook/react'
import {
  Skeleton,
  KpiCardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  PageSkeleton,
  KpiGrid,
} from '@/presentation/components/common'

const meta: Meta<typeof Skeleton> = {
  title: 'Common/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const TextLine: Story = {
  args: {
    width: '60%',
    height: '14px',
    variant: 'text',
  },
}

export const Rectangular: Story = {
  args: {
    width: '100%',
    height: '200px',
    variant: 'rectangular',
  },
}

export const Circular: Story = {
  args: {
    width: '48px',
    height: '48px',
    variant: 'circular',
  },
}

export const KpiCardLoading: StoryObj = {
  render: () => (
    <KpiGrid>
      <KpiCardSkeleton />
      <KpiCardSkeleton />
      <KpiCardSkeleton />
      <KpiCardSkeleton />
    </KpiGrid>
  ),
}

export const ChartLoading: StoryObj = {
  render: () => <ChartSkeleton height="300px" />,
}

export const TableLoading: StoryObj = {
  render: () => <TableSkeleton columns={5} rows={8} />,
}

export const FullPageLoading: StoryObj = {
  render: () => <PageSkeleton kpiCount={4} />,
}
