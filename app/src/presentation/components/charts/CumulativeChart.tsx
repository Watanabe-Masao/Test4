/**
 * DuckDB 月跨ぎ累積売上チャート
 *
 * DuckDB の日別累積クエリを使い、複数月にわたる累積売上の推移を表示する。
 * 単月ではなく、IndexedDB に保存されている全月のデータを横断表示できる。
 *
 * 表示項目:
 * - 日別売上（棒グラフ）
 * - 累積売上（面グラフ）
 */
import { useMemo, memo } from 'react'
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBDailyCumulative,
  type DailyCumulativeRow,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toAxisYen } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import {
  Wrapper,
  Title,
  Subtitle,
  SummaryRow,
  SummaryItem,
  ErrorMsg,
} from './CumulativeChart.styles'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

interface ChartDataPoint {
  readonly date: string
  readonly daily: number
  readonly cumulative: number
}

function buildChartData(rows: readonly DailyCumulativeRow[]): ChartDataPoint[] {
  return rows.map((r) => ({
    date: r.dateKey.slice(5), // MM-DD
    daily: Math.round(r.dailySales),
    cumulative: Math.round(r.cumulativeSales),
  }))
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

  const chartData = useMemo(() => (rows ? buildChartData(rows) : []), [rows])

  if (error) {
    return (
      <Wrapper aria-label="累積売上推移（DuckDB）">
        <Title>累積売上推移（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !rows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  const totalSales = chartData[chartData.length - 1]?.cumulative ?? 0
  const avgDaily = chartData.length > 0 ? Math.round(totalSales / chartData.length) : 0

  return (
    <Wrapper aria-label="累積売上推移（DuckDB）">
      <Title>累積売上推移（DuckDB）</Title>
      <Subtitle>日別売上（棒）と累積売上（面）| 月跨ぎ対応</Subtitle>

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

          <Area
            yAxisId="cumulative"
            dataKey="cumulative"
            name="累積売上"
            fill={palette.primary}
            fillOpacity={0.1}
            stroke={palette.primary}
            strokeWidth={2}
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
        <SummaryItem>累計: {fmt(totalSales)}</SummaryItem>
        <SummaryItem>日平均: {fmt(avgDaily)}</SummaryItem>
        <SummaryItem>対象日数: {chartData.length}日</SummaryItem>
      </SummaryRow>
    </Wrapper>
  )
})
