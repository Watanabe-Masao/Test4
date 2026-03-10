/**
 * 特徴量分析チャート
 *
 * ウィンドウ関数を使い、日別売上の移動平均・Zスコア・スパイク比率を
 * リアルタイムに算出して表示する。データが未準備の場合は非表示。
 *
 * 表示項目:
 * - 日別売上実績線
 * - 3日/7日/28日移動平均線
 * - Zスコアによる異常検出マーカー
 * - スパイク比率のグラデーション背景
 */
import { useMemo, memo } from 'react'
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
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBDailyFeatures, type DailyFeatureRow } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toAxisYen } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import {
  Wrapper,
  Title,
  Subtitle,
  AnomalyGrid,
  AnomalyCard,
  AnomalyDate,
  AnomalyValue,
  ErrorMsg,
} from './FeatureChart.styles'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

interface ChartDataPoint {
  readonly date: string
  readonly sales: number
  readonly ma3: number | null
  readonly ma7: number | null
  readonly ma28: number | null
  readonly zScore: number | null
  readonly anomaly: number
}

interface AnomalyInfo {
  readonly date: string
  readonly sales: number
  readonly zScore: number
  readonly type: 'spike' | 'dip'
}

/** Z_SCORE_THRESHOLD 以上の絶対値を異常とみなす */
const Z_SCORE_THRESHOLD = 2.0

function buildChartData(features: readonly DailyFeatureRow[]): {
  chartData: ChartDataPoint[]
  anomalies: AnomalyInfo[]
} {
  // 全店舗の売上を日別に合算
  const dailyMap = new Map<
    string,
    { sales: number; ma3: number; ma7: number; ma28: number; zSum: number; count: number }
  >()

  for (const row of features) {
    const existing = dailyMap.get(row.dateKey) ?? {
      sales: 0,
      ma3: 0,
      ma7: 0,
      ma28: 0,
      zSum: 0,
      count: 0,
    }
    existing.sales += row.sales
    existing.ma3 += row.salesMa3 ?? 0
    existing.ma7 += row.salesMa7 ?? 0
    existing.ma28 += row.salesMa28 ?? 0
    if (row.zScore != null) {
      existing.zSum += row.zScore
      existing.count += 1
    }
    dailyMap.set(row.dateKey, existing)
  }

  const chartData: ChartDataPoint[] = []
  const anomalies: AnomalyInfo[] = []

  const sortedKeys = [...dailyMap.keys()].sort()
  for (const dateKey of sortedKeys) {
    const d = dailyMap.get(dateKey)!
    const avgZ = d.count > 0 ? d.zSum / d.count : null
    const isAnomaly = avgZ != null && Math.abs(avgZ) >= Z_SCORE_THRESHOLD

    chartData.push({
      date: dateKey.slice(5), // MM-DD
      sales: Math.round(d.sales),
      ma3: d.ma3 > 0 ? Math.round(d.ma3) : null,
      ma7: d.ma7 > 0 ? Math.round(d.ma7) : null,
      ma28: d.ma28 > 0 ? Math.round(d.ma28) : null,
      zScore: avgZ != null ? Math.round(avgZ * 100) / 100 : null,
      anomaly: isAnomaly ? Math.round(d.sales) : 0,
    })

    if (isAnomaly) {
      anomalies.push({
        date: dateKey,
        sales: Math.round(d.sales),
        zScore: Math.round(avgZ * 100) / 100,
        type: avgZ > 0 ? 'spike' : 'dip',
      })
    }
  }

  return { chartData, anomalies }
}

export const FeatureChart = memo(function FeatureChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const {
    data: features,
    isLoading,
    error,
  } = useDuckDBDailyFeatures(duckConn, duckDataVersion, currentDateRange, selectedStoreIds)

  const { chartData, anomalies } = useMemo(
    () => (features ? buildChartData(features) : { chartData: [], anomalies: [] }),
    [features],
  )

  if (error) {
    return (
      <Wrapper aria-label="売上トレンド分析">
        <Title>売上トレンド分析</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !features) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="売上トレンド分析">
      <Title>売上トレンド分析</Title>
      <Subtitle>
        移動平均（3日/7日/28日）・Zスコア異常検出 | 赤棒 = Z &gt; {Z_SCORE_THRESHOLD} の異常日
      </Subtitle>

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
            tickFormatter={toAxisYen}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value: unknown) => [value != null ? fmt(Number(value)) : '-', null],
            })}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {/* 異常日マーカー（棒グラフ） */}
          <Bar
            dataKey="anomaly"
            name="異常検出"
            fill={palette.dangerDark}
            opacity={0.3}
            barSize={8}
          />

          {/* 28日移動平均（太い背景線） */}
          <Line
            dataKey="ma28"
            name="28日MA"
            stroke={palette.slate}
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={false}
            connectNulls
          />

          {/* 7日移動平均 */}
          <Line
            dataKey="ma7"
            name="7日MA"
            stroke={palette.cyan}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            connectNulls
          />

          {/* 3日移動平均 */}
          <Line
            dataKey="ma3"
            name="3日MA"
            stroke={palette.primary}
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />

          {/* 実績売上 */}
          <Line
            dataKey="sales"
            name="売上実績"
            stroke={ct.colors.primary}
            strokeWidth={2}
            dot={{ r: 2, fill: ct.colors.primary }}
          />

          {/* ゼロライン */}
          <ReferenceLine y={0} stroke={ct.grid} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* 異常検出サマリー */}
      {anomalies.length > 0 && (
        <AnomalyGrid>
          {anomalies.map((a) => (
            <AnomalyCard key={a.date} $type={a.type}>
              <AnomalyDate>
                {a.date.slice(5)} {a.type === 'spike' ? 'spike' : 'dip'}
              </AnomalyDate>
              <AnomalyValue>
                {fmt(a.sales)} (z={a.zScore})
              </AnomalyValue>
            </AnomalyCard>
          ))}
        </AnomalyGrid>
      )}
    </Wrapper>
  )
})
