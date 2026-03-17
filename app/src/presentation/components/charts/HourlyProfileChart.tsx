/**
 * 時間帯別売上プロファイルチャート (Group B2)
 *
 * 時間帯別集計クエリを使い、時間帯ごとの売上構成比を
 * エリアチャートで表示する。ピーク時間帯（Top3）はハイライト表示。
 *
 * 表示項目:
 * - 時間帯別売上構成比（エリアチャート、グラデーション）
 * - ピーク時間帯（hourRank <= 3）のハイライト
 * - サマリー行: ピーク時間帯 / Top3集中度 / 営業時間帯数
 */
import { useMemo, memo } from 'react'
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBHourlyProfile,
  useDuckDBWeatherHourlyAvg,
  type HourlyProfileRow,
} from '@/application/hooks/useDuckDBQuery'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useChartTheme, toPct } from './chartTheme'
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
} from './HourlyProfileChart.styles'

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
  readonly avgTemp?: number
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

export const HourlyProfileChart = memo(function HourlyProfileChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const { messages } = useI18n()

  const {
    data: rows,
    error,
    isLoading,
  } = useDuckDBHourlyProfile(duckConn, duckDataVersion, currentDateRange, selectedStoreIds)

  // ── 天気データ（時間帯別平均気温） ──
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const weatherStoreId = useMemo(() => {
    const ids =
      selectedStoreIds.size > 0 ? Array.from(selectedStoreIds) : Object.keys(storeLocations)
    return ids.find((id) => storeLocations[id]) ?? ''
  }, [selectedStoreIds, storeLocations])
  const { data: weatherAvg } = useDuckDBWeatherHourlyAvg(
    duckConn,
    duckDataVersion,
    weatherStoreId,
    currentDateRange,
  )

  const { chartData, peakHours, top3Concentration, activeHoursCount } = useMemo(() => {
    if (!rows) return { chartData: [], peakHours: '', top3Concentration: 0, activeHoursCount: 0 }
    const result = buildChartData(rows)
    // 天気平均気温をマージ
    if (weatherAvg && weatherAvg.length > 0) {
      const tempMap = new Map(weatherAvg.map((w) => [w.hour, w.avgTemperature]))
      return {
        ...result,
        chartData: result.chartData.map((d) => ({
          ...d,
          avgTemp:
            tempMap.get(d.hour) != null ? Math.round(tempMap.get(d.hour)! * 10) / 10 : undefined,
        })),
      }
    }
    return result
  }, [rows, weatherAvg])

  const hasWeatherData = chartData.some((d) => d.avgTemp != null)

  if (error) {
    return (
      <Wrapper aria-label="時間帯別売上プロファイル">
        <Title>時間帯別売上プロファイル</Title>
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
    <Wrapper aria-label="時間帯別売上プロファイル">
      <Title>時間帯別売上プロファイル</Title>
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
            yAxisId="left"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => toPct(v, 0)}
          />
          {hasWeatherData && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: ct.fontSize.xs, fill: '#f97316' }}
              stroke="#f97316"
              tickFormatter={(v: number) => `${v}°`}
            />
          )}
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value: unknown, name: string) => {
                if (value == null) return ['-', null]
                const v = value as number
                if (name === '平均気温') return [`${v.toFixed(1)}°C`, null]
                if (name === 'ピーク') return [toPct(v, 1), null]
                return [toPct(v, 1), null]
              },
              labelFormatter: (label: unknown) => `${String(label)}時`,
            })}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {/* 売上構成比エリア（グラデーション） */}
          <Area
            yAxisId="left"
            dataKey="share"
            name="構成比"
            fill="url(#hourlyShareGradient)"
            stroke={palette.primary}
            strokeWidth={2}
            dot={{ r: 2, fill: palette.primary }}
          />

          {/* ピーク時間帯ハイライト（棒） */}
          <Bar yAxisId="left" dataKey="peakMarker" name="ピーク" barSize={16}>
            {chartData.map((entry) => (
              <Cell
                key={entry.hour}
                fill={entry.isPeak ? palette.warning : 'transparent'}
                fillOpacity={entry.isPeak ? 0.4 : 0}
              />
            ))}
          </Bar>

          {/* 平均気温ライン（第2軸: オレンジ） */}
          {hasWeatherData && (
            <Line
              yAxisId="right"
              dataKey="avgTemp"
              name="平均気温"
              stroke="#f97316"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={{ r: 2, fill: '#f97316' }}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <SummaryRow>
        <SummaryItem>ピーク時間帯: {peakHours}</SummaryItem>
        <SummaryItem>Top3集中度: {toPct(top3Concentration, 1)}</SummaryItem>
        <SummaryItem>営業時間帯数: {activeHoursCount}</SummaryItem>
      </SummaryRow>
    </Wrapper>
  )
})
