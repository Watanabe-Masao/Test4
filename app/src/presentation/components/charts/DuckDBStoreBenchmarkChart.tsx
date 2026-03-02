/**
 * DuckDB 店舗ベンチマークチャート（バンプチャート）
 *
 * DuckDB の週次店舗ベンチマーククエリを使い、店舗ごとの週次ランキング推移を
 * バンプチャート（順位推移折れ線）で表示する。Y軸を反転し、1位を上に配置。
 *
 * 表示項目:
 * - 店舗別の週次ランキング推移（折れ線）
 * - Y軸反転（ランク1が最上部）
 * - サマリー: 最多1位店舗・最も改善した店舗
 */
import { useMemo, memo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBStoreBenchmark, type StoreBenchmarkRow } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter } from './chartTheme'
import { STORE_COLORS } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState } from '@/presentation/components/common'

// ── styled-components ──

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

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

const SummaryCard = styled.div<{ $variant: 'gold' | 'improve' }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ $variant, theme }) =>
    $variant === 'gold'
      ? theme.mode === 'dark'
        ? 'rgba(251,191,36,0.12)'
        : 'rgba(251,191,36,0.06)'
      : theme.mode === 'dark'
        ? 'rgba(34,197,94,0.12)'
        : 'rgba(34,197,94,0.06)'};
  border-left: 3px solid ${({ $variant }) => ($variant === 'gold' ? '#fbbf24' : '#22c55e')};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.6rem;
`

const SummaryLabel = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
`

const SummaryValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
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
  readonly stores: ReadonlyMap<string, { name: string }>
}

interface ChartDataPoint {
  readonly week: string
  readonly [storeRankKey: string]: string | number | null
}

interface StoreMeta {
  readonly storeId: string
  readonly storeName: string
  readonly weeksAtRank1: number
  readonly bestRank: number
  readonly latestRank: number
  readonly earliestRank: number
  readonly improvement: number
}

interface BenchmarkChartData {
  readonly chartData: ChartDataPoint[]
  readonly storeMetas: StoreMeta[]
  readonly maxRank: number
  readonly bestStore: StoreMeta | null
  readonly mostImproved: StoreMeta | null
}

// ── Data transformation ──

function buildBenchmarkData(
  rows: readonly StoreBenchmarkRow[],
  storeNameMap: ReadonlyMap<string, { name: string }>,
): BenchmarkChartData {
  // Collect weeks in order
  const weekSet = new Set<string>()
  for (const row of rows) {
    weekSet.add(row.weekStart)
  }
  const sortedWeeks = [...weekSet].sort()

  // Build chart data: one row per week, one column per store rank
  const weekMap = new Map<string, Map<string, { rank: number; sales: number }>>()
  for (const row of rows) {
    const weekLabel = row.weekStart.slice(5) // MM-DD
    if (!weekMap.has(weekLabel)) {
      weekMap.set(weekLabel, new Map())
    }
    weekMap.get(weekLabel)!.set(row.storeId, {
      rank: row.salesRank,
      sales: Math.round(row.weekSales),
    })
  }

  // Get unique store IDs
  const storeIds = new Set<string>()
  for (const row of rows) {
    storeIds.add(row.storeId)
  }

  const weekLabels = sortedWeeks.map((w) => w.slice(5))

  const chartData: ChartDataPoint[] = weekLabels.map((week) => {
    const weekData = weekMap.get(week) ?? new Map()
    const point: Record<string, string | number | null> = { week }
    for (const storeId of storeIds) {
      const storeData = weekData.get(storeId)
      point[`rank_${storeId}`] = storeData ? storeData.rank : null
      point[`sales_${storeId}`] = storeData ? storeData.sales : null
    }
    return point as ChartDataPoint
  })

  // Compute store metas
  let maxRank = 1
  const storeMetas: StoreMeta[] = [...storeIds].map((storeId) => {
    const storeInfo = storeNameMap.get(storeId)
    const storeName = storeInfo?.name ?? storeId

    let weeksAtRank1 = 0
    let bestRank = Infinity
    let latestRank = Infinity
    let earliestRank = Infinity
    let foundEarliest = false

    for (const week of weekLabels) {
      const weekData = weekMap.get(week)
      const storeData = weekData?.get(storeId)
      if (storeData) {
        if (storeData.rank === 1) weeksAtRank1++
        if (storeData.rank < bestRank) bestRank = storeData.rank
        if (storeData.rank > maxRank) maxRank = storeData.rank
        latestRank = storeData.rank
        if (!foundEarliest) {
          earliestRank = storeData.rank
          foundEarliest = true
        }
      }
    }

    if (bestRank === Infinity) bestRank = 0
    if (latestRank === Infinity) latestRank = 0
    if (earliestRank === Infinity) earliestRank = 0

    return {
      storeId,
      storeName,
      weeksAtRank1,
      bestRank,
      latestRank,
      earliestRank,
      improvement: earliestRank - latestRank, // positive = improved
    }
  })

  // Sort by latest rank
  storeMetas.sort((a, b) => a.latestRank - b.latestRank)

  // Find best store (most weeks at rank 1)
  const bestStore = storeMetas.reduce<StoreMeta | null>(
    (best, s) => (!best || s.weeksAtRank1 > best.weeksAtRank1 ? s : best),
    null,
  )

  // Find most improved store
  const mostImproved = storeMetas.reduce<StoreMeta | null>(
    (best, s) => (!best || s.improvement > best.improvement ? s : best),
    null,
  )

  return { chartData, storeMetas, maxRank, bestStore, mostImproved }
}

// ── Custom tooltip ──

interface TooltipPayloadItem {
  readonly name: string
  readonly value: number
  readonly color: string
  readonly dataKey: string
}

interface BenchmarkTooltipProps {
  readonly active?: boolean
  readonly label?: string
  readonly payload?: readonly TooltipPayloadItem[]
  readonly storeMetas: readonly StoreMeta[]
  readonly chartData: readonly ChartDataPoint[]
  readonly ct: ReturnType<typeof useChartTheme>
  readonly fmt: (v: number) => string
}

function BenchmarkTooltip({
  active,
  label,
  payload,
  storeMetas,
  chartData,
  ct,
  fmt,
}: BenchmarkTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  // Find the current week data point
  const weekPoint = chartData.find((d) => d.week === label)

  // Filter to rank entries only and sort by rank
  const rankEntries = payload
    .filter((p) => p.dataKey.startsWith('rank_'))
    .sort((a, b) => (a.value ?? Infinity) - (b.value ?? Infinity))

  return (
    <div
      style={{
        background: ct.bg2,
        border: `1px solid ${ct.grid}`,
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: ct.fontSize.sm,
        fontFamily: ct.fontFamily,
        color: ct.text,
      }}
    >
      <div style={{ marginBottom: 4, fontWeight: 600 }}>週: {label}</div>
      {rankEntries.map((p) => {
        const storeId = p.dataKey.replace('rank_', '')
        const meta = storeMetas.find((s) => s.storeId === storeId)
        const storeName = meta?.storeName ?? storeId
        const sales = weekPoint?.[`sales_${storeId}`]

        return (
          <div key={p.dataKey} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: p.color,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span>
              {storeName}: {p.value}位{typeof sales === 'number' ? ` (${fmt(sales)})` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Component ──

export const DuckDBStoreBenchmarkChart = memo(function DuckDBStoreBenchmarkChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  stores,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const { data: benchmarkRows, error } = useDuckDBStoreBenchmark(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
  )

  const { chartData, storeMetas, maxRank, bestStore, mostImproved } = useMemo(
    () =>
      benchmarkRows
        ? buildBenchmarkData(benchmarkRows, stores)
        : {
            chartData: [],
            storeMetas: [],
            maxRank: 1,
            bestStore: null,
            mostImproved: null,
          },
    [benchmarkRows, stores],
  )

  if (error) {
    return (
      <Wrapper aria-label="店舗ベンチマーク（DuckDB）">
        <Title>店舗ベンチマーク（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="店舗ベンチマーク（DuckDB）">
      <Title>店舗ベンチマーク（DuckDB）</Title>
      <Subtitle>週次の店舗ランキング推移 | マルチ店舗対応</Subtitle>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            reversed
            domain={[1, maxRank]}
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => `${v}位`}
            allowDecimals={false}
          />
          <Tooltip
            content={
              <BenchmarkTooltip storeMetas={storeMetas} chartData={chartData} ct={ct} fmt={fmt} />
            }
          />
          <Legend
            wrapperStyle={{ fontSize: '0.6rem' }}
            formatter={(value: string) => {
              const storeId = value.replace('rank_', '')
              const meta = storeMetas.find((s) => s.storeId === storeId)
              return meta?.storeName ?? storeId
            }}
          />

          {storeMetas.map((meta, i) => (
            <Line
              key={meta.storeId}
              dataKey={`rank_${meta.storeId}`}
              name={`rank_${meta.storeId}`}
              stroke={STORE_COLORS[i % STORE_COLORS.length]}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: STORE_COLORS[i % STORE_COLORS.length],
                stroke: ct.bg3,
                strokeWidth: 1,
              }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <SummaryGrid>
        {bestStore && bestStore.weeksAtRank1 > 0 && (
          <SummaryCard $variant="gold">
            <SummaryLabel>最多1位: {bestStore.storeName}</SummaryLabel>
            <SummaryValue>
              {bestStore.weeksAtRank1}週 / {chartData.length}週
            </SummaryValue>
          </SummaryCard>
        )}
        {mostImproved && mostImproved.improvement > 0 && (
          <SummaryCard $variant="improve">
            <SummaryLabel>最大改善: {mostImproved.storeName}</SummaryLabel>
            <SummaryValue>
              {mostImproved.earliestRank}位 → {mostImproved.latestRank}位 (+
              {mostImproved.improvement}ランク)
            </SummaryValue>
          </SummaryCard>
        )}
      </SummaryGrid>
    </Wrapper>
  )
})
