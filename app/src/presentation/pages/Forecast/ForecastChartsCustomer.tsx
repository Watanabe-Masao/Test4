/**
 * 客数・客単価分析チャート群 (ECharts)
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { toAxisYen, toComma } from '@/presentation/components/charts/chartTheme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import { standardGrid, standardTooltip, standardLegend } from '@/presentation/components/charts/echartsOptionBuilders'
import { ChartWrapper, ChartTitle } from './ForecastPage.styles'
import {
  DOW_LABELS,
  type DowCustomerAvg,
  type MovingAvgEntry,
  type DailyCustomerEntry,
  type RelationshipEntry,
} from './ForecastPage.helpers'

// ─── 共通ヘルパー ───────────────────────────────────────

function yenValueAxis(theme: AppTheme, opts?: { position?: 'left' | 'right'; label?: string; width?: number }) {
  const pos = opts?.position ?? ('left' as const)
  return {
    type: 'value' as const,
    position: pos,
    axisLabel: {
      color: theme.colors.text3,
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.mono,
      ...(pos === 'right' ? { formatter: (v: number) => toComma(v) } : {}),
    },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: pos === 'left'
      ? { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const } }
      : { show: false },
    name: opts?.label,
    nameLocation: 'end' as const,
    nameTextStyle: {
      color: theme.colors.text3,
      fontSize: 10,
    },
  }
}

function tooltipFormatter(items: { seriesName: string; value: number; color: string; name: string }[]) {
  if (!Array.isArray(items) || items.length === 0) return ''
  const header = `<div style="font-weight:600;margin-bottom:4px">${items[0].name}</div>`
  const rows = items
    .map(
      (item) =>
        `<div style="display:flex;justify-content:space-between;gap:12px">` +
        `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:4px;vertical-align:middle"></span>` +
        `<span>${item.seriesName}</span>` +
        `<span style="font-weight:600;font-family:monospace;margin-left:auto">${toComma(item.value)}</span>` +
        `</div>`,
    )
    .join('')
  return header + rows
}

// ─── DowCustomerChart ───────────────────────────────────

function buildDowCustomerOption(
  data: { name: string; color: string; [key: string]: string | number }[],
  hasPrev: boolean,
  theme: AppTheme,
): EChartsOption {
  const categories = data.map((d) => d.name)

  const series: EChartsOption['series'] = [
    {
      name: '今年客数',
      type: 'bar' as const,
      yAxisIndex: 0,
      data: data.map((d) => ({
        value: d['今年客数'] as number,
        itemStyle: { color: d.color, opacity: 0.8 },
      })),
      barMaxWidth: 30,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
    ...(hasPrev
      ? [
          {
            name: '比較期客数',
            type: 'bar' as const,
            yAxisIndex: 0,
            data: data.map((d) => d['比較期客数'] as number),
            itemStyle: { color: '#94a3b8', opacity: 0.4, borderRadius: [4, 4, 0, 0] },
            barMaxWidth: 30,
          },
        ]
      : []),
    {
      name: '今年客単価',
      type: 'line' as const,
      yAxisIndex: 1,
      data: data.map((d) => d['今年客単価'] as number),
      smooth: true,
      lineStyle: { color: '#8b5cf6', width: 2 },
      itemStyle: { color: '#8b5cf6' },
      symbolSize: 6,
    },
    ...(hasPrev
      ? [
          {
            name: '比較期客単価',
            type: 'line' as const,
            yAxisIndex: 1,
            data: data.map((d) => d['比較期客単価'] as number),
            smooth: true,
            lineStyle: { color: '#8b5cf6', width: 1.5, type: 'dashed' as const },
            itemStyle: { color: '#8b5cf6' },
            symbolSize: 4,
          },
        ]
      : []),
  ]

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) =>
        tooltipFormatter(
          params as { seriesName: string; value: number; color: string; name: string }[],
        ),
    },
    legend: standardLegend(theme),
    xAxis: {
      type: 'category' as const,
      data: categories,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.primary,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
      axisTick: { show: false },
    },
    yAxis: [
      yenValueAxis(theme, { position: 'left' as const, label: '客数' }),
      yenValueAxis(theme, { position: 'right' as const, label: '客単価' }),
    ],
    series,
  }
}

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

  const option = useMemo(
    () => buildDowCustomerOption(data, hasPrev, theme),
    [data, hasPrev, theme],
  )

  return (
    <ChartWrapper>
      <ChartTitle>曜日別 平均客数・客単価{hasPrev ? '（比較期比較）' : ''}</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})

// ─── MovingAverageChart ─────────────────────────────────

function buildMovingAvgOption(
  chartData: { day: string; [key: string]: string | number }[],
  hasPrev: boolean,
  theme: AppTheme,
): EChartsOption {
  const categories = chartData.map((d) => d.day)

  const series: EChartsOption['series'] = [
    {
      name: '客数MA',
      type: 'line' as const,
      yAxisIndex: 0,
      data: chartData.map((d) => d['客数MA'] as number),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#06b6d4', width: 2 },
      areaStyle: { color: '#06b6d4', opacity: 0.15 },
      itemStyle: { color: '#06b6d4' },
    },
    ...(hasPrev
      ? [
          {
            name: '比較期客数MA',
            type: 'line' as const,
            yAxisIndex: 0,
            data: chartData.map((d) => (d['比較期客数MA'] as number) ?? null),
            smooth: true,
            symbol: 'none',
            lineStyle: { color: '#94a3b8', width: 1.5, type: 'dashed' as const },
            areaStyle: { color: '#94a3b8', opacity: 0.08 },
            itemStyle: { color: '#94a3b8' },
          },
        ]
      : []),
    {
      name: '客単価MA',
      type: 'line' as const,
      yAxisIndex: 1,
      data: chartData.map((d) => d['客単価MA'] as number),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#8b5cf6', width: 2 },
      itemStyle: { color: '#8b5cf6' },
    },
    ...(hasPrev
      ? [
          {
            name: '比較期客単価MA',
            type: 'line' as const,
            yAxisIndex: 1,
            data: chartData.map((d) => (d['比較期客単価MA'] as number) ?? null),
            smooth: true,
            symbol: 'none',
            lineStyle: { color: '#a78bfa', width: 1.5, type: 'dashed' as const },
            itemStyle: { color: '#a78bfa' },
          },
        ]
      : []),
  ]

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) =>
        tooltipFormatter(
          params as { seriesName: string; value: number; color: string; name: string }[],
        ),
    },
    legend: standardLegend(theme),
    xAxis: {
      type: 'category' as const,
      data: categories,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.mono,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
      axisTick: { show: false },
    },
    yAxis: [
      yenValueAxis(theme, { position: 'left' as const }),
      yenValueAxis(theme, { position: 'right' as const }),
    ],
    series,
  }
}

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

  const option = useMemo(() => buildMovingAvgOption(chartData, hasPrev, theme), [chartData, hasPrev, theme])

  return (
    <ChartWrapper>
      <ChartTitle>客数・客単価 移動平均（5日窓）{hasPrev ? ' vs 比較期' : ''}</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})

// ─── RelationshipChart ──────────────────────────────────

function buildRelationshipOption(
  chartData: Record<string, number | string>[],
  viewMode: 'current' | 'prev' | 'compare',
  theme: AppTheme,
): EChartsOption {
  const showCurrent = viewMode === 'current' || viewMode === 'compare'
  const showPrev = viewMode === 'prev' || viewMode === 'compare'
  const categories = chartData.map((d) => d.day as string)

  const series: EChartsOption['series'] = [
    ...(showCurrent
      ? [
          {
            name: '売上指数',
            type: 'line' as const,
            data: chartData.map((d) => d['売上指数'] as number),
            smooth: true,
            lineStyle: { color: '#3b82f6', width: 2 },
            itemStyle: { color: '#3b82f6' },
            symbolSize: 4,
          },
          {
            name: '客数指数',
            type: 'line' as const,
            data: chartData.map((d) => d['客数指数'] as number),
            smooth: true,
            lineStyle: { color: '#06b6d4', width: 2 },
            itemStyle: { color: '#06b6d4' },
            symbolSize: 4,
          },
          {
            name: '客単価指数',
            type: 'line' as const,
            data: chartData.map((d) => d['客単価指数'] as number),
            smooth: true,
            lineStyle: { color: '#8b5cf6', width: 2 },
            itemStyle: { color: '#8b5cf6' },
            symbolSize: 4,
          },
        ]
      : []),
    ...(showPrev
      ? [
          {
            name: '比較期売上指数',
            type: 'line' as const,
            data: chartData.map((d) => (d['比較期売上指数'] as number) ?? null),
            smooth: true,
            lineStyle: { color: '#3b82f6', width: 1.5, type: 'dashed' as const },
            itemStyle: { color: '#3b82f6' },
            symbol: 'none',
          },
          {
            name: '比較期客数指数',
            type: 'line' as const,
            data: chartData.map((d) => (d['比較期客数指数'] as number) ?? null),
            smooth: true,
            lineStyle: { color: '#06b6d4', width: 1.5, type: 'dashed' as const },
            itemStyle: { color: '#06b6d4' },
            symbol: 'none',
          },
          {
            name: '比較期客単価指数',
            type: 'line' as const,
            data: chartData.map((d) => (d['比較期客単価指数'] as number) ?? null),
            smooth: true,
            lineStyle: { color: '#8b5cf6', width: 1.5, type: 'dashed' as const },
            itemStyle: { color: '#8b5cf6' },
            symbol: 'none',
          },
        ]
      : []),
  ]

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number; color: string; name: string }[]
        if (!Array.isArray(items) || items.length === 0) return ''
        const header = `<div style="font-weight:600;margin-bottom:4px">${items[0].name}日</div>`
        const rows = items
          .map(
            (item) =>
              `<div style="display:flex;justify-content:space-between;gap:12px">` +
              `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:4px;vertical-align:middle"></span>` +
              `<span>${item.seriesName}</span>` +
              `<span style="font-weight:600;font-family:monospace;margin-left:auto">${item.value}%</span>` +
              `</div>`,
          )
          .join('')
        return header + rows
      },
    },
    legend: standardLegend(theme),
    xAxis: {
      type: 'category' as const,
      data: categories,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.mono,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.mono,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const } },
    },
    series,
  }
}

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

function buildCustomerSalesOption(
  chartData: { day: string; 売上: number; 客数: number; 客単価: number }[],
  theme: AppTheme,
): EChartsOption {
  const categories = chartData.map((d) => d.day)

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) =>
        tooltipFormatter(
          params as { seriesName: string; value: number; color: string; name: string }[],
        ),
    },
    legend: standardLegend(theme),
    xAxis: {
      type: 'category' as const,
      data: categories,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.mono,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value' as const,
        position: 'left' as const,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.mono,
          formatter: (v: number) => toAxisYen(v),
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const } },
      },
      {
        type: 'value' as const,
        position: 'right' as const,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.mono,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '売上',
        type: 'bar' as const,
        yAxisIndex: 0,
        data: chartData.map((d) => d['売上']),
        itemStyle: { color: '#3b82f6', opacity: 0.6, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 20,
      },
      {
        name: '客数',
        type: 'line' as const,
        yAxisIndex: 1,
        data: chartData.map((d) => d['客数']),
        smooth: true,
        lineStyle: { color: '#06b6d4', width: 2 },
        itemStyle: { color: '#06b6d4' },
        symbolSize: 5,
      },
      {
        name: '客単価',
        type: 'line' as const,
        yAxisIndex: 1,
        data: chartData.map((d) => d['客単価']),
        smooth: true,
        lineStyle: { color: '#8b5cf6', width: 2 },
        itemStyle: { color: '#8b5cf6' },
        symbolSize: 5,
      },
    ],
  }
}

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

function buildSameDowOption(
  chartData: { day: string; color: string; [key: string]: string | number }[],
  theme: AppTheme,
): EChartsOption {
  const categories = chartData.map((d) => d.day)

  return {
    grid: { ...standardGrid(), bottom: 40 },
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) =>
        tooltipFormatter(
          params as { seriesName: string; value: number; color: string; name: string }[],
        ),
    },
    legend: standardLegend(theme),
    xAxis: {
      type: 'category' as const,
      data: categories,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.primary,
        rotate: 45,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value' as const,
        position: 'left' as const,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.mono,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const } },
      },
      {
        type: 'value' as const,
        position: 'right' as const,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.mono,
          formatter: (v: number) => toComma(v),
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '今年客数',
        type: 'bar' as const,
        yAxisIndex: 0,
        data: chartData.map((d) => ({
          value: d['今年客数'] as number,
          itemStyle: { color: d.color, opacity: 0.8 },
        })),
        barMaxWidth: 16,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '前年客数',
        type: 'bar' as const,
        yAxisIndex: 0,
        data: chartData.map((d) => d['前年客数'] as number),
        itemStyle: { color: '#94a3b8', opacity: 0.4, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 16,
      },
      {
        name: '今年客単価',
        type: 'line' as const,
        yAxisIndex: 1,
        data: chartData.map((d) => d['今年客単価'] as number),
        smooth: true,
        lineStyle: { color: '#8b5cf6', width: 2 },
        itemStyle: { color: '#8b5cf6' },
        symbolSize: 4,
      },
      {
        name: '前年客単価',
        type: 'line' as const,
        yAxisIndex: 1,
        data: chartData.map((d) => d['前年客単価'] as number),
        smooth: true,
        lineStyle: { color: '#a78bfa', width: 1.5, type: 'dashed' as const },
        itemStyle: { color: '#a78bfa' },
        symbolSize: 4,
      },
    ],
  }
}

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
