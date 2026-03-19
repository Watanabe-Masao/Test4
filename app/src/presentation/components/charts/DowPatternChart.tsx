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
import { useDuckDBDowPattern } from '@/application/hooks/useDuckDBQuery'
import { buildDowPatternData } from './DowPatternChartLogic'
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
        ? buildDowPatternData(rows)
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
