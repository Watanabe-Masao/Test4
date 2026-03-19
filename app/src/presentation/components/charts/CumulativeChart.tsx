/**
 * 月跨ぎ累積売上チャート
 *
 * 日別累積クエリを使い、複数月にわたる累積売上の推移を表示する。
 * 単月ではなく、IndexedDB に保存されている全月のデータを横断表示できる。
 *
 * 表示項目:
 * - 日別売上（棒グラフ）
 * - 累積売上（線グラフ）
 */
import { useMemo, memo } from 'react'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBDailyCumulative } from '@/application/hooks/useDuckDBQuery'
import { buildCumulativeChartData, computeCumulativeSummary } from './CumulativeChartLogic'
import { useChartTheme, useCurrencyFormatter, toAxisYen } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { SummaryRow, SummaryItem } from './CumulativeChart.styles'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

export const CumulativeChart = memo(function CumulativeChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const {
    data: rows,
    error,
    isLoading,
  } = useDuckDBDailyCumulative(duckConn, duckDataVersion, currentDateRange, selectedStoreIds)

  const chartData = useMemo(() => (rows ? buildCumulativeChartData(rows) : []), [rows])
  const summary = useMemo(() => computeCumulativeSummary(chartData), [chartData])
  const subtitle =
    summary.dayCount > 0
      ? `累計 ${fmt(summary.totalSales)} | 日平均 ${fmt(summary.avgDaily)} | ${summary.dayCount}日経過`
      : undefined

  if (error) {
    return (
      <ChartCard title="売上進捗">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }

  if (isLoading && !rows) {
    return (
      <ChartCard title="売上進捗">
        <ChartLoading />
      </ChartCard>
    )
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return (
      <ChartCard title="売上進捗">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  return (
    <ChartCard title="売上進捗" subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            yAxisId="daily"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={toAxisYen}
          />
          <YAxis
            yAxisId="cumulative"
            orientation="right"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={toAxisYen}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value: unknown) => [value != null ? fmt(Number(value)) : '-', null],
            })}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          <Line
            yAxisId="cumulative"
            dataKey="cumulative"
            name="累積売上"
            stroke={palette.primary}
            strokeWidth={2}
            dot={false}
          />
          <Bar
            yAxisId="daily"
            dataKey="daily"
            name="日別売上"
            fill={palette.cyan}
            opacity={0.6}
            barSize={6}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <SummaryRow>
        <SummaryItem>累計: {fmt(summary.totalSales)}</SummaryItem>
        <SummaryItem>日平均: {fmt(summary.avgDaily)}</SummaryItem>
        <SummaryItem>対象日数: {summary.dayCount}日</SummaryItem>
      </SummaryRow>
    </ChartCard>
  )
})
