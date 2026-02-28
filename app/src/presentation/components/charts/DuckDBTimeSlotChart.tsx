/**
 * DuckDB 時間帯別売上チャート
 *
 * DuckDB の時間帯別集約クエリを使い、当年（棒）と前年（破線）の
 * 時間帯別売上を比較表示する。合計 / 日平均の切替が可能。
 *
 * 表示項目:
 * - 当年売上（棒グラフ）
 * - 前年売上（破線ライン）
 * - ピーク時間帯サマリー
 * - 前年比（ピーク時間帯）
 */
import { useState, useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBHourlyAggregation,
  useDuckDBDistinctDayCount,
  type HourlyAggregationRow,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, tooltipStyle, useCurrencyFormatter, toPct } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'

// ── Styled Components ──

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

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const ToggleGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`

const ToggleButton = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  font-size: 0.6rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : theme.colors.bg2};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text3)};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.85;
  }
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

const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

type Mode = 'total' | 'daily'

interface ChartDataPoint {
  readonly hour: string
  readonly hourNum: number
  readonly current: number
  readonly prevYear: number
}

interface SummaryInfo {
  readonly peakHour: number
  readonly peakAmount: number
  readonly prevYearPeakAmount: number
  readonly yoyRatio: number | null
}

// ── Constants ──

const HOUR_MIN = 6
const HOUR_MAX = 22

// ── Helpers ──

/** 前年の同日付範囲を構築する */
function buildPrevYearRange(range: DateRange): DateRange {
  return {
    from: {
      year: range.from.year - 1,
      month: range.from.month,
      day: range.from.day,
    },
    to: {
      year: range.to.year - 1,
      month: range.to.month,
      day: range.to.day,
    },
  }
}

/** 時間帯別行データ → hour をキーとする Map に変換 */
function toHourMap(rows: readonly HourlyAggregationRow[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const row of rows) {
    const prev = map.get(row.hour) ?? 0
    map.set(row.hour, prev + row.totalAmount)
  }
  return map
}

/** チャートデータとサマリーを構築する */
function buildChartData(
  currentRows: readonly HourlyAggregationRow[],
  prevRows: readonly HourlyAggregationRow[],
  mode: Mode,
  currentDayCount: number,
  prevDayCount: number,
): { chartData: ChartDataPoint[]; summary: SummaryInfo } {
  const curMap = toHourMap(currentRows)
  const prevMap = toHourMap(prevRows)

  const curDivisor = mode === 'daily' ? Math.max(currentDayCount, 1) : 1
  const prevDivisor = mode === 'daily' ? Math.max(prevDayCount, 1) : 1

  const chartData: ChartDataPoint[] = []
  let peakHour = HOUR_MIN
  let peakAmount = 0
  let prevYearPeakAmount = 0

  for (let h = HOUR_MIN; h <= HOUR_MAX; h++) {
    const curVal = Math.round((curMap.get(h) ?? 0) / curDivisor)
    const prevVal = Math.round((prevMap.get(h) ?? 0) / prevDivisor)

    chartData.push({
      hour: `${h}時`,
      hourNum: h,
      current: curVal,
      prevYear: prevVal,
    })

    if (curVal > peakAmount) {
      peakHour = h
      peakAmount = curVal
      prevYearPeakAmount = prevVal
    }
  }

  const yoyRatio = prevYearPeakAmount > 0 ? peakAmount / prevYearPeakAmount : null

  return {
    chartData,
    summary: { peakHour, peakAmount, prevYearPeakAmount, yoyRatio },
  }
}

// ── Component ──

export function DuckDBTimeSlotChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [mode, setMode] = useState<Mode>('total')

  // 前年の日付範囲を構築
  const prevYearRange = useMemo(() => buildPrevYearRange(currentDateRange), [currentDateRange])

  // 当年 時間帯別集約
  const { data: currentHourly, error } = useDuckDBHourlyAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    undefined,
    false,
  )

  // 前年 時間帯別集約
  const { data: prevHourly } = useDuckDBHourlyAggregation(
    duckConn,
    duckDataVersion,
    prevYearRange,
    selectedStoreIds,
    undefined,
    true,
  )

  // 当年 日数
  const { data: currentDayCount } = useDuckDBDistinctDayCount(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    false,
  )

  // 前年 日数
  const { data: prevDayCount } = useDuckDBDistinctDayCount(
    duckConn,
    duckDataVersion,
    prevYearRange,
    selectedStoreIds,
    true,
  )

  // チャートデータ構築
  const { chartData, summary } = useMemo(
    () =>
      currentHourly && prevHourly
        ? buildChartData(currentHourly, prevHourly, mode, currentDayCount ?? 1, prevDayCount ?? 1)
        : {
            chartData: [],
            summary: { peakHour: 0, peakAmount: 0, prevYearPeakAmount: 0, yoyRatio: null },
          },
    [currentHourly, prevHourly, mode, currentDayCount, prevDayCount],
  )

  if (error) {
    return (
      <Wrapper aria-label="時間帯別売上（DuckDB）">
        <Title>時間帯別売上（DuckDB）</Title>
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
    <Wrapper aria-label="時間帯別売上（DuckDB）">
      <HeaderRow>
        <div>
          <Title>時間帯別売上（DuckDB）</Title>
          <Subtitle>当年（棒） vs 前年（線） | 日平均切替可能</Subtitle>
        </div>
        <ToggleGroup role="tablist" aria-label="表示モード切替">
          <ToggleButton
            $active={mode === 'total'}
            onClick={() => setMode('total')}
            role="tab"
            aria-selected={mode === 'total'}
          >
            合計
          </ToggleButton>
          <ToggleButton
            $active={mode === 'daily'}
            onClick={() => setMode('daily')}
            role="tab"
            aria-selected={mode === 'daily'}
          >
            日平均
          </ToggleButton>
        </ToggleGroup>
      </HeaderRow>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="hour"
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
            formatter={(value: number | undefined, name?: string) => [
              value != null ? fmt(value) : '-',
              name ?? '',
            ]}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {/* 当年売上（棒グラフ） */}
          <Bar dataKey="current" name="当年" fill={palette.primary} opacity={0.8} barSize={14} />

          {/* 前年売上（破線ライン） */}
          <Line
            dataKey="prevYear"
            name="前年"
            stroke={palette.slate}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 2, fill: palette.slate }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      <SummaryRow>
        <SummaryItem>
          <SummaryLabel>ピーク時間帯:</SummaryLabel>
          {summary.peakHour}時
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>ピーク売上:</SummaryLabel>
          {fmt(summary.peakAmount)}
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>前年比（ピーク）:</SummaryLabel>
          {summary.yoyRatio != null ? toPct(summary.yoyRatio) : '-'}
        </SummaryItem>
      </SummaryRow>
    </Wrapper>
  )
}
