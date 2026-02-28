/**
 * DuckDB 時間帯別売上プロファイルチャート (Group B2)
 *
 * DuckDB の時間帯別集計クエリを使い、時間帯ごとの売上構成比を
 * エリアチャートで表示する。ピーク時間帯（Top3）はハイライト表示。
 *
 * 表示項目:
 * - 時間帯別売上構成比（エリアチャート、グラデーション）
 * - ピーク時間帯（hourRank <= 3）のハイライト
 * - サマリー行: ピーク時間帯 / Top3集中度 / 営業時間帯数
 */
import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBHourlyProfile, type HourlyProfileRow } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, tooltipStyle, toPct } from './chartTheme'
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
  readonly hour: number
  readonly hourLabel: string
  readonly share: number
  readonly isPeak: boolean
  readonly peakMarker: number
}

interface HourlySummary {
  readonly chartData: ChartDataPoint[]
  readonly peakHours: string
  readonly top3Concentration: number
  readonly activeHoursCount: number
}

function buildChartData(rows: readonly HourlyProfileRow[]): HourlySummary {
  // Aggregate all stores: sum totalAmount per hour
  const hourMap = new Map<number, number>()
  for (const row of rows) {
    hourMap.set(row.hour, (hourMap.get(row.hour) ?? 0) + row.totalAmount)
  }

  // Recalculate hourShare from aggregated totals
  const grandTotal = [...hourMap.values()].reduce((sum, v) => sum + v, 0)

  // Build entries sorted by hour
  const entries: { hour: number; totalAmount: number; share: number }[] = []
  for (const [hour, amount] of hourMap) {
    entries.push({
      hour,
      totalAmount: amount,
      share: grandTotal > 0 ? amount / grandTotal : 0,
    })
  }
  entries.sort((a, b) => a.hour - b.hour)

  // Rank by share descending to determine peaks
  const ranked = [...entries].sort((a, b) => b.share - a.share)
  const peakHourSet = new Set(ranked.slice(0, 3).map((e) => e.hour))

  // Build chart data
  const chartData: ChartDataPoint[] = entries.map((e) => ({
    hour: e.hour,
    hourLabel: String(e.hour),
    share: e.share,
    isPeak: peakHourSet.has(e.hour),
    peakMarker: peakHourSet.has(e.hour) ? e.share : 0,
  }))

  // Peak hours label (sorted chronologically)
  const peakHoursSorted = [...peakHourSet].sort((a, b) => a - b)
  const peakHours = peakHoursSorted.map((h) => `${h}時`).join(', ')

  // Top3 concentration
  const top3Concentration = ranked.slice(0, 3).reduce((sum, e) => sum + e.share, 0)

  // Active hours count (hours with any sales)
  const activeHoursCount = entries.filter((e) => e.totalAmount > 0).length

  return { chartData, peakHours, top3Concentration, activeHoursCount }
}

export function DuckDBHourlyProfileChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const { messages } = useI18n()

  const { data: rows, error } = useDuckDBHourlyProfile(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
  )

  const { chartData, peakHours, top3Concentration, activeHoursCount } = useMemo(
    () =>
      rows
        ? buildChartData(rows)
        : { chartData: [], peakHours: '', top3Concentration: 0, activeHoursCount: 0 },
    [rows],
  )

  if (error) {
    return (
      <Wrapper aria-label="時間帯別売上プロファイル（DuckDB）">
        <Title>時間帯別売上プロファイル（DuckDB）</Title>
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
    <Wrapper aria-label="時間帯別売上プロファイル（DuckDB）">
      <Title>時間帯別売上プロファイル（DuckDB）</Title>
      <Subtitle>時間帯別売上構成比 | &#9733; = ピーク時間帯</Subtitle>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <defs>
            <linearGradient id="hourlyShareGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={palette.primary} stopOpacity={0.4} />
              <stop offset="95%" stopColor={palette.primary} stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="hourLabel"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => toPct(v, 0)}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name?: string) => {
              if (value == null) return ['-']
              if (name === 'ピーク') return [toPct(value, 1)]
              return [toPct(value, 1)]
            }}
            labelFormatter={(label: unknown) => `${String(label)}時`}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {/* 売上構成比エリア（グラデーション） */}
          <Area
            dataKey="share"
            name="構成比"
            fill="url(#hourlyShareGradient)"
            stroke={palette.primary}
            strokeWidth={2}
            dot={{ r: 2, fill: palette.primary }}
          />

          {/* ピーク時間帯ハイライト（棒） */}
          <Bar dataKey="peakMarker" name="ピーク" barSize={16}>
            {chartData.map((entry) => (
              <Cell
                key={entry.hour}
                fill={entry.isPeak ? palette.warning : 'transparent'}
                fillOpacity={entry.isPeak ? 0.4 : 0}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      <SummaryRow>
        <SummaryItem>ピーク時間帯: {peakHours}</SummaryItem>
        <SummaryItem>Top3集中度: {toPct(top3Concentration, 1)}</SummaryItem>
        <SummaryItem>営業時間帯数: {activeHoursCount}</SummaryItem>
      </SummaryRow>
    </Wrapper>
  )
}
