/**
 * 統合タイムライン (ECharts) — 売上・仕入・粗利・売変の連動分析
 * @responsibility R:chart-view
 */
import { useMemo, useState, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { toComma } from './chartTheme'
import {
  normalizeMinMax,
  pearsonCorrelation,
  detectDivergence,
  movingAverage,
} from '@/application/hooks/useStatistics'
import type { StoreResult } from '@/domain/models/storeTypes'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from './ChartCard'
import { ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { categoryXAxis, valueYAxis, lineDefaults } from './builders'
import { CorrelationRow, CorrBadge } from './IntegratedTimeline.styles'

type ViewMode = 'normalized' | 'raw'

const VIEW_OPTIONS: readonly { value: ViewMode; label: string }[] = [
  { value: 'normalized', label: '正規化' },
  { value: 'raw', label: '実数' },
]

const SERIES_CONFIG = [
  { key: 'sales', label: '売上', color: palette.primary },
  { key: 'cost', label: '仕入', color: sc.negative },
  { key: 'grossProfit', label: '粗利', color: sc.positive },
  { key: 'discount', label: '売変', color: palette.warningDark },
] as const

interface Props {
  result: StoreResult
  daysInMonth: number
}

export const IntegratedTimeline = memo(function IntegratedTimeline({ result, daysInMonth }: Props) {
  const theme = useTheme() as AppTheme
  const [viewMode, setViewMode] = useState<ViewMode>('normalized')

  const { chartData, correlations, divergentRanges } = useMemo(() => {
    const salesArr: number[] = []
    const costArr: number[] = []
    const gpArr: number[] = []
    const discountArr: number[] = []
    const days: number[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const rec = result.daily.get(d)
      days.push(d)
      const sales = rec?.sales ?? 0
      const cost = rec ? rec.purchase.cost + rec.deliverySales.cost : 0
      const discount = rec?.discountAmount ?? 0
      salesArr.push(sales)
      costArr.push(cost)
      gpArr.push(sales - cost)
      discountArr.push(discount)
    }

    const normSales = normalizeMinMax(salesArr)
    const normCost = normalizeMinMax(costArr)
    const normGP = normalizeMinMax(gpArr)
    const normDiscount = normalizeMinMax(discountArr)
    const maSales = movingAverage(salesArr, 7)
    const maCost = movingAverage(costArr, 7)

    const data = days.map((d, i) => ({
      day: d,
      sales: salesArr[i],
      cost: costArr[i],
      grossProfit: gpArr[i],
      discount: discountArr[i],
      normSales: normSales.values[i],
      normCost: normCost.values[i],
      normGrossProfit: normGP.values[i],
      normDiscount: normDiscount.values[i],
      maSales: maSales[i],
      maCost: maCost[i],
    }))

    const series = [
      { name: '売上', values: salesArr },
      { name: '仕入', values: costArr },
      { name: '粗利', values: gpArr },
      { name: '売変', values: discountArr },
    ]
    const corrs: { pair: string; r: number }[] = []
    for (let i = 0; i < series.length; i++) {
      for (let j = i + 1; j < series.length; j++) {
        const { r } = pearsonCorrelation(series[i].values, series[j].values)
        corrs.push({ pair: `${series[i].name}×${series[j].name}`, r })
      }
    }

    const divPts = detectDivergence(salesArr, costArr, 30)
    const ranges: { start: number; end: number }[] = []
    let rangeStart: number | null = null
    for (const pt of divPts) {
      if (pt.isSignificant) {
        if (rangeStart == null) rangeStart = pt.index + 1
      } else if (rangeStart != null) {
        ranges.push({ start: rangeStart, end: pt.index })
        rangeStart = null
      }
    }
    if (rangeStart != null) ranges.push({ start: rangeStart, end: divPts.length })

    return { chartData: data, correlations: corrs, divergentRanges: ranges }
  }, [result, daysInMonth])

  const isNorm = viewMode === 'normalized'

  const option = useMemo<EChartsOption>(() => {
    const days = chartData.map((d) => String(d.day))
    const series: EChartsOption['series'] = SERIES_CONFIG.map((s) => ({
      name: s.label,
      type: 'line' as const,
      data: chartData.map((d) => {
        const key = isNorm ? `norm${s.key.charAt(0).toUpperCase() + s.key.slice(1)}` : s.key
        return (d as unknown as Record<string, number>)[key] ?? null
      }),
      ...lineDefaults({ color: s.color, width: 1.5 }),
    }))

    if (!isNorm) {
      series.push(
        {
          name: '売上 7日MA',
          type: 'line',
          data: chartData.map((d) => d.maSales),
          ...lineDefaults({ color: palette.primary, width: 2, dashed: true }),
        },
        {
          name: '仕入 7日MA',
          type: 'line',
          data: chartData.map((d) => d.maCost),
          ...lineDefaults({ color: sc.negative, width: 2, dashed: true }),
        },
      )
    }

    // 乖離ゾーン markArea
    if (divergentRanges.length > 0) {
      ;(series[0] as Record<string, unknown>).markArea = {
        data: divergentRanges.map((r) => [
          { xAxis: String(r.start), itemStyle: { color: `${sc.negative}0f` } },
          { xAxis: String(r.end) },
        ]),
      }
    }

    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number | null; name: string }[]
          if (!Array.isArray(items)) return ''
          const header = `<div style="font-weight:600">${items[0]?.name}日</div>`
          const rows = items
            .filter((i) => i.value != null)
            .map(
              (i) =>
                `<div>${i.seriesName}: ${isNorm ? (i.value as number).toFixed(1) : toComma(i.value as number)}</div>`,
            )
            .join('')
          return header + rows
        },
      },
      legend: { ...standardLegend(theme), type: 'scroll' },
      xAxis: Object.assign({}, categoryXAxis(days, theme), {
        axisLabel: {
          ...(categoryXAxis(days, theme).axisLabel as object),
          formatter: (v: string) => `${v}日`,
        },
      }),
      yAxis: valueYAxis(theme, {
        formatter: (v: number) => (isNorm ? String(Math.round(v)) : toComma(v)),
      }),
      series,
    }
  }, [chartData, isNorm, divergentRanges, theme])

  const corrStrength = (r: number): 'strong' | 'moderate' | 'weak' => {
    const abs = Math.abs(r)
    return abs >= 0.7 ? 'strong' : abs >= 0.4 ? 'moderate' : 'weak'
  }

  if (chartData.every((d) => d.sales === 0)) {
    return (
      <ChartCard title="統合タイムライン">
        <ChartEmpty message="データがありません" />
      </ChartCard>
    )
  }

  const toolbar = (
    <SegmentedControl
      options={VIEW_OPTIONS}
      value={viewMode}
      onChange={setViewMode}
      ariaLabel="表示モード"
    />
  )

  return (
    <ChartCard title="統合タイムライン — 売上・仕入・粗利・売変の連動分析" toolbar={toolbar}>
      <CorrelationRow>
        {correlations.map((c) => (
          <CorrBadge key={c.pair} $strength={corrStrength(c.r)}>
            {c.pair}: r={c.r.toFixed(2)}
          </CorrBadge>
        ))}
      </CorrelationRow>
      <EChart option={option} height={300} ariaLabel="統合タイムラインチャート" />
    </ChartCard>
  )
})
