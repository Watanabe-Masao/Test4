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
import { useDuckDBDailyFeatures } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toAxisYen } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import { buildFeatureChartData, Z_SCORE_THRESHOLD } from './FeatureChartLogic'
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
    () => (features ? buildFeatureChartData(features) : { chartData: [], anomalies: [] }),
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
