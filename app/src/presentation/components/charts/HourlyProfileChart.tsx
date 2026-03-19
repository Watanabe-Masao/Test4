/**
 * 時間帯別売上プロファイルチャート (ECharts)
 *
 * パイプライン:
 *   DuckDB Hook → HourlyProfileChartLogic.ts → ECharts option → EChart
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import type { AppTheme } from '@/presentation/theme/theme'
import {
  useDuckDBHourlyProfile,
  useDuckDBWeatherHourlyAvg,
} from '@/application/hooks/useDuckDBQuery'
import { useSettingsStore } from '@/application/stores/settingsStore'
import {
  buildHourlyProfileData,
  mergeWeatherData,
  type HourlyProfileDataPoint,
} from './HourlyProfileChartLogic'
import { toPct } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { SummaryRow, SummaryItem } from './HourlyProfileChart.styles'
import { chartFontSize } from '@/presentation/theme/tokens'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

function buildOption(
  chartData: readonly HourlyProfileDataPoint[],
  hasWeatherData: boolean,
  theme: AppTheme,
): EChartsOption {
  const hours = chartData.map((d) => d.hourLabel)

  const yAxes: EChartsOption['yAxis'] = [
    {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => toPct(v, 0),
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
        fontFamily: theme.typography.fontFamily.mono,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' } },
    },
  ]

  if (hasWeatherData) {
    ;(yAxes as unknown[]).push({
      type: 'value',
      position: 'right',
      axisLabel: {
        formatter: (v: number) => `${v}°`,
        color: theme.colors.palette.orange,
        fontSize: chartFontSize.axis,
      },
      axisLine: { show: false },
      splitLine: { show: false },
    })
  }

  const series: EChartsOption['series'] = [
    {
      name: '構成比',
      type: 'line',
      data: chartData.map((d) => d.share),
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: `${theme.colors.palette.primary}66` },
            { offset: 1, color: `${theme.colors.palette.primary}0d` },
          ],
        },
      },
      lineStyle: { color: theme.colors.palette.primary, width: 2 },
      itemStyle: { color: theme.colors.palette.primary },
      symbolSize: 4,
      yAxisIndex: 0,
    },
    {
      name: 'ピーク',
      type: 'bar',
      data: chartData.map((d) => ({
        value: d.peakMarker,
        itemStyle: {
          color: d.isPeak ? theme.colors.palette.warning : 'transparent',
          opacity: d.isPeak ? 0.4 : 0,
        },
      })),
      barWidth: 16,
      yAxisIndex: 0,
    },
  ]

  if (hasWeatherData) {
    series.push({
      name: '平均気温',
      type: 'line',
      data: chartData.map((d) => d.avgTemp ?? null),
      lineStyle: { color: theme.colors.palette.orange, width: 1.5, type: 'dashed' },
      itemStyle: { color: theme.colors.palette.orange },
      symbolSize: 4,
      yAxisIndex: 1,
      connectNulls: true,
    })
  }

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis',
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number | null; name: string }[]
        if (!Array.isArray(items)) return ''
        const header = `<div style="font-weight:600;margin-bottom:4px">${items[0]?.name ?? ''}時</div>`
        const rows = items
          .filter((item) => item.value != null && item.value !== 0)
          .map((item) => {
            const val =
              item.seriesName === '平均気温'
                ? `${(item.value as number).toFixed(1)}°C`
                : toPct(item.value as number, 1)
            return `<div>${item.seriesName}: ${val}</div>`
          })
          .join('')
        return header + rows
      },
    },
    legend: standardLegend(theme),
    xAxis: {
      type: 'category',
      data: hours,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
        fontFamily: theme.typography.fontFamily.mono,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
    },
    yAxis: yAxes,
    series,
  }
}

export const HourlyProfileChart = memo(function HourlyProfileChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const theme = useTheme() as AppTheme
  const { messages } = useI18n()

  const {
    data: rows,
    error,
    isLoading,
  } = useDuckDBHourlyProfile(duckConn, duckDataVersion, currentDateRange, selectedStoreIds)

  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const weatherStoreId = useMemo(() => {
    const ids =
      selectedStoreIds.size > 0 ? Array.from(selectedStoreIds) : Object.keys(storeLocations)
    return ids.find((id) => storeLocations[id]) ?? ''
  }, [selectedStoreIds, storeLocations])
  const { data: weatherAvg } = useDuckDBWeatherHourlyAvg(
    duckConn,
    duckDataVersion,
    weatherStoreId,
    currentDateRange,
  )

  const { chartData, peakHours, top3Concentration, activeHoursCount } = useMemo(() => {
    if (!rows) return { chartData: [], peakHours: '', top3Concentration: 0, activeHoursCount: 0 }
    const result = buildHourlyProfileData(rows)
    return mergeWeatherData(result, weatherAvg ?? null)
  }, [rows, weatherAvg])

  const hasWeatherData = chartData.some((d) => d.avgTemp != null)
  const option = useMemo(
    () => buildOption(chartData, hasWeatherData, theme),
    [chartData, hasWeatherData, theme],
  )

  if (error) {
    return (
      <ChartCard title="時間帯別売上プロファイル">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }
  if (isLoading && !rows) {
    return (
      <ChartCard title="時間帯別売上プロファイル">
        <ChartLoading />
      </ChartCard>
    )
  }
  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return (
      <ChartCard title="時間帯別売上プロファイル">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  return (
    <ChartCard title="時間帯別売上プロファイル" subtitle="時間帯別売上構成比 | ★ = ピーク時間帯">
      <EChart option={option} height={300} ariaLabel="時間帯別売上プロファイルチャート" />
      <SummaryRow>
        <SummaryItem>ピーク時間帯: {peakHours}</SummaryItem>
        <SummaryItem>Top3集中度: {toPct(top3Concentration, 1)}</SummaryItem>
        <SummaryItem>営業時間帯数: {activeHoursCount}</SummaryItem>
      </SummaryRow>
    </ChartCard>
  )
})
