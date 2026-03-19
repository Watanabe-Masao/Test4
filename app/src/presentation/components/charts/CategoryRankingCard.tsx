/**
 * カテゴリ偏りランキングカード (ECharts)
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { useCurrencyFormatter, toPct } from './chartTheme'
import type { CostPricePair, CategoryType } from '@/domain/models'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import { SegmentedControl } from '@/presentation/components/common'
import { ChartCard } from './ChartCard'
import { EChart, type EChartsOption } from './EChart'
import { standardTooltip, toCommaYen, toAxisManYen } from './echartsOptionBuilders'
import { SummaryRow, SummaryItem } from './CategoryRankingCard.styles'
import { chartFontSize } from '@/presentation/theme/tokens'

interface Props {
  categoryTotals: ReadonlyMap<CategoryType, CostPricePair>
  mode?: 'cost' | 'price'
}

interface RankItem {
  readonly name: string
  readonly value: number
  readonly share: number
}

function buildRankData(
  categoryTotals: ReadonlyMap<CategoryType, CostPricePair>,
  mode: 'cost' | 'price',
): { items: RankItem[]; total: number; topNShare: number; topNCount: number } {
  const raw = CATEGORY_ORDER.map((cat) => {
    const pair = categoryTotals.get(cat) ?? { cost: 0, price: 0 }
    return { name: CATEGORY_LABELS[cat], value: Math.abs(mode === 'cost' ? pair.cost : pair.price) }
  })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const total = raw.reduce((sum, d) => sum + d.value, 0)
  const items = raw.map((d) => ({ ...d, share: total > 0 ? d.value / total : 0 }))
  const topNCount = Math.min(3, items.filter((d) => d.share >= 0.05).length || 1)
  const topNShare = items.slice(0, topNCount).reduce((sum, d) => sum + d.share, 0)
  return { items, total, topNShare, topNCount }
}

const MODE_OPTIONS: readonly { value: 'cost' | 'price'; label: string }[] = [
  { value: 'cost', label: '原価' },
  { value: 'price', label: '売価' },
]

export const CategoryRankingCard = memo(function CategoryRankingCard({
  categoryTotals,
  mode: initialMode = 'cost',
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const [mode, setMode] = useState<'cost' | 'price'>(initialMode)

  const { items, total, topNShare, topNCount } = useMemo(
    () => buildRankData(categoryTotals, mode),
    [categoryTotals, mode],
  )

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 80, right: 60, top: 4, bottom: 4, containLabel: false },
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number }
          return `${p.name}: ${toCommaYen(p.value)}`
        },
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => toAxisManYen(v),
          color: theme.colors.text3,
          fontSize: chartFontSize.axis,
        },
        splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: items.map((d) => d.name),
        inverse: true,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis,
          width: 70,
          overflow: 'truncate',
        },
      },
      series: [
        {
          type: 'bar',
          data: items.map((d, i) => ({
            value: d.value,
            itemStyle: { color: theme.colors.palette.primary, opacity: i < topNCount ? 1 : 0.45 },
          })),
          barWidth: 20,
        },
      ],
    }),
    [items, topNCount, theme],
  )

  if (items.length === 0) return null

  const subtitle = `上位${topNCount}分類で${mode === 'cost' ? '原価' : '売価'}の${toPct(topNShare, 0)}を占めています`
  const toolbar = (
    <SegmentedControl
      options={MODE_OPTIONS}
      value={mode}
      onChange={setMode}
      ariaLabel="表示モード"
    />
  )
  const chartHeight = Math.max(200, items.length * 32 + 40)

  return (
    <ChartCard title="カテゴリ偏り" subtitle={subtitle} toolbar={toolbar}>
      <EChart option={option} height={chartHeight} ariaLabel="カテゴリ偏りランキング" />
      <SummaryRow>
        <SummaryItem>合計: {fmt(total)}</SummaryItem>
        <SummaryItem>分類数: {items.length}</SummaryItem>
      </SummaryRow>
    </ChartCard>
  )
})
