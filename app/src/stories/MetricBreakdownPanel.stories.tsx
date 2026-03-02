import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { MetricBreakdownPanel } from '@/presentation/components/common'
import type { Explanation, MetricId } from '@/domain/models'

const meta: Meta<typeof MetricBreakdownPanel> = {
  title: 'Common/MetricBreakdownPanel',
  component: MetricBreakdownPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

// ─── Mock data ──────────────────────────────────────────

const salesExplanation: Explanation = {
  metric: 'salesTotal',
  title: '総売上高',
  formula: '粗売上 − 売変額',
  value: 12345678,
  unit: 'yen',
  scope: { storeId: 'store-001', year: 2026, month: 2 },
  inputs: [
    { name: '粗売上', metric: 'grossSales', value: 13000000, unit: 'yen' },
    { name: '売変額', metric: 'discountTotal', value: 654322, unit: 'yen' },
  ],
  breakdown: [
    { day: 1, value: 420000 },
    { day: 2, value: 380000 },
    {
      day: 3,
      value: 510000,
      details: [
        { label: '花', value: 120000, unit: 'yen' },
        { label: '産直', value: 80000, unit: 'yen' },
        { label: '一般', value: 310000, unit: 'yen' },
      ],
    },
    { day: 4, value: 390000 },
    { day: 5, value: 445000 },
  ],
  evidenceRefs: [
    { kind: 'daily', dataType: 'classifiedSales', storeId: 'store-001', day: 1 },
    { kind: 'daily', dataType: 'classifiedSales', storeId: 'store-001', day: 2 },
    { kind: 'daily', dataType: 'classifiedSales', storeId: 'store-001', day: 3 },
    { kind: 'daily', dataType: 'purchase', storeId: 'store-001', day: 1 },
    { kind: 'daily', dataType: 'purchase', storeId: 'store-001', day: 2 },
  ],
}

const grossSalesExplanation: Explanation = {
  metric: 'grossSales',
  title: '粗売上',
  formula: 'Σ 日別売上',
  value: 13000000,
  unit: 'yen',
  scope: { storeId: 'store-001', year: 2026, month: 2 },
  inputs: [{ name: '日別売上合計', value: 13000000, unit: 'yen' }],
  breakdown: [],
  evidenceRefs: [],
}

const discountExplanation: Explanation = {
  metric: 'discountTotal',
  title: '売変額',
  formula: 'Σ 日別売変',
  value: 654322,
  unit: 'yen',
  scope: { storeId: 'store-001', year: 2026, month: 2 },
  inputs: [{ name: '日別売変合計', value: 654322, unit: 'yen' }],
  breakdown: [],
  evidenceRefs: [],
}

const profitRateExplanation: Explanation = {
  metric: 'invMethodGrossProfitRate',
  title: '粗利率（在庫法）',
  formula: '粗利益 ÷ 総売上高',
  value: 0.333,
  unit: 'rate',
  scope: { storeId: 'aggregate', year: 2026, month: 2 },
  inputs: [
    { name: '粗利益', metric: 'invMethodGrossProfit', value: 4111111, unit: 'yen' },
    { name: '総売上高', metric: 'salesTotal', value: 12345678, unit: 'yen' },
  ],
  breakdown: [],
  evidenceRefs: [],
}

const allExplanations: ReadonlyMap<MetricId, Explanation> = new Map([
  ['salesTotal', salesExplanation],
  ['grossSales', grossSalesExplanation],
  ['discountTotal', discountExplanation],
  ['invMethodGrossProfitRate', profitRateExplanation],
])

// ─── Stories ────────────────────────────────────────────

function PanelDemo({ explanation }: { explanation: Explanation }) {
  const [open, setOpen] = useState(true)
  if (!open)
    return (
      <button onClick={() => setOpen(true)} style={{ padding: '1rem', cursor: 'pointer' }}>
        パネルを再表示
      </button>
    )
  return (
    <MetricBreakdownPanel
      explanation={explanation}
      allExplanations={allExplanations}
      onClose={() => setOpen(false)}
    />
  )
}

export const FormulaTab: StoryObj = {
  render: () => <PanelDemo explanation={salesExplanation} />,
}

export const WithDrilldown: StoryObj = {
  render: () => <PanelDemo explanation={salesExplanation} />,
}

export const RateMetric: StoryObj = {
  render: () => <PanelDemo explanation={profitRateExplanation} />,
}

export const AggregateScope: StoryObj = {
  render: () => <PanelDemo explanation={profitRateExplanation} />,
}
