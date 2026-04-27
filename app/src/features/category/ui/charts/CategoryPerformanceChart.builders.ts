/**
 * CategoryPerformanceChart — 純粋なデータ変換関数 + ECharts option builder
 *
 * 1. LevelAggregation の current/prev レコードから CategoryRow[] を構築する
 *    （PI計算 → 偏差値算出 → TopN ソート）
 * 2. CategoryRow[] + view から ECharts option を組み立てる（ADR-D-003 PR2 で
 *    .tsx の useMemo body から抽出。component に option 構築の 200+ 行を
 *    抱えさせず、builders 側で完結させる）
 *
 * @guard H4 component に acquisition logic 禁止 — 導出は builders で一度だけ
 *
 * @responsibility R:unclassified
 */
import { calculateAmountPI, calculateQuantityPI } from '@/domain/calculations/piValue'
import { calculateStdDev } from '@/application/hooks/useStatistics'
import { toComma, toDevScore } from '@/presentation/components/charts/chartTheme'
import {
  standardGrid,
  standardTooltip,
  standardLegend,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { chartFontSize } from '@/presentation/theme/tokens'
import type { LevelAggregationRow } from '@/application/queries/cts/LevelAggregationHandler'
import type { AppTheme } from '@/presentation/theme/theme'

export type ViewType = 'piRank' | 'deviation' | 'piQtyRank'

/**
 * 系列名 → 表示ラベル辞書（tooltip / legend formatter で使用）
 */
const SERIES_LABELS: Record<string, string> = {
  piAmount: '金額PI値',
  prevPiAmount: '前年金額PI値',
  piQty: '点数PI値',
  prevPiQty: '前年点数PI値',
  deviation: '金額PI偏差値',
  qtyDeviation: '点数PI偏差値',
}

export interface CategoryRow {
  readonly code: string
  readonly name: string
  readonly amount: number
  readonly quantity: number
  readonly piAmount: number
  readonly piQty: number
  readonly prevPiAmount: number | null
  readonly prevPiQty: number | null
  readonly deviation: number | null
  readonly qtyDeviation: number | null
}

const DEFAULT_TOP_N = 20

/**
 * LevelAggregation の current/prev レコードから CategoryRow[] を構築する。
 *
 * 1. PI値算出（domain/calculations/piValue 経由）
 * 2. 偏差値算出（calculateStdDev → toDevScore）
 * 3. piAmount 降順ソート + TopN 切り出し
 */
export function buildCategoryRows(
  curRecords: readonly LevelAggregationRow[],
  prevRecords: readonly LevelAggregationRow[] | null,
  totalCustomers: number,
  prevTotalCustomers: number,
  topN: number = DEFAULT_TOP_N,
): readonly CategoryRow[] {
  if (curRecords.length === 0 || totalCustomers <= 0) return []

  const prevMap = new Map<string, { amount: number; quantity: number }>()
  if (prevRecords && prevTotalCustomers > 0) {
    for (const row of prevRecords) {
      prevMap.set(row.code, { amount: row.amount, quantity: row.quantity })
    }
  }

  const piAmounts: number[] = []
  const piQtys: number[] = []

  const rows: {
    code: string
    name: string
    amount: number
    quantity: number
    piAmount: number
    piQty: number
    prevPiAmount: number | null
    prevPiQty: number | null
    deviation: number | null
    qtyDeviation: number | null
  }[] = []

  for (const entry of curRecords) {
    const piAmount = calculateAmountPI(entry.amount, totalCustomers)
    const piQty = calculateQuantityPI(entry.quantity, totalCustomers)

    let prevPiAmount: number | null = null
    let prevPiQty: number | null = null
    if (prevTotalCustomers > 0) {
      const prev = prevMap.get(entry.code)
      if (prev) {
        prevPiAmount = calculateAmountPI(prev.amount, prevTotalCustomers)
        prevPiQty = calculateQuantityPI(prev.quantity, prevTotalCustomers)
      }
    }

    piAmounts.push(piAmount)
    piQtys.push(piQty)

    rows.push({
      code: entry.code,
      name: entry.name || entry.code,
      amount: entry.amount,
      quantity: entry.quantity,
      piAmount,
      piQty,
      prevPiAmount,
      prevPiQty,
      deviation: null,
      qtyDeviation: null,
    })
  }

  // Compute deviation scores
  const amtStat = calculateStdDev(piAmounts)
  const qtyStat = calculateStdDev(piQtys)

  for (const row of rows) {
    if (amtStat.stdDev > 0) {
      row.deviation = toDevScore((row.piAmount - amtStat.mean) / amtStat.stdDev)
    }
    if (qtyStat.stdDev > 0) {
      row.qtyDeviation = toDevScore((row.piQty - qtyStat.mean) / qtyStat.stdDev)
    }
  }

  // Sort by piAmount descending, limit to topN
  rows.sort((a, b) => b.piAmount - a.piAmount)
  return rows.slice(0, topN)
}

/**
 * CategoryRow[] + view + theme から ECharts option を構築する。
 *
 * ADR-D-003 PR2 で `.tsx` の `useMemo` body から抽出。component に
 * option 構築の 200+ 行を抱えさせず、builders 側で完結させる
 * （H4 + responsibilitySeparationGuard P20 対応）。
 *
 * 戻り値は EChartsOption 互換だが、`as const` の入れ子で複雑なため
 * ここでは unknown を返し、呼び出し側で `as EChartsOption` キャストする
 * （元 component と同じ運用）。
 */
export function buildPerformanceChartOption(
  categoryRows: readonly CategoryRow[],
  names: readonly string[],
  view: ViewType,
  theme: AppTheme,
): unknown {
  const baseGrid = { ...standardGrid(), left: 80, bottom: 30, containLabel: false }
  const baseYAxis = {
    type: 'category' as const,
    data: names,
    inverse: true,
    axisLabel: {
      color: theme.colors.text3,
      fontSize: chartFontSize.axis - 2,
      fontFamily: theme.typography.fontFamily.primary,
      width: 70,
      overflow: 'truncate' as const,
    },
    axisLine: { show: false },
    axisTick: { show: false },
  }

  if (view === 'deviation') {
    const barData = (categoryRows as unknown as Record<string, unknown>[]).map((entry) => {
      const d = (entry.deviation as number | null) ?? 50
      const color =
        d >= 60
          ? theme.colors.palette.success
          : d >= 50
            ? theme.colors.palette.primary
            : d >= 40
              ? theme.colors.palette.warning
              : theme.colors.palette.danger
      return { value: entry.deviation, itemStyle: { color, opacity: 0.7 } }
    })

    const lineData = (categoryRows as unknown as Record<string, unknown>[]).map(
      (entry) => entry.qtyDeviation as number | null,
    )

    return {
      grid: baseGrid,
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number | null; marker: string }[]
          if (!Array.isArray(items) || items.length === 0) return ''
          const categoryName = (items[0] as unknown as Record<string, unknown>).name as string
          const lines = items.map((item) => {
            const label = SERIES_LABELS[item.seriesName] ?? item.seriesName
            const val = item.value != null ? (item.value as number).toFixed(1) : '-'
            return `${item.marker} ${label}: ${val}`
          })
          return `<strong>${categoryName}</strong><br/>${lines.join('<br/>')}`
        },
      },
      legend: {
        ...standardLegend(theme),
        data: [
          { name: 'deviation', icon: 'roundRect' },
          { name: 'qtyDeviation', icon: 'circle' },
        ],
        formatter: (name: string) => SERIES_LABELS[name] ?? name,
      },
      xAxis: {
        type: 'value' as const,
        min: 20,
        max: 80,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis - 1,
          fontFamily: theme.typography.fontFamily.mono,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
        },
      },
      yAxis: baseYAxis,
      series: [
        {
          name: 'deviation',
          type: 'bar' as const,
          data: barData,
          barWidth: 10,
          itemStyle: { borderRadius: [0, 3, 3, 0] },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'solid' as const },
            data: [
              {
                xAxis: 50,
                lineStyle: {
                  color: theme.colors.border,
                  width: 1.5,
                  opacity: 0.7,
                  type: 'solid' as const,
                },
              },
              {
                xAxis: 60,
                lineStyle: {
                  color: theme.colors.palette.success,
                  width: 1,
                  opacity: 0.3,
                  type: 'dashed' as const,
                },
              },
              {
                xAxis: 40,
                lineStyle: {
                  color: theme.colors.palette.danger,
                  width: 1,
                  opacity: 0.3,
                  type: 'dashed' as const,
                },
              },
            ],
          },
        },
        {
          name: 'qtyDeviation',
          type: 'line' as const,
          data: lineData,
          smooth: true,
          lineStyle: { color: theme.colors.palette.purple, width: 2 },
          itemStyle: { color: theme.colors.palette.purple },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    }
  }

  // piRank / piQtyRank views
  const isPiAmount = view === 'piRank'
  const mainKey = isPiAmount ? 'piAmount' : 'piQty'
  const prevKey = isPiAmount ? 'prevPiAmount' : 'prevPiQty'
  const mainColor = isPiAmount ? theme.colors.palette.primary : theme.colors.palette.info

  const mainData = (categoryRows as unknown as Record<string, unknown>[]).map((entry) => {
    const val = entry[mainKey] as number
    const prev = entry[prevKey] as number | null
    const color = prev != null && val >= prev ? mainColor : theme.colors.palette.orange
    return { value: val, itemStyle: { color } }
  })

  const prevData = (categoryRows as unknown as Record<string, unknown>[]).map(
    (entry) => entry[prevKey] as number | null,
  )

  return {
    grid: baseGrid,
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number | null; marker: string }[]
        if (!Array.isArray(items) || items.length === 0) return ''
        const categoryName = (items[0] as unknown as Record<string, unknown>).name as string
        const lines = items.map((item) => {
          const label = SERIES_LABELS[item.seriesName] ?? item.seriesName
          const val = item.value != null ? toComma(Math.round(item.value as number)) : '-'
          return `${item.marker} ${label}: ${val}`
        })
        return `<strong>${categoryName}</strong><br/>${lines.join('<br/>')}`
      },
    },
    legend: {
      ...standardLegend(theme),
      data: [
        { name: mainKey, icon: 'roundRect' },
        { name: prevKey, icon: 'roundRect' },
      ],
      formatter: (name: string) => SERIES_LABELS[name] ?? name,
    },
    xAxis: {
      type: 'value' as const,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis - 1,
        fontFamily: theme.typography.fontFamily.mono,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
      },
    },
    yAxis: baseYAxis,
    series: [
      {
        name: mainKey,
        type: 'bar' as const,
        data: mainData,
        barWidth: 10,
        itemStyle: { borderRadius: [0, 3, 3, 0] },
      },
      {
        name: prevKey,
        type: 'bar' as const,
        data: prevData,
        barWidth: 6,
        itemStyle: {
          color: theme.colors.palette.slate,
          opacity: 0.35,
          borderRadius: [0, 2, 2, 0],
        },
      },
    ],
  }
}
