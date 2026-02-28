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
import { useMemo } from 'react'
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBDailyCumulative,
  type DailyCumulativeRow,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, tooltipStyle, useCurrencyFormatter } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const Subtitle = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: 0.6rem;
`

const SummaryItem = styled.div`
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

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

export function DuckDBCumulativeChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const { data: rows, error } = useDuckDBDailyCumulative(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
  )

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

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return null
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
            tickFormatter={(v: number) => fmt(v)}
          />
          <YAxis
            yAxisId="cumulative"
            orientation="right"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => fmt(v)}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined) => [value != null ? fmt(value) : '-']}
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
}
