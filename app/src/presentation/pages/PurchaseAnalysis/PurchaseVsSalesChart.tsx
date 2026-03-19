/**
 * 売上 vs 仕入原価 日別チャート
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { palette } from '@/presentation/theme/tokens'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
  standardLegend,
  toCommaYen,
} from '@/presentation/components/charts/echartsOptionBuilders'
import type { PurchaseDailyData } from '@/domain/models/PurchaseComparison'
import { EmptyState, SubNote, ChartWrapper } from './PurchaseAnalysisPage.styles'

// ── データ構築 ──

function buildSalesVsCostData(daily: PurchaseDailyData) {
  const salesMap = new Map(daily.current.map((d) => [d.day, d]))
  const allDays = Array.from(new Set([...daily.current.map((d) => d.day)])).sort((a, b) => a - b)

  const points = allDays.map((day) => {
    const cur = salesMap.get(day)
    return { day, sales: cur?.sales ?? 0, cost: cur?.cost ?? 0 }
  })
  const cumSalesArr = points.reduce<number[]>((acc, p, i) => {
    acc.push((i > 0 ? acc[i - 1] : 0) + p.sales)
    return acc
  }, [])
  const cumCostArr = points.reduce<number[]>((acc, p, i) => {
    acc.push((i > 0 ? acc[i - 1] : 0) + p.cost)
    return acc
  }, [])

  return points.map((p, i) => ({
    day: `${p.day}日`,
    sales: Math.round(p.sales),
    cost: Math.round(p.cost),
    cumSales: Math.round(cumSalesArr[i]),
    cumCost: Math.round(cumCostArr[i]),
    cumDiff: Math.round(cumSalesArr[i] - cumCostArr[i]),
    costToSalesRatio:
      cumSalesArr[i] > 0 ? Math.round((cumCostArr[i] / cumSalesArr[i]) * 10000) / 100 : 0,
  }))
}

// ── フォーマッタ ──

function fmtYen(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

// ── コンポーネント ──

export const PurchaseVsSalesChart = memo(function PurchaseVsSalesChart({
  daily,
}: {
  daily: PurchaseDailyData
}) {
  const theme = useTheme() as AppTheme
  const chartData = useMemo(() => buildSalesVsCostData(daily), [daily])

  const mainOption = useMemo((): EChartsOption => {
    const days = chartData.map((d) => d.day)
    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const ps = (Array.isArray(params) ? params : [params]) as {
            name: string
            seriesName: string
            value: number
            marker: string
          }[]
          return ps.map((p) => `${p.marker} ${p.seriesName}: ${toCommaYen(p.value)}`).join('<br/>')
        },
      },
      legend: standardLegend(theme),
      xAxis: {
        type: 'category' as const,
        data: days,
        axisLabel: { fontSize: 11 },
      },
      yAxis: [
        {
          type: 'value' as const,
          position: 'left' as const,
          axisLabel: { formatter: (v: number) => fmtYen(v), fontSize: 11 },
          splitLine: {
            lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
          },
        },
        {
          type: 'value' as const,
          position: 'right' as const,
          axisLabel: { formatter: (v: number) => fmtYen(v), fontSize: 11 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          type: 'bar' as const,
          name: '売上',
          yAxisIndex: 0,
          data: chartData.map((d) => d.sales),
          itemStyle: { color: palette.positive, opacity: 0.7 },
        },
        {
          type: 'bar' as const,
          name: '仕入原価',
          yAxisIndex: 0,
          data: chartData.map((d) => d.cost),
          itemStyle: { color: palette.negative, opacity: 0.7 },
        },
        {
          type: 'line' as const,
          name: '累計差（売上-仕入）',
          yAxisIndex: 1,
          data: chartData.map((d) => d.cumDiff),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: palette.info, width: 2 },
          itemStyle: { color: palette.info },
        },
      ],
    }
  }, [chartData, theme])

  const ratioOption = useMemo((): EChartsOption => {
    const days = chartData.map((d) => d.day)
    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const ps = (Array.isArray(params) ? params : [params]) as {
            name: string
            seriesName: string
            value: number
            marker: string
          }[]
          const first = ps[0]
          if (!first) return ''
          return `${first.marker} ${first.seriesName}: ${first.value.toFixed(2)}%`
        },
      },
      xAxis: {
        type: 'category' as const,
        data: days,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value' as const,
        min: 0,
        max: 100,
        axisLabel: { formatter: (v: number) => `${v}%`, fontSize: 11 },
        splitLine: {
          lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
        },
      },
      series: [
        {
          type: 'line' as const,
          name: '仕入/売上比率',
          data: chartData.map((d) => d.costToSalesRatio),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: palette.warning, width: 2 },
          itemStyle: { color: palette.warning },
        },
      ],
    }
  }, [chartData, theme])

  if (chartData.length === 0) {
    return <EmptyState>日別データがありません</EmptyState>
  }

  return (
    <>
      <ChartWrapper style={{ height: 320 }}>
        <EChart option={mainOption} height={320} />
      </ChartWrapper>
      <SubNote style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>
        仕入対売上比率（累計）
      </SubNote>
      <ChartWrapper style={{ height: 200 }}>
        <EChart option={ratioOption} height={200} />
      </ChartWrapper>
    </>
  )
})
