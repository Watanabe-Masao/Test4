/**
 * DuckDB 前年比較チャート
 *
 * DuckDB の YoY JOIN クエリを使い、当年 vs 前年の日別売上比較を表示する。
 * 月跨ぎクエリに対応しているため、自由な日付範囲で前年比較が可能。
 *
 * 表示項目:
 * - 当年売上線
 * - 前年売上線（破線）
 * - 差分棒グラフ（正=プラス成長、負=マイナス成長）
 */
import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBYoyDaily, type YoyDailyRow } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, tooltipStyle, useCurrencyFormatter, toPct } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'

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
  flex-wrap: wrap;
`

const SummaryItem = styled.div<{ $accent?: string }>`
  color: ${({ $accent, theme }) => $accent ?? theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly prevYearDateRange: DateRange | undefined
  readonly selectedStoreIds: ReadonlySet<string>
}

interface ChartDataPoint {
  readonly date: string
  readonly curSales: number
  readonly prevSales: number | null
  readonly diff: number
}

function buildChartData(rows: readonly YoyDailyRow[]): ChartDataPoint[] {
  // 日別に店舗合算
  // FULL OUTER JOIN のため curDateKey が null になりうる（前年のみ存在する行）
  const dailyMap = new Map<string, { curSales: number; prevSales: number; hasPrev: boolean }>()

  for (const row of rows) {
    if (!row.curDateKey) continue // 前年のみの行はスキップ（当年軸でプロット不可）
    const existing = dailyMap.get(row.curDateKey) ?? {
      curSales: 0,
      prevSales: 0,
      hasPrev: false,
    }
    existing.curSales += row.curSales
    if (row.prevSales != null) {
      existing.prevSales += row.prevSales
      existing.hasPrev = true
    }
    dailyMap.set(row.curDateKey, existing)
  }

  return [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, d]) => ({
      date: dateKey.slice(5),
      curSales: Math.round(d.curSales),
      prevSales: d.hasPrev ? Math.round(d.prevSales) : null,
      diff: Math.round(d.curSales - d.prevSales),
    }))
}

export function DuckDBYoYChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  prevYearDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()

  const { data: rows } = useDuckDBYoyDaily(
    duckConn,
    duckDataVersion,
    currentDateRange,
    prevYearDateRange,
    selectedStoreIds,
  )

  const chartData = useMemo(() => (rows ? buildChartData(rows) : []), [rows])

  if (!duckConn || duckDataVersion === 0 || !prevYearDateRange || chartData.length === 0) {
    return null
  }

  // サマリー計算
  const totalCur = chartData.reduce((s, d) => s + d.curSales, 0)
  const totalPrev = chartData.reduce((s, d) => s + (d.prevSales ?? 0), 0)
  const totalDiff = totalCur - totalPrev
  const growthRate = totalPrev > 0 ? toPct(totalDiff / totalPrev, 1) : '-'

  return (
    <Wrapper>
      <Title>前年比較（DuckDB）</Title>
      <Subtitle>当年 vs 前年 日別売上 | 月跨ぎ対応 | 棒 = 前年差</Subtitle>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => fmt(v)}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined) => [value != null ? fmt(value) : '-']}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {/* 前年差（棒グラフ） */}
          <Bar dataKey="diff" name="前年差" fill={palette.success} opacity={0.4} barSize={6} />

          {/* 前年売上（破線） */}
          <Line
            dataKey="prevSales"
            name="前年売上"
            stroke={palette.slate}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            connectNulls
          />

          {/* 当年売上 */}
          <Line
            dataKey="curSales"
            name="当年売上"
            stroke={ct.colors.primary}
            strokeWidth={2}
            dot={{ r: 2, fill: ct.colors.primary }}
          />

          <ReferenceLine y={0} stroke={ct.grid} />
        </ComposedChart>
      </ResponsiveContainer>

      <SummaryRow>
        <SummaryItem>当年計: {fmt(totalCur)}</SummaryItem>
        <SummaryItem>前年計: {fmt(totalPrev)}</SummaryItem>
        <SummaryItem $accent={totalDiff >= 0 ? palette.success : palette.danger}>
          差分: {totalDiff >= 0 ? '+' : ''}
          {fmt(totalDiff)} ({growthRate})
        </SummaryItem>
      </SummaryRow>
    </Wrapper>
  )
}
