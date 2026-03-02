/**
 * DuckDB 曜日別売上パターンチャート (Group B1)
 *
 * DuckDB の曜日別集計クエリを使い、曜日ごとの平均売上と全曜日平均比の
 * インデックスを表示する。平均以上/以下で棒の色を分ける。
 *
 * 表示項目:
 * - 曜日別平均売上（棒グラフ、色分け）
 * - 全曜日平均ライン（ReferenceLine）
 * - 平均比インデックス（折れ線、右軸、%表示）
 * - サマリー行: 最強曜日 / 最弱曜日 / 週内変動率(CV)
 */
import { useMemo, memo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBDowPattern, type DowPatternRow } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, tooltipStyle, useCurrencyFormatter, toPct } from './chartTheme'
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

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

interface ChartDataPoint {
  readonly dow: number
  readonly label: string
  readonly avgSales: number
  readonly index: number
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

  // Build chart data with index (avgSales / overallAvg)
  const chartData: ChartDataPoint[] = dowEntries.map((e) => ({
    dow: e.dow,
    label: DOW_LABELS[e.dow],
    avgSales: e.avgSales,
    index: overallAvg > 0 ? e.avgSales / overallAvg : 0,
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

export const DuckDBDowPatternChart = memo(function DuckDBDowPatternChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const { data: rows, error } = useDuckDBDowPattern(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
  )

  const { chartData, overallAvg, strongestDow, weakestDow, cv } = useMemo(
    () =>
      rows
        ? buildChartData(rows)
        : { chartData: [], overallAvg: 0, strongestDow: '', weakestDow: '', cv: 0 },
    [rows],
  )

  if (error) {
    return (
      <Wrapper aria-label="曜日別売上パターン（DuckDB）">
        <Title>曜日別売上パターン（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return null
  }

  return (
    <Wrapper aria-label="曜日別売上パターン（DuckDB）">
      <Title>曜日別売上パターン（DuckDB）</Title>
      <Subtitle>曜日別平均売上 | 赤線 = 全曜日平均</Subtitle>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            yAxisId="sales"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => fmt(v)}
          />
          <YAxis
            yAxisId="index"
            orientation="right"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => toPct(v, 0)}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name?: string) => {
              if (value == null) return ['-']
              if (name === 'インデックス') return [toPct(value, 1)]
              return [fmt(value)]
            }}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {/* 曜日別平均売上（色分け棒グラフ） */}
          <Bar yAxisId="sales" dataKey="avgSales" name="平均売上" barSize={32}>
            {chartData.map((entry) => (
              <Cell
                key={entry.dow}
                fill={entry.avgSales >= overallAvg ? palette.primary : palette.slate}
              />
            ))}
          </Bar>

          {/* インデックス線（右軸） */}
          <Line
            yAxisId="index"
            dataKey="index"
            name="インデックス"
            stroke={palette.cyan}
            strokeWidth={2}
            dot={{ r: 3, fill: palette.cyan }}
          />

          {/* 全曜日平均ライン */}
          <ReferenceLine
            yAxisId="sales"
            y={overallAvg}
            stroke={palette.dangerDark}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            label={{
              value: `平均 ${fmt(overallAvg)}`,
              position: 'right',
              fontSize: ct.fontSize.xs,
              fill: palette.dangerDark,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <SummaryRow>
        <SummaryItem>最強曜日: {strongestDow}</SummaryItem>
        <SummaryItem>最弱曜日: {weakestDow}</SummaryItem>
        <SummaryItem>週内変動率: {toPct(cv, 1)}</SummaryItem>
      </SummaryRow>
    </Wrapper>
  )
})
