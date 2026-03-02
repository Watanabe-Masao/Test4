import { useEffect } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { AnalysisBar } from '@/presentation/components/common/AnalysisBar'
import { useAnalysisContextStore } from '@/application/stores/analysisContextStore'
import type { AnalysisGranularity, ComparisonType, DataLineage } from '@/domain/models'

const meta: Meta<typeof AnalysisBar> = {
  title: 'Common/AnalysisBar',
  component: AnalysisBar,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AnalysisBar>

/** ストア状態を初期化するデコレータ */
function withStoreState(overrides: {
  granularity?: AnalysisGranularity
  comparisonType?: ComparisonType | null
  dataLineage?: DataLineage
  categoryFilter?: string | null
  departmentFilter?: string | null
}) {
  return function Wrapper() {
    useEffect(() => {
      useAnalysisContextStore.setState({
        granularity: overrides.granularity ?? 'daily',
        comparisonType: overrides.comparisonType ?? null,
        dataLineage: overrides.dataLineage ?? 'actual',
        categoryFilter: overrides.categoryFilter ?? null,
        departmentFilter: overrides.departmentFilter ?? null,
      })
    }, [])
    return <AnalysisBar />
  }
}

export const Default: Story = {
  render: withStoreState({}),
}

export const WithYoYComparison: Story = {
  render: withStoreState({
    comparisonType: 'yoy',
  }),
}

export const WeeklyEstimated: Story = {
  render: withStoreState({
    granularity: 'weekly',
    dataLineage: 'estimated',
  }),
}

export const WithFilters: Story = {
  render: withStoreState({
    granularity: 'daily',
    comparisonType: 'prevMonth',
    dataLineage: 'actual',
    categoryFilter: '青果',
    departmentFilter: '生鮮食品',
  }),
}

export const MonthlyNoComparison: Story = {
  render: withStoreState({
    granularity: 'monthly',
    comparisonType: null,
    dataLineage: 'actual',
  }),
}
