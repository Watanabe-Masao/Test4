/**
 * カテゴリ構成比チャート (ECharts)
 *
 * @responsibility R:unclassified
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { toComma, toPct } from '@/presentation/components/charts/chartTheme'
import type { CostPricePair, CategoryType } from '@/domain/models/record'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import { standardTooltip } from '@/presentation/components/charts/echartsOptionBuilders'
import { chartFontSize } from '@/presentation/theme/tokens'

const CATEGORY_COLORS: Record<string, string> = {
  market: '#f59e0b',
  lfc: '#3b82f6',
  saladClub: '#22c55e',
  processed: '#a855f7',
  directDelivery: '#06b6d4',
  flowers: '#ec4899',
  directProduce: '#84cc16',
  consumables: '#ea580c',
  interStore: '#f43f5e',
  interDepartment: '#8b5cf6',
  other: '#64748b',
}

const MODE_OPTIONS: readonly { value: 'cost' | 'price'; label: string }[] = [
  { value: 'cost', label: '原価' },
  { value: 'price', label: '売価' },
]

interface Props {
  categoryTotals: ReadonlyMap<CategoryType, CostPricePair>
  mode?: 'cost' | 'price'
}

export const CategoryPieChart = memo(function CategoryPieChart({
  categoryTotals,
  mode: initialMode = 'cost',
}: Props) {
  const theme = useTheme() as AppTheme
  const [mode, setMode] = useState<'cost' | 'price'>(initialMode)

  const data = useMemo(
    () =>
      CATEGORY_ORDER.filter((cat) => {
        const pair = categoryTotals.get(cat)
        return pair && (mode === 'cost' ? pair.cost : pair.price) !== 0
      }).map((cat) => {
        const pair = categoryTotals.get(cat) ?? { cost: 0, price: 0 }
        return {
          name: CATEGORY_LABELS[cat],
          value: Math.abs(mode === 'cost' ? pair.cost : pair.price),
          itemStyle: { color: CATEGORY_COLORS[cat] ?? '#64748b' },
        }
      }),
    [categoryTotals, mode],
  )

  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number }
          return `${p.name}<br/>${mode === 'cost' ? '原価' : '売価'}: ${toComma(p.value)}<br/>構成比: ${toPct(p.percent / 100, 1)}`
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '48%'],
          data,
          label: {
            formatter: (params: unknown) => {
              const p = params as { name: string; percent: number }
              return p.percent >= 3 ? `${p.name} ${toPct(p.percent / 100, 0)}` : ''
            },
            color: theme.colors.text3,
            fontSize: chartFontSize.axis,
          },
          itemStyle: { borderWidth: 2, borderColor: theme.colors.bg3 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
        },
      ],
    }),
    [data, mode, theme],
  )

  if (data.length === 0) return null

  const toolbar = (
    <SegmentedControl
      options={MODE_OPTIONS}
      value={mode}
      onChange={setMode}
      ariaLabel="表示モード"
    />
  )

  return (
    <ChartCard title={`カテゴリ別${mode === 'cost' ? '原価' : '売価'}構成`} toolbar={toolbar}>
      <EChart option={option} height={280} ariaLabel="カテゴリ構成比チャート" />
    </ChartCard>
  )
})
