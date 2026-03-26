/**
 * CategoryTimeHeatmap — カテゴリ×時間帯ヒートマップ
 *
 * 部門（行）×時間帯（列）の売上金額をヒートマップで表示。
 * gridLeft / gridRight で親チャートのプロットエリアと列位置を揃える。
 */
import { memo, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from './EChart'
import { standardTooltip } from './echartsOptionBuilders'
import { useCurrencyFormat } from './chartTheme'
import { TabGroup, Tab } from './TimeSlotSalesChart.styles'

export interface CategoryHourlyItem {
  readonly code: string
  readonly name: string
  readonly hour: number
  readonly amount: number
  readonly quantity: number
}

interface Props {
  readonly data: readonly CategoryHourlyItem[]
  readonly prevData?: readonly CategoryHourlyItem[]
  readonly metric?: 'amount' | 'quantity'
  readonly gridLeft?: number
  readonly gridRight?: number
}

export const CategoryTimeHeatmap = memo(function CategoryTimeHeatmap({
  data,
  prevData,
  metric = 'amount',
  gridLeft = 55,
  gridRight = 45,
}: Props) {
  const theme = useTheme() as AppTheme
  const cf = useCurrencyFormat()
  const [showYoY, setShowYoY] = useState(false)

  const hasPrev = (prevData?.length ?? 0) > 0

  // 前年データを code+hour → value のマップに変換
  const prevMap = useMemo(() => {
    if (!prevData) return new Map<string, number>()
    const isAmount = metric === 'amount'
    const m = new Map<string, number>()
    for (const d of prevData) {
      const key = `${d.code}_${d.hour}`
      m.set(key, (m.get(key) ?? 0) + (isAmount ? d.amount : d.quantity))
    }
    return m
  }, [prevData, metric])

  const option = useMemo((): EChartsOption => {
    if (data.length === 0) return {}

    const isAmount = metric === 'amount'
    const isYoY = showYoY && hasPrev

    // 部門名一覧（売上降順）
    const deptTotals = new Map<string, { name: string; code: string; total: number }>()
    for (const d of data) {
      const ex = deptTotals.get(d.code) ?? { name: d.name, code: d.code, total: 0 }
      ex.total += isAmount ? d.amount : d.quantity
      deptTotals.set(d.code, ex)
    }
    const deptsInfo = [...deptTotals.entries()].sort((a, b) => b[1].total - a[1].total)
    const depts = deptsInfo.map(([, v]) => v.name)
    const deptCodes = deptsInfo.map(([code]) => code)

    const hours = [...new Set(data.map((d) => d.hour))].sort((a, b) => a - b)
    const hourLabels = hours.map((h) => `${h}時`)

    const deptIdx = new Map(depts.map((n, i) => [n, i]))
    const hourIdx = new Map(hours.map((h, i) => [h, i]))

    let maxVal = 0
    let minVal = Infinity
    const heatData: [number, number, number][] = []
    for (const d of data) {
      const hi = hourIdx.get(d.hour)
      const di = deptIdx.get(d.name)
      if (hi == null || di == null) continue
      const curVal = isAmount ? d.amount : d.quantity

      if (isYoY) {
        const prevVal = prevMap.get(`${d.code}_${d.hour}`) ?? 0
        const ratio = prevVal > 0 ? curVal / prevVal : 0
        const pct = Math.round(ratio * 10000) / 100 // e.g. 105.23
        heatData.push([hi, di, pct])
        if (pct > maxVal) maxVal = pct
        if (pct < minVal) minVal = pct
      } else {
        heatData.push([hi, di, curVal])
        if (curVal > maxVal) maxVal = curVal
      }
    }

    const visualMapConfig = isYoY
      ? {
          min: Math.min(minVal, 80),
          max: Math.max(maxVal, 120),
          calculable: false,
          orient: 'horizontal' as const,
          left: 'center',
          bottom: 0,
          show: false,
          inRange: {
            color: ['#ef4444', '#fca5a5', '#fef9c3', '#bbf7d0', '#10b981'],
          },
        }
      : {
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
        }

    return {
      grid: { left: gridLeft, right: gridRight, top: 10, bottom: 30, containLabel: false },
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = params as { data?: [number, number, number] }
          if (!Array.isArray(p?.data) || p.data.length < 3) return ''
          const [hi, di, val] = p.data
          const dept = depts[di] ?? ''
          const hour = hourLabels[hi] ?? ''
          if (isYoY) {
            const code = deptCodes[di]
            const prevVal = prevMap.get(`${code}_${hours[hi]}`) ?? 0
            const fmtV = isAmount ? cf.formatWithUnit : (v: number) => `${v.toLocaleString()}点`
            return `${dept} ${hour}<br/>前年比 ${val.toFixed(1)}%<br/>当年 ${fmtV(
              Math.round((prevVal * val) / 100),
            )}<br/>前年 ${fmtV(Math.round(prevVal))}`
          }
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
      visualMap: visualMapConfig,
      series: [
        {
          type: 'heatmap' as const,
          data: heatData,
          itemStyle: { borderWidth: 1, borderColor: theme.colors.bg },
          label: {
            show: true,
            fontSize: depts.length > 20 ? 7 : depts.length > 12 ? 8 : 9,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.mono,
            formatter: (params: unknown) => {
              const p = params as { data?: [number, number, number] }
              if (!Array.isArray(p?.data) || p.data.length < 3) return ''
              const val = p.data[2]
              if (val === 0) return ''
              if (isYoY) return `${val.toFixed(1)}%`
              if (isAmount) return cf.formatWithUnit(val)
              return val.toLocaleString()
            },
          },
        },
      ],
    }
  }, [data, prevMap, metric, showYoY, hasPrev, gridLeft, gridRight, theme, cf])

  const deptCount = useMemo(() => new Set(data.map((d) => d.code)).size, [data])
  const rowH = deptCount > 20 ? 24 : 32
  const chartH = Math.max(180, deptCount * rowH + 40)

  if (data.length === 0) return null

  return (
    <>
      {hasPrev && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <TabGroup>
            <Tab $active={!showYoY} onClick={() => setShowYoY(false)}>
              実績値
            </Tab>
            <Tab $active={showYoY} onClick={() => setShowYoY(true)}>
              前年比
            </Tab>
          </TabGroup>
        </div>
      )}
      <EChart option={option} height={chartH} ariaLabel="カテゴリ×時間帯ヒートマップ" />
    </>
  )
})
