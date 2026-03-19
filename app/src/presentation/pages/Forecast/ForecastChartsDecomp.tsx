/**
 * 要因分解分析チャート群 (ECharts)
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { toAxisYen, toComma } from '@/presentation/components/charts/chartTheme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
  standardLegend,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { ChartWrapper, ChartTitle } from './ForecastPage.styles'
import { type DailyDecompEntry, type DowDecompAvg } from './ForecastPage.helpers'

const EFFECT_COLORS = {
  custEffect: '#06b6d4',
  ticketEffect: '#8b5cf6',
  salesDiff: '#f59e0b',
} as const

const EFFECT_LABELS: Record<string, string> = {
  custEffect: '客数効果',
  ticketEffect: '客単価効果',
  salesDiff: '売上差',
  cumCustEffect: '累計客数効果',
  cumTicketEffect: '累計客単価効果',
  cumSalesDiff: '累計売上差',
}

// ─── 共通軸ヘルパー ─────────────────────────────────────

function dayXAxis(data: DailyDecompEntry[], theme: AppTheme) {
  return {
    type: 'category' as const,
    data: data.map((d) => `${d.day}`),
    axisLabel: {
      color: theme.colors.text3,
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.mono,
    },
    axisLine: { lineStyle: { color: theme.colors.border } },
    axisTick: { show: false },
  }
}

function yenValueAxis(theme: AppTheme) {
  return {
    type: 'value' as const,
    axisLabel: {
      color: theme.colors.text3,
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.mono,
      formatter: (v: number) => toAxisYen(v),
    },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const } },
  }
}

// ─── DecompTrendChart ───────────────────────────────────

function buildDecompTrendOption(data: DailyDecompEntry[], theme: AppTheme): EChartsOption {
  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number; color: string }[]
        if (!Array.isArray(items) || items.length === 0) return ''
        const idx = (items[0] as { dataIndex?: number }).dataIndex ?? 0
        const header = `<div style="font-weight:600;margin-bottom:4px">${data[idx].day}日</div>`
        const rows = items
          .map(
            (item) =>
              `<div style="display:flex;justify-content:space-between;gap:12px">` +
              `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:4px;vertical-align:middle"></span>` +
              `<span>${EFFECT_LABELS[item.seriesName] ?? item.seriesName}</span>` +
              `<span style="font-weight:600;font-family:monospace;margin-left:auto">${toComma(item.value)}</span>` +
              `</div>`,
          )
          .join('')
        return header + rows
      },
    },
    legend: {
      ...standardLegend(theme),
      formatter: (name: string) => EFFECT_LABELS[name] ?? name,
    },
    xAxis: dayXAxis(data, theme),
    yAxis: yenValueAxis(theme),
    series: [
      {
        name: 'cumCustEffect',
        type: 'line' as const,
        data: data.map((d) => d.cumCustEffect),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: EFFECT_COLORS.custEffect, width: 2 },
        areaStyle: { color: EFFECT_COLORS.custEffect, opacity: 0.15 },
        itemStyle: { color: EFFECT_COLORS.custEffect },
      },
      {
        name: 'cumTicketEffect',
        type: 'line' as const,
        data: data.map((d) => d.cumTicketEffect),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: EFFECT_COLORS.ticketEffect, width: 2 },
        areaStyle: { color: EFFECT_COLORS.ticketEffect, opacity: 0.15 },
        itemStyle: { color: EFFECT_COLORS.ticketEffect },
      },
      {
        name: 'cumSalesDiff',
        type: 'line' as const,
        data: data.map((d) => d.cumSalesDiff),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: EFFECT_COLORS.salesDiff, width: 2.5, type: 'dashed' as const },
        itemStyle: { color: EFFECT_COLORS.salesDiff },
      },
    ],
  }
}

export const DecompTrendChart = memo(function DecompTrendChart({
  data,
}: {
  data: DailyDecompEntry[]
}) {
  const theme = useTheme() as AppTheme
  const option = useMemo(() => buildDecompTrendOption(data, theme), [data, theme])

  return (
    <ChartWrapper>
      <ChartTitle>日別 要因分解推移（累計）</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})

// ─── DecompDailyBarChart ────────────────────────────────

function buildDecompDailyBarOption(data: DailyDecompEntry[], theme: AppTheme): EChartsOption {
  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number; color: string }[]
        if (!Array.isArray(items) || items.length === 0) return ''
        const idx = (items[0] as { dataIndex?: number }).dataIndex ?? 0
        const header = `<div style="font-weight:600;margin-bottom:4px">${data[idx].day}日</div>`
        const rows = items
          .map(
            (item) =>
              `<div style="display:flex;justify-content:space-between;gap:12px">` +
              `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:4px;vertical-align:middle"></span>` +
              `<span>${EFFECT_LABELS[item.seriesName] ?? item.seriesName}</span>` +
              `<span style="font-weight:600;font-family:monospace;margin-left:auto">${toComma(item.value)}</span>` +
              `</div>`,
          )
          .join('')
        return header + rows
      },
    },
    legend: {
      ...standardLegend(theme),
      formatter: (name: string) => EFFECT_LABELS[name] ?? name,
    },
    xAxis: dayXAxis(data, theme),
    yAxis: yenValueAxis(theme),
    series: [
      {
        name: 'custEffect',
        type: 'bar' as const,
        stack: 'effect',
        data: data.map((d) => d.custEffect),
        itemStyle: { color: EFFECT_COLORS.custEffect, opacity: 0.8 },
        barMaxWidth: 16,
      },
      {
        name: 'ticketEffect',
        type: 'bar' as const,
        stack: 'effect',
        data: data.map((d) => d.ticketEffect),
        itemStyle: {
          color: EFFECT_COLORS.ticketEffect,
          opacity: 0.8,
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 16,
      },
    ],
  }
}

export const DecompDailyBarChart = memo(function DecompDailyBarChart({
  data,
}: {
  data: DailyDecompEntry[]
}) {
  const theme = useTheme() as AppTheme
  const option = useMemo(() => buildDecompDailyBarOption(data, theme), [data, theme])

  return (
    <ChartWrapper>
      <ChartTitle>日別 売上差の要因内訳</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})

// ─── DecompDowChart ─────────────────────────────────────

function buildDecompDowOption(
  data: DowDecompAvg[],
  dowColors: string[],
  theme: AppTheme,
): EChartsOption {
  const categories = data.map((d) => d.dow)

  const DOW_LABELS_MAP: Record<string, string> = {
    avgCustEffect: '客数効果',
    avgTicketEffect: '客単価効果',
    avgSalesDiff: '売上差',
  }

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
              `<span>${DOW_LABELS_MAP[item.seriesName] ?? item.seriesName}</span>` +
              `<span style="font-weight:600;font-family:monospace;margin-left:auto">${toComma(item.value)}</span>` +
              `</div>`,
          )
          .join('')
        return header + rows
      },
    },
    legend: {
      ...standardLegend(theme),
      formatter: (name: string) => DOW_LABELS_MAP[name] ?? name,
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
    yAxis: yenValueAxis(theme),
    series: [
      {
        name: 'avgCustEffect',
        type: 'bar' as const,
        data: data.map((d, i) => ({
          value: d.avgCustEffect,
          itemStyle: { color: dowColors[i], opacity: 0.7 },
        })),
        barMaxWidth: 28,
      },
      {
        name: 'avgTicketEffect',
        type: 'bar' as const,
        data: data.map((d, i) => ({
          value: d.avgTicketEffect,
          itemStyle: {
            color: dowColors[i],
            opacity: 0.4,
            borderRadius: [3, 3, 0, 0],
          },
        })),
        barMaxWidth: 28,
      },
    ],
  }
}

export const DecompDowChart = memo(function DecompDowChart({
  data,
  dowColors,
}: {
  data: DowDecompAvg[]
  dowColors: string[]
}) {
  const theme = useTheme() as AppTheme
  const option = useMemo(
    () => buildDecompDowOption(data, dowColors, theme),
    [data, dowColors, theme],
  )

  return (
    <ChartWrapper>
      <ChartTitle>曜日別 平均要因分解</ChartTitle>
      <EChart option={option} height={250} />
    </ChartWrapper>
  )
})
