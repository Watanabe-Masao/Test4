/**
 * CategoryTimeHeatmap — カテゴリ×時間帯ヒートマップ
 *
 * 部門（行）×時間帯（列）の売上金額をヒートマップで表示。
 * gridLeft / gridRight で親チャートのプロットエリアと列位置を揃える。
 */
import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from './EChart'
import { standardTooltip } from './echartsOptionBuilders'
import { useCurrencyFormat } from './chartTheme'

export interface CategoryHourlyItem {
  readonly code: string
  readonly name: string
  readonly hour: number
  readonly amount: number
  readonly quantity: number
}

interface Props {
  readonly data: readonly CategoryHourlyItem[]
  readonly metric?: 'amount' | 'quantity'
  readonly gridLeft?: number
  readonly gridRight?: number
  readonly minCellHeight?: number
}

export const CategoryTimeHeatmap = memo(function CategoryTimeHeatmap({
  data,
  metric = 'amount',
  gridLeft = 55,
  gridRight = 45,
  minCellHeight = 28,
}: Props) {
  const theme = useTheme() as AppTheme
  const cf = useCurrencyFormat()

  const option = useMemo((): EChartsOption => {
    if (data.length === 0) return {}

    const isAmount = metric === 'amount'

    // 部門名一覧（売上降順）
    const deptTotals = new Map<string, { name: string; total: number }>()
    for (const d of data) {
      const ex = deptTotals.get(d.code) ?? { name: d.name, total: 0 }
      ex.total += isAmount ? d.amount : d.quantity
      deptTotals.set(d.code, ex)
    }
    const depts = [...deptTotals.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([, v]) => v.name)

    // 時間帯一覧
    const hours = [...new Set(data.map((d) => d.hour))].sort((a, b) => a - b)
    const hourLabels = hours.map((h) => `${h}時`)

    // ヒートマップデータ: [hourIdx, deptIdx, value]
    const deptIdx = new Map(depts.map((n, i) => [n, i]))
    const hourIdx = new Map(hours.map((h, i) => [h, i]))

    let maxVal = 0
    const heatData: [number, number, number][] = []
    for (const d of data) {
      const hi = hourIdx.get(d.hour)
      const di = deptIdx.get(d.name)
      if (hi == null || di == null) continue
      const val = isAmount ? d.amount : d.quantity
      heatData.push([hi, di, val])
      if (val > maxVal) maxVal = val
    }

    return {
      grid: {
        left: gridLeft,
        right: gridRight,
        top: 10,
        bottom: 30,
        containLabel: false,
      },
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = params as { data?: [number, number, number] }
          if (!Array.isArray(p?.data) || p.data.length < 3) return ''
          const [hi, di, val] = p.data
          const dept = depts[di] ?? ''
          const hour = hourLabels[hi] ?? ''
          const formatted = isAmount ? cf.formatWithUnit(val) : `${val.toLocaleString()}点`
          return `${dept} ${hour}<br/>${formatted}`
        },
      },
      xAxis: {
        type: 'category' as const,
        data: hourLabels,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 9,
          fontFamily: theme.typography.fontFamily.mono,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        axisTick: { show: false },
        splitArea: { show: true },
      },
      yAxis: {
        type: 'category' as const,
        data: depts,
        axisLabel: {
          color: theme.colors.text,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.primary,
          width: gridLeft - 8,
          overflow: 'truncate' as const,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        axisTick: { show: false },
      },
      visualMap: {
        min: 0,
        max: maxVal || 1,
        calculable: false,
        orient: 'horizontal' as const,
        left: 'center',
        bottom: 0,
        show: false,
        inRange: {
          color: ['#f0f4ff', '#93b5ff', '#3b82f6', '#1e40af'],
        },
      },
      series: [
        {
          type: 'heatmap' as const,
          data: heatData,
          itemStyle: {
            borderWidth: 1,
            borderColor: theme.colors.bg,
          },
          label: {
            show: depts.length <= 12 && hours.length <= 18,
            fontSize: 9,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.mono,
            formatter: (params: unknown) => {
              const p = params as { data?: [number, number, number] }
              if (!Array.isArray(p?.data) || p.data.length < 3) return ''
              const val = p.data[2]
              if (val === 0) return ''
              if (isAmount) {
                return cf.formatWithUnit(val)
              }
              return val.toLocaleString()
            },
          },
        },
      ],
    }
  }, [data, metric, gridLeft, gridRight, theme, cf])

  const deptCount = useMemo(() => new Set(data.map((d) => d.code)).size, [data])
  // grid の top(10) + bottom(30) = 40px を確保し、残りを均等にセルに割り当て
  const chartH = Math.max(160, deptCount * minCellHeight + 40)

  if (data.length === 0) return null

  return <EChart option={option} height={chartH} ariaLabel="カテゴリ×時間帯ヒートマップ" />
})
