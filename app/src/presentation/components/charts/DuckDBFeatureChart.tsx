/**
 * DuckDB 特徴量分析チャート
 *
 * DuckDB のウィンドウ関数を使い、日別売上の移動平均・Zスコア・スパイク比率を
 * リアルタイムに算出して表示する。DuckDB が未準備の場合は非表示。
 *
 * 表示項目:
 * - 日別売上実績線
 * - 3日/7日/28日移動平均線
 * - Zスコアによる異常検出マーカー
 * - スパイク比率のグラデーション背景
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
import { useDuckDBDailyFeatures, type DailyFeatureRow } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, tooltipStyle, useCurrencyFormatter } from './chartTheme'
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

const AnomalyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

const AnomalyCard = styled.div<{ $type: 'spike' | 'dip' }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ $type, theme }) =>
    $type === 'spike'
      ? theme.mode === 'dark'
        ? 'rgba(239,68,68,0.12)'
        : 'rgba(239,68,68,0.06)'
      : theme.mode === 'dark'
        ? 'rgba(59,130,246,0.12)'
        : 'rgba(59,130,246,0.06)'};
  border-left: 3px solid ${({ $type }) => ($type === 'spike' ? '#ef4444' : '#3b82f6')};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.6rem;
`

const AnomalyDate = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
`

const AnomalyValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
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

export function DuckDBFeatureChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()

  const { data: features, error } = useDuckDBDailyFeatures(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
  )

  const { chartData, anomalies } = useMemo(
    () => (features ? buildChartData(features) : { chartData: [], anomalies: [] }),
    [features],
  )

  if (error) {
    return (
      <Wrapper aria-label="売上トレンド分析（DuckDB）">
        <Title>売上トレンド分析（DuckDB）</Title>
        <ErrorMsg>データの取得に失敗しました: {error}</ErrorMsg>
      </Wrapper>
    )
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return null
  }

  return (
    <Wrapper aria-label="売上トレンド分析（DuckDB）">
      <Title>売上トレンド分析（DuckDB）</Title>
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
            tickFormatter={(v: number) => fmt(v)}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined) => [value != null ? fmt(value) : '-']}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {/* 異常日マーカー（棒グラフ） */}
          <Bar dataKey="anomaly" name="異常検出" fill="#ef4444" opacity={0.3} barSize={8} />

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
}
