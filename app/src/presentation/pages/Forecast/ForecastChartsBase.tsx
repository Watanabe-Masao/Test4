/**
 * 基本チャート群 — 週別・曜日・店舗比較 (ECharts)
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { calculateForecast } from '@/application/hooks/calculation'
import type { DayOfWeekAverage } from '@/application/hooks/calculation'
import { formatPercent } from '@/domain/formatting'
import { calculateShare } from '@/domain/calculations/utils'
import {
  STORE_COLORS,
  toAxisYen,
  toComma,
  toPct,
} from '@/presentation/components/charts/chartTheme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
  standardLegend,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { ChartWrapper, ChartTitle } from './ForecastPage.styles'
import { DOW_LABELS } from './ForecastPage.helpers'

// ─── WeeklyChart ────────────────────────────────────────

function buildWeeklyOption(
  data: Record<string, string | number>[],
  dowColors: string[],
  theme: AppTheme,
): EChartsOption {
  const categories = data.map((d) => d.name as string)
  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number; color: string }[]
        if (!Array.isArray(items) || items.length === 0) return ''
        const header = `<div style="font-weight:600;margin-bottom:4px">${(items[0] as { name?: string }).name ?? ''}</div>`
        const rows = items
          .filter((item) => item.value > 0)
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
      },
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
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.mono,
        formatter: (v: number) => toAxisYen(v),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
      },
    },
    series: DOW_LABELS.map((label, i) => ({
      name: label,
      type: 'bar' as const,
      stack: 'dow',
      data: data.map((d) => d[label] as number),
      itemStyle: { color: dowColors[i], opacity: 0.8 },
      barMaxWidth: 40,
    })),
  }
}

export const WeeklyChart = memo(function WeeklyChart({
  data,
  dowColors,
}: {
  data: Record<string, string | number>[]
  dowColors: string[]
}) {
  const theme = useTheme() as AppTheme
  const option = useMemo(() => buildWeeklyOption(data, dowColors, theme), [data, dowColors, theme])

  return (
    <ChartWrapper>
      <ChartTitle>週別売上推移（曜日別）</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})

// ─── DayOfWeekChart ─────────────────────────────────────

function buildDayOfWeekOption(
  data: { name: string; average: number; index: number; count: number; color: string }[],
  theme: AppTheme,
): EChartsOption {
  const categories = data.map((d) => d.name)
  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) => {
        const items = params as { dataIndex: number; value: number }[]
        if (!Array.isArray(items) || items.length === 0) return ''
        const idx = items[0].dataIndex
        const d = data[idx]
        return (
          `<div style="font-weight:600;margin-bottom:4px">${d.name}</div>` +
          `<div>曜日指数: ${formatPercent(d.index)}</div>` +
          `<div>平均売上: ${toComma(d.average)}</div>`
        )
      },
    },
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
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.mono,
        formatter: (v: number) => toPct(v, 0),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
      },
    },
    series: [
      {
        type: 'bar' as const,
        data: data.map((d) => ({
          value: d.index,
          itemStyle: { color: d.color, opacity: 0.8 },
          label: {
            show: true,
            position: 'top' as const,
            color: theme.colors.text2,
            fontSize: 10,
            fontFamily: theme.typography.fontFamily.mono,
            formatter: () => toPct(d.index),
          },
        })),
        barMaxWidth: 40,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
    ],
  }
}

export const DayOfWeekChart = memo(function DayOfWeekChart({
  averages,
  dowColors,
}: {
  averages: readonly DayOfWeekAverage[]
  dowColors: string[]
}) {
  const theme = useTheme() as AppTheme

  const totalAvg = averages.reduce((s, a) => s + a.averageSales, 0)

  const data = averages.map((a, i) => ({
    name: DOW_LABELS[i],
    average: a.averageSales,
    index: calculateShare(a.averageSales, totalAvg),
    count: a.count,
    color: dowColors[i],
  }))

  const option = useMemo(() => buildDayOfWeekOption(data, theme), [data, theme])

  return (
    <ChartWrapper>
      <ChartTitle>曜日指数（曜日別構成比）</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})

// ─── StoreComparisonRadarChart ──────────────────────────

function buildRadarOption(
  storeForecasts: {
    storeId: string
    storeName: string
    forecast: ReturnType<typeof calculateForecast>
  }[],
  theme: AppTheme,
): EChartsOption {
  const maxValues = DOW_LABELS.map((_, i) => {
    let max = 0
    for (const sf of storeForecasts) {
      const v = sf.forecast.dayOfWeekAverages[i]?.averageSales ?? 0
      if (v > max) max = v
    }
    return max
  })
  const indicator = DOW_LABELS.map((label, i) => ({
    name: label,
    max: Math.ceil(maxValues[i] * 1.2) || 1,
  }))

  return {
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'item' as const,
    },
    legend: {
      ...standardLegend(theme),
      data: storeForecasts.map((sf) => sf.storeName),
    },
    radar: {
      indicator,
      axisName: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.primary,
      },
      splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.4 } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: theme.colors.border, opacity: 0.4 } },
    },
    series: [
      {
        type: 'radar' as const,
        data: storeForecasts.map((sf, i) => ({
          name: sf.storeName,
          value: DOW_LABELS.map((_, di) => sf.forecast.dayOfWeekAverages[di]?.averageSales ?? 0),
          lineStyle: {
            color: STORE_COLORS[i % STORE_COLORS.length],
            width: 2,
          },
          areaStyle: {
            color: STORE_COLORS[i % STORE_COLORS.length],
            opacity: 0.15,
          },
          itemStyle: { color: STORE_COLORS[i % STORE_COLORS.length] },
        })),
      },
    ],
  }
}

export const StoreComparisonRadarChart = memo(function StoreComparisonRadarChart({
  storeForecasts,
}: {
  storeForecasts: {
    storeId: string
    storeName: string
    forecast: ReturnType<typeof calculateForecast>
  }[]
}) {
  const theme = useTheme() as AppTheme
  const option = useMemo(() => buildRadarOption(storeForecasts, theme), [storeForecasts, theme])

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 曜日別売上レーダー</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})

// ─── StoreComparisonBarChart ────────────────────────────

function buildStoreBarOption(
  storeForecasts: {
    storeId: string
    storeName: string
    forecast: ReturnType<typeof calculateForecast>
  }[],
  theme: AppTheme,
): EChartsOption {
  const data =
    storeForecasts[0]?.forecast.weeklySummaries.map((w, wi) => {
      const entry: Record<string, string | number> = { name: `第${w.weekNumber}週` }
      storeForecasts.forEach((sf) => {
        const sw = sf.forecast.weeklySummaries[wi]
        entry[sf.storeName] = sw?.totalSales ?? 0
      })
      return entry
    }) ?? []

  const categories = data.map((d) => d.name as string)

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number; color: string; name: string }[]
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
      },
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
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.mono,
        formatter: (v: number) => toAxisYen(v),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
      },
    },
    series: storeForecasts.map((sf, i) => ({
      name: sf.storeName,
      type: 'bar' as const,
      data: data.map((d) => d[sf.storeName] as number),
      itemStyle: {
        color: STORE_COLORS[i % STORE_COLORS.length],
        opacity: 0.8,
        borderRadius: [4, 4, 0, 0],
      },
      barMaxWidth: 30,
    })),
  }
}

export const StoreComparisonBarChart = memo(function StoreComparisonBarChart({
  storeForecasts,
}: {
  storeForecasts: {
    storeId: string
    storeName: string
    forecast: ReturnType<typeof calculateForecast>
  }[]
}) {
  const theme = useTheme() as AppTheme
  const option = useMemo(() => buildStoreBarOption(storeForecasts, theme), [storeForecasts, theme])

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 週別売上比較</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})
