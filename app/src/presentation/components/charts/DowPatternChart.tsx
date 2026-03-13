/**
 * 曜日別売上パターンチャート (Group B1)
 *
 * 曜日別集計クエリを使い、曜日ごとの平均売上を表示する。
 * 平均以上/以下で棒の濃度を分ける。
 *
 * 表示項目:
 * - 曜日別平均売上（棒グラフ、opacity 色分け）
 * - 全曜日平均ライン（ReferenceLine）
 * - サマリー行: 最多曜日 / 最少曜日 / 全曜日平均 / CV
 */
import { useMemo, memo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBDowPattern, type DowPatternRow } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toPct, toAxisYen } from './chartTheme'
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
} from './DowPatternChart.styles'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

interface ChartDataPoint {
  readonly dow: number
  readonly label: string
  readonly avgSales: number
}

interface DowSummary {
  readonly chartData: ChartDataPoint[]
  readonly overallAvg: number
  readonly strongestDow: string
  readonly weakestDow: string
  readonly cv: number
}

function buildChartData(rows: readonly DowPatternRow[]): DowSummary {
  // Aggregate all stores: sum avgSales per dow
  const dowMap = new Map<number, number>()
  for (const row of rows) {
    dowMap.set(row.dow, (dowMap.get(row.dow) ?? 0) + row.avgSales)
  }

  // Build sorted array by dow (0=Sun through 6=Sat)
  const dowEntries: { dow: number; avgSales: number }[] = []
  for (let d = 0; d < 7; d++) {
    const sales = dowMap.get(d)
    if (sales != null) {
      dowEntries.push({ dow: d, avgSales: Math.round(sales) })
    }
  }

  // Calculate overall average across all days of week
  const totalSales = dowEntries.reduce((sum, e) => sum + e.avgSales, 0)
  const overallAvg = dowEntries.length > 0 ? totalSales / dowEntries.length : 0

  const chartData: ChartDataPoint[] = dowEntries.map((e) => ({
    dow: e.dow,
    label: DOW_LABELS[e.dow],
    avgSales: e.avgSales,
  }))

  // Find strongest / weakest
  let strongestDow = ''
  let weakestDow = ''
  let maxSales = -Infinity
  let minSales = Infinity
  for (const point of chartData) {
    if (point.avgSales > maxSales) {
      maxSales = point.avgSales
      strongestDow = point.label
    }
    if (point.avgSales < minSales) {
      minSales = point.avgSales
      weakestDow = point.label
    }
  }

  // CV = stddev / mean
  const mean = overallAvg
  const variance =
    chartData.length > 0
      ? chartData.reduce((sum, p) => sum + (p.avgSales - mean) ** 2, 0) / chartData.length
      : 0
  const stddev = Math.sqrt(variance)
  const cv = mean > 0 ? stddev / mean : 0

  return { chartData, overallAvg: Math.round(overallAvg), strongestDow, weakestDow, cv }
}

export const DowPatternChart = memo(function DowPatternChart({
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
  } = useDuckDBDowPattern(duckConn, duckDataVersion, currentDateRange, selectedStoreIds)

  const { chartData, overallAvg, strongestDow, weakestDow, cv } = useMemo(
    () =>
      rows
        ? buildChartData(rows)
        : { chartData: [], overallAvg: 0, strongestDow: '', weakestDow: '', cv: 0 },
    [rows],
  )

  if (error) {
    return (
      <Wrapper aria-label="曜日別売上パターン">
        <Title>曜日別売上パターン</Title>
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

  return (
    <Wrapper aria-label="曜日別売上パターン">
      <Title>曜日別売上パターン</Title>
      <Subtitle>
        {strongestDow}曜に売上が集中しています（CV {toPct(cv, 1)}）
      </Subtitle>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={toAxisYen}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value: unknown) => {
                if (value == null) return ['-', null]
                return [fmt(Number(value)), null]
              },
            })}
          />

          <Bar dataKey="avgSales" name="平均売上" barSize={32}>
            {chartData.map((entry) => (
              <Cell
                key={entry.dow}
                fill={palette.primary}
                fillOpacity={entry.avgSales >= overallAvg ? 1 : 0.5}
              />
            ))}
          </Bar>

          <ReferenceLine
            y={overallAvg}
            stroke={palette.dangerDark}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            label={{
              value: '全曜日平均',
              position: 'right',
              fontSize: ct.fontSize.xs,
              fill: palette.dangerDark,
            }}
          />
        </BarChart>
      </ResponsiveContainer>

      <SummaryRow>
        <SummaryItem>最多: {strongestDow}曜</SummaryItem>
        <SummaryItem>最少: {weakestDow}曜</SummaryItem>
        <SummaryItem>全曜日平均: {fmt(overallAvg)}</SummaryItem>
        <SummaryItem>CV: {toPct(cv, 1)}</SummaryItem>
      </SummaryRow>
    </Wrapper>
  )
})
