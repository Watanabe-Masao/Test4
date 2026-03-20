import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import type { StoreResult } from '@/domain/models/storeTypes'
import { calculateMarkupRate } from '@/domain/calculations/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import { STORE_COLORS } from '@/presentation/components/charts/chartTheme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
  standardLegend,
  toCommaYen,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { ChartWrapper, ChartTitle } from './CategoryPage.styles'

/** 店舗間カテゴリ比較バーチャート */
export const StoreComparisonCategoryBarChart = memo(function StoreComparisonCategoryBarChart({
  selectedResults,
  storeNames,
}: {
  selectedResults: StoreResult[]
  storeNames: Map<string, string>
}) {
  const theme = useTheme() as AppTheme

  const { categories, series } = useMemo(() => {
    const cats = CATEGORY_ORDER.filter((cat) =>
      selectedResults.some((sr) => sr.categoryTotals.has(cat)),
    )
    const categoryLabels = cats.map((cat) => CATEGORY_LABELS[cat])

    const seriesData = selectedResults.map((sr, i) => {
      const name = storeNames.get(sr.storeId) ?? sr.storeId
      const data = cats.map((cat) => {
        const pair = sr.categoryTotals.get(cat)
        return pair ? Math.abs(pair.price) : 0
      })
      return {
        type: 'bar' as const,
        name,
        data,
        itemStyle: { color: STORE_COLORS[i % STORE_COLORS.length], opacity: 0.8 },
        barMaxWidth: 30,
        itemStyle2: undefined,
      }
    })

    return { categories: categoryLabels, series: seriesData }
  }, [selectedResults, storeNames])

  const option = useMemo<EChartsOption>(
    () => ({
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const list = params as { seriesName: string; value: number; marker: string }[]
          const title = (list[0] as { axisValueLabel?: string }).axisValueLabel ?? ''
          const rows = list
            .map((p) => `${p.marker} ${p.seriesName}: ${toCommaYen(p.value)}`)
            .join('<br/>')
          return `${title}<br/>${rows}`
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
          formatter: (v: number) => toCommaYen(v),
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.mono,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
        },
      },
      series: series.map((s) => ({
        type: 'bar' as const,
        name: s.name,
        data: s.data,
        itemStyle: s.itemStyle,
        barMaxWidth: s.barMaxWidth,
      })),
    }),
    [categories, series, theme],
  )

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 カテゴリ別売価比較</ChartTitle>
      <EChart option={option} height={280} ariaLabel="店舗間カテゴリ別売価比較チャート" />
    </ChartWrapper>
  )
})

/** 店舗間値入率レーダーチャート */
export const StoreComparisonMarkupRadarChart = memo(function StoreComparisonMarkupRadarChart({
  selectedResults,
  storeNames,
}: {
  selectedResults: StoreResult[]
  storeNames: Map<string, string>
}) {
  const theme = useTheme() as AppTheme

  const { indicators, series } = useMemo(() => {
    const cats = CATEGORY_ORDER.filter((cat) =>
      selectedResults.some((sr) => sr.categoryTotals.has(cat)),
    )

    // Build markup matrix per store x category
    const markupMatrix = selectedResults.map((sr) =>
      cats.map((cat) => {
        const pair = sr.categoryTotals.get(cat)
        return pair ? calculateMarkupRate(pair.price - pair.cost, pair.price) * 100 : 0
      }),
    )

    const maxMarkup = Math.max(0, ...markupMatrix.flat())
    const radarMax = Math.ceil(maxMarkup / 10) * 10 || 100

    const seriesData = selectedResults.map((sr, i) => {
      const name = storeNames.get(sr.storeId) ?? sr.storeId
      return {
        name,
        value: markupMatrix[i],
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: STORE_COLORS[i % STORE_COLORS.length] },
      }
    })
    const indicatorData = cats.map((cat) => ({
      name: CATEGORY_LABELS[cat],
      max: radarMax,
    }))

    return { indicators: indicatorData, series: seriesData }
  }, [selectedResults, storeNames])

  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'item' as const,
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number[] }
          const rows = indicators
            .map((ind, i) => `${ind.name}: ${(p.value[i] ?? 0).toFixed(1)}%`)
            .join('<br/>')
          return `${p.name}<br/>${rows}`
        },
      },
      legend: standardLegend(theme),
      radar: {
        indicator: indicators,
        shape: 'polygon' as const,
        axisName: {
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.primary,
        },
        splitArea: { show: false },
        splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.4 } },
        axisLine: { lineStyle: { color: theme.colors.border, opacity: 0.4 } },
      },
      series: [
        {
          type: 'radar' as const,
          data: series,
        },
      ],
    }),
    [indicators, series, theme],
  )

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 カテゴリ別値入率レーダー</ChartTitle>
      <EChart option={option} height={280} ariaLabel="店舗間カテゴリ別値入率レーダーチャート" />
    </ChartWrapper>
  )
})
