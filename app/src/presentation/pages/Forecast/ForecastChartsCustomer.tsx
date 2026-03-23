/**
 * 客数・客単価分析チャート群 (ECharts)
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart } from '@/presentation/components/charts/EChart'
import { ChartWrapper, ChartTitle } from './ForecastPage.styles'
import {
  DOW_LABELS,
  type DowCustomerAvg,
  type MovingAvgEntry,
  type DailyCustomerEntry,
  type RelationshipEntry,
} from './ForecastPage.helpers'
import {
  buildDowCustomerOption,
  buildMovingAvgOption,
  buildRelationshipOption,
  buildCustomerSalesOption,
  buildSameDowOption,
} from './ForecastChartsCustomer.builders'

// ─── DowCustomerChart ───────────────────────────────────

export const DowCustomerChart = memo(function DowCustomerChart({
  averages,
  dowColors,
}: {
  averages: DowCustomerAvg[]
  dowColors: string[]
}) {
  const theme = useTheme() as AppTheme
  const hasPrev = averages.some((a) => a.prevAvgCustomers > 0)

  const data = averages.map((a, i) => ({
    name: a.dow,
    今年客数: a.avgCustomers,
    ...(hasPrev ? { 比較期客数: a.prevAvgCustomers } : {}),
    今年客単価: a.avgTxValue,
    ...(hasPrev ? { 比較期客単価: a.prevAvgTxValue } : {}),
    color: dowColors[i],
  }))

  const option = useMemo(() => buildDowCustomerOption(data, hasPrev, theme), [data, hasPrev, theme])

  return (
    <ChartWrapper>
      <ChartTitle>曜日別 平均客数・客単価{hasPrev ? '（比較期比較）' : ''}</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})

// ─── MovingAverageChart ─────────────────────────────────

export const MovingAverageChart = memo(function MovingAverageChart({
  data: maData,
  hasPrev,
}: {
  data: MovingAvgEntry[]
  hasPrev: boolean
}) {
  const theme = useTheme() as AppTheme

  const chartData = maData.map((e) => ({
    day: `${e.day}`,
    客数MA: e.customersMA,
    客単価MA: e.txValueMA,
    ...(hasPrev ? { 比較期客数MA: e.prevCustomersMA, 比較期客単価MA: e.prevTxValueMA } : {}),
  }))

  const option = useMemo(
    () => buildMovingAvgOption(chartData, hasPrev, theme),
    [chartData, hasPrev, theme],
  )

  return (
    <ChartWrapper>
      <ChartTitle>客数・客単価 移動平均（5日窓）{hasPrev ? ' vs 比較期' : ''}</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})

// ─── RelationshipChart ──────────────────────────────────

export const RelationshipChart = memo(function RelationshipChart({
  data: relData,
  prevData,
  viewMode,
}: {
  data: RelationshipEntry[]
  prevData: RelationshipEntry[]
  viewMode: 'current' | 'prev' | 'compare'
}) {
  const theme = useTheme() as AppTheme

  const showCurrent = viewMode === 'current' || viewMode === 'compare'
  const showPrev = (viewMode === 'prev' || viewMode === 'compare') && prevData.length > 0

  // Merge data by day
  const dayMap = new Map<number, Record<string, number | string>>()
  if (showCurrent) {
    for (const e of relData) {
      dayMap.set(e.day, {
        day: `${e.day}`,
        売上指数: Math.round(e.salesIndex * 100),
        客数指数: Math.round(e.customersIndex * 100),
        客単価指数: Math.round(e.txValueIndex * 100),
      })
    }
  }
  if (showPrev) {
    for (const e of prevData) {
      const existing = dayMap.get(e.day) ?? { day: `${e.day}` }
      dayMap.set(e.day, {
        ...existing,
        比較期売上指数: Math.round(e.salesIndex * 100),
        比較期客数指数: Math.round(e.customersIndex * 100),
        比較期客単価指数: Math.round(e.txValueIndex * 100),
      })
    }
  }
  const chartData = [...dayMap.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)

  const title =
    viewMode === 'compare'
      ? '売上・客数・客単価 関係性推移（当期 vs 比較期）'
      : viewMode === 'prev'
        ? '売上・客数・客単価 関係性推移（比較期）'
        : '売上・客数・客単価 関係性推移（当期）'

  const option = useMemo(
    () => buildRelationshipOption(chartData, viewMode, theme),
    [chartData, viewMode, theme],
  )

  return (
    <ChartWrapper style={{ height: 360 }}>
      <ChartTitle>{title}（平均=100）</ChartTitle>
      <EChart option={option} height={300} />
    </ChartWrapper>
  )
})

// ─── CustomerSalesScatterChart ──────────────────────────

export const CustomerSalesScatterChart = memo(function CustomerSalesScatterChart({
  data,
}: {
  data: DailyCustomerEntry[]
}) {
  const theme = useTheme() as AppTheme

  const withCust = data.filter((e) => e.customers > 0)
  const chartData = withCust.map((e) => ({
    day: `${e.day}`,
    売上: e.sales,
    客数: e.customers,
    客単価: e.txValue,
  }))

  const option = useMemo(() => buildCustomerSalesOption(chartData, theme), [chartData, theme])

  return (
    <ChartWrapper>
      <ChartTitle>日別 売上・客数・客単価 推移</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})

// ─── SameDowComparisonChart ─────────────────────────────

export const SameDowComparisonChart = memo(function SameDowComparisonChart({
  entries,
  year,
  month,
  dowColors,
}: {
  entries: DailyCustomerEntry[]
  year: number
  month: number
  dowColors: string[]
}) {
  const theme = useTheme() as AppTheme

  const chartData = entries
    .filter((e) => e.customers > 0 && e.prevCustomers > 0)
    .map((e) => {
      const dow = new Date(year, month - 1, e.day).getDay()
      return {
        day: `${e.day}(${DOW_LABELS[dow]})`,
        今年客数: e.customers,
        前年客数: e.prevCustomers,
        今年客単価: e.txValue,
        前年客単価: e.prevTxValue,
        color: dowColors[dow],
      }
    })

  const option = useMemo(() => buildSameDowOption(chartData, theme), [chartData, theme])

  if (chartData.length === 0) return null

  return (
    <ChartWrapper>
      <ChartTitle>同曜日 客数・客単価比較（今年 vs 前年）</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})
