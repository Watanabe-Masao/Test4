/**
 * 曜日別売上パターンチャート (ECharts)
 *
 * パイプライン:
 *   DuckDB Hook → DowPatternChartLogic.ts → ECharts option → EChart
 */
import { useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import type { AppTheme } from '@/presentation/theme/theme'
import { useDuckDBDowPattern } from '@/application/hooks/useDuckDBQuery'
import { buildDowPatternData, type DowChartDataPoint } from './DowPatternChartLogic'
import { useCurrencyFormatter, toPct } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import {
  yenYAxis,
  categoryXAxis,
  standardGrid,
  standardTooltip,
  toCommaYen,
} from './echartsOptionBuilders'
import { SummaryRow, SummaryItem } from './DowPatternChart.styles'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

function buildOption(
  chartData: readonly DowChartDataPoint[],
  overallAvg: number,
  theme: AppTheme,
): EChartsOption {
  const labels = chartData.map((d) => d.label)
  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis',
      formatter: (params: unknown) => {
        const items = params as { name: string; value: number }[]
        if (!Array.isArray(items) || items.length === 0) return ''
        return `${items[0].name}曜日<br/>平均売上: ${toCommaYen(items[0].value)}`
      },
    },
    xAxis: categoryXAxis(labels, theme),
    yAxis: yenYAxis(theme),
    series: [
      {
        name: '平均売上',
        type: 'bar',
        data: chartData.map((d) => ({
          value: d.avgSales,
          itemStyle: {
            color: theme.colors.palette.primary,
            opacity: d.avgSales >= overallAvg ? 1 : 0.5,
          },
        })),
        barWidth: 32,
      },
    ],
    markLine: undefined,
  }
}

export const DowPatternChart = memo(function DowPatternChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const {
    data: rows,
    error,
    isLoading,
  } = useDuckDBDowPattern(duckConn, duckDataVersion, currentDateRange, selectedStoreIds)

  const { chartData, overallAvg, strongestDow, weakestDow, cv } = useMemo(
    () =>
      rows
        ? buildDowPatternData(rows)
        : { chartData: [], overallAvg: 0, strongestDow: '', weakestDow: '', cv: 0 },
    [rows],
  )

  const option = useMemo(
    () => buildOption(chartData, overallAvg, theme),
    [chartData, overallAvg, theme],
  )

  if (error) {
    return (
      <ChartCard title="曜日別売上パターン">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }

  if (isLoading && !rows) {
    return (
      <ChartCard title="曜日別売上パターン">
        <ChartLoading />
      </ChartCard>
    )
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return (
      <ChartCard title="曜日別売上パターン">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="曜日別売上パターン"
      subtitle={`${strongestDow}曜に売上が集中しています（CV ${toPct(cv, 1)}）`}
    >
      <EChart option={option} height={300} ariaLabel="曜日別売上パターンチャート" />

      <SummaryRow>
        <SummaryItem>最多: {strongestDow}曜</SummaryItem>
        <SummaryItem>最少: {weakestDow}曜</SummaryItem>
        <SummaryItem>全曜日平均: {fmt(overallAvg)}</SummaryItem>
        <SummaryItem>CV: {toPct(cv, 1)}</SummaryItem>
      </SummaryRow>
    </ChartCard>
  )
})
