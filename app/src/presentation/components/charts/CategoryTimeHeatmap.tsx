/**
 * CategoryTimeHeatmap — カテゴリ×時間帯ヒートマップ
 *
 * 部門（行）×時間帯（列）の売上金額をヒートマップで表示。
 * ECharts の heatmap シリーズを使用。
 */
import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip } from './echartsOptionBuilders'
import { useCurrencyFormatter } from './chartTheme'

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
}

export const CategoryTimeHeatmap = memo(function CategoryTimeHeatmap({
  data,
  metric = 'amount',
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()

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
        ...standardGrid(),
        left: 80,
        right: 40,
        top: 10,
        bottom: 30,
      },
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = params as { data: [number, number, number] }
          const [hi, di, val] = p.data
          const dept = depts[di] ?? ''
          const hour = hourLabels[hi] ?? ''
          const formatted = isAmount ? fmt(val) : `${val.toLocaleString()}点`
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
          width: 70,
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
            show: depts.length <= 8 && hours.length <= 14,
            fontSize: 8,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.mono,
            formatter: (params: unknown) => {
              const p = params as { data: [number, number, number] }
              const val = p.data[2]
              if (val === 0) return ''
              if (isAmount) {
                return val >= 10000 ? `${Math.round(val / 10000)}万` : fmt(val)
              }
              return val.toLocaleString()
            },
          },
        },
      ],
    }
  }, [data, metric, theme, fmt])

  const deptCount = useMemo(() => new Set(data.map((d) => d.code)).size, [data])
  const chartH = Math.max(120, deptCount * 28 + 50)

  if (data.length === 0) return null

  return <EChart option={option} height={chartH} ariaLabel="カテゴリ×時間帯ヒートマップ" />
})
