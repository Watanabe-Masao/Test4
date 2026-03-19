/**
 * 特徴量分析チャート (ECharts)
 *
 * パイプライン:
 *   DuckDB Hook → FeatureChartLogic.ts → ECharts option → EChart
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import type { AppTheme } from '@/presentation/theme/theme'
import { useDuckDBDailyFeatures } from '@/application/hooks/useDuckDBQuery'
import {
  buildFeatureChartData,
  Z_SCORE_THRESHOLD,
  type FeatureChartDataPoint,
} from './FeatureChartLogic'
import { useCurrencyFormatter } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import {
  yenYAxis,
  categoryXAxis,
  standardGrid,
  standardTooltip,
  standardLegend,
  toCommaYen,
} from './echartsOptionBuilders'
import { AnomalyGrid, AnomalyCard, AnomalyDate, AnomalyValue } from './FeatureChart.styles'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

function buildOption(chartData: readonly FeatureChartDataPoint[], theme: AppTheme): EChartsOption {
  const dates = chartData.map((d) => d.date)

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis',
      formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number | null; color: string }[]
        if (!Array.isArray(items) || items.length === 0) return ''
        const header = `<div style="font-weight:600;margin-bottom:4px">${(items[0] as { name?: string }).name ?? ''}</div>`
        const rows = items
          .filter((item) => item.value != null && item.value !== 0)
          .map(
            (item) =>
              `<div style="display:flex;justify-content:space-between;gap:12px">` +
              `<span>${item.seriesName}</span>` +
              `<span style="font-weight:600;font-family:monospace">${toCommaYen(item.value!)}</span>` +
              `</div>`,
          )
          .join('')
        return header + rows
      },
    },
    legend: standardLegend(theme),
    xAxis: categoryXAxis(dates, theme),
    yAxis: yenYAxis(theme),
    series: [
      {
        name: '異常検出',
        type: 'bar',
        data: chartData.map((d) => d.anomaly),
        itemStyle: { color: theme.colors.palette.dangerDark, opacity: 0.3 },
        barWidth: 8,
      },
      {
        name: '28日MA',
        type: 'line',
        data: chartData.map((d) => d.ma28),
        lineStyle: { color: theme.colors.palette.slate, width: 2, type: 'dashed' },
        itemStyle: { color: theme.colors.palette.slate },
        symbol: 'none',
        connectNulls: true,
      },
      {
        name: '7日MA',
        type: 'line',
        data: chartData.map((d) => d.ma7),
        lineStyle: { color: theme.colors.palette.cyan, width: 1.5, type: 'dashed' },
        itemStyle: { color: theme.colors.palette.cyan },
        symbol: 'none',
        connectNulls: true,
      },
      {
        name: '3日MA',
        type: 'line',
        data: chartData.map((d) => d.ma3),
        lineStyle: { color: theme.colors.palette.primary, width: 1.5 },
        itemStyle: { color: theme.colors.palette.primary },
        symbol: 'none',
        connectNulls: true,
      },
      {
        name: '売上実績',
        type: 'line',
        data: chartData.map((d) => d.sales),
        lineStyle: { color: theme.colors.palette.primary, width: 2 },
        itemStyle: { color: theme.colors.palette.primary },
        symbolSize: 4,
      },
    ],
  }
}

export const FeatureChart = memo(function FeatureChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const {
    data: features,
    isLoading,
    error,
  } = useDuckDBDailyFeatures(duckConn, duckDataVersion, currentDateRange, selectedStoreIds)

  const { chartData, anomalies } = useMemo(
    () => (features ? buildFeatureChartData(features) : { chartData: [], anomalies: [] }),
    [features],
  )

  const option = useMemo(() => buildOption(chartData, theme), [chartData, theme])

  if (error) {
    return (
      <ChartCard title="売上トレンド分析">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }

  if (isLoading && !features) {
    return (
      <ChartCard title="売上トレンド分析">
        <ChartLoading />
      </ChartCard>
    )
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return (
      <ChartCard title="売上トレンド分析">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="売上トレンド分析"
      subtitle={`移動平均（3日/7日/28日）・Zスコア異常検出 | 赤棒 = Z > ${Z_SCORE_THRESHOLD} の異常日`}
    >
      <EChart option={option} height={300} ariaLabel="売上トレンド分析チャート" />

      {anomalies.length > 0 && (
        <AnomalyGrid>
          {anomalies.map((a) => (
            <AnomalyCard key={a.date} $type={a.type}>
              <AnomalyDate>
                {a.date.slice(5)} {a.type === 'spike' ? 'spike' : 'dip'}
              </AnomalyDate>
              <AnomalyValue>
                {fmt(a.sales)} (z={a.zScore})
              </AnomalyValue>
            </AnomalyCard>
          ))}
        </AnomalyGrid>
      )}
    </ChartCard>
  )
})
