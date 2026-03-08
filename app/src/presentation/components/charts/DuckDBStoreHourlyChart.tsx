/**
 * DuckDB 店舗×時間帯比較チャート
 *
 * DuckDB の StoreAggregation クエリを使い、店舗ごとの時間帯別売上を
 * グループ棒グラフで比較表示する。金額 / 構成比モードの切替が可能。
 *
 * 表示項目:
 * - 店舗別の時間帯売上（グループ棒グラフ）
 * - 金額 / 構成比 切替
 * - 各店舗のピーク時間帯・コアタイム・折り返し時間
 * - 店舗間パターン類似度（コサイン類似度）
 */
import { useState, useMemo, memo, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { HOUR_MIN, HOUR_MAX } from './DuckDBHeatmapChart.helpers'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBStoreAggregation,
  type StoreAggregationRow,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, STORE_COLORS, toPct, toAxisYen } from './chartTheme'
import { createChartTooltip } from './ChartTooltip'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import { Modal } from '@/presentation/components/common'
import {
  Wrapper,
  Title,
  Subtitle,
  HeaderRow,
  ToggleGroup,
  ToggleButton,
  SummaryGrid,
  StoreCard,
  StoreName,
  PeakInfo,
  ModalSimilarityList,
  ModalSimilarityRow,
  ModalPairLabel,
  ModalSimValue,
  ModalStoreDetail,
  ModalSectionTitle,
  ErrorMsg,
} from './DuckDBStoreHourlyChart.styles'

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly stores: ReadonlyMap<string, { name: string }>
}

type Mode = 'amount' | 'ratio'

interface StoreInfo {
  readonly storeId: string
  readonly name: string
  readonly color: string
  readonly peakHour: number
  readonly peakAmount: number
  readonly totalAmount: number
  readonly coreTimeStart: number
  readonly coreTimeEnd: number
  readonly turnoverHour: number
  /** Hourly pattern vector for similarity calculation */
  readonly hourlyPattern: readonly number[]
}

interface ChartDataPoint {
  readonly hour: string
  readonly hourNum: number
  readonly [storeKey: string]: string | number
}

interface SimilarityPair {
  readonly storeA: string
  readonly storeB: string
  readonly similarity: number
}

// ── Constants ──

const CORE_THRESHOLD = 0.8 // top 80% of sales defines core time
const SIMILARITY_HIGH = 0.95

// ── Helpers ──

/** Cosine similarity between two vectors */
function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 0 ? dotProduct / denom : 0
}

/** Find core time (hours that account for CORE_THRESHOLD of total sales) */
function findCoreTime(hourlyAmounts: Map<number, number>): {
  start: number
  end: number
  turnover: number
} {
  const total = [...hourlyAmounts.values()].reduce((s, v) => s + v, 0)
  if (total === 0) return { start: HOUR_MIN, end: HOUR_MAX, turnover: 12 }

  // Sort hours by amount descending
  const sorted = [...hourlyAmounts.entries()].sort((a, b) => b[1] - a[1])

  // Find hours that make up CORE_THRESHOLD of total
  let cumulative = 0
  const coreHours: number[] = []
  for (const [hour, amount] of sorted) {
    coreHours.push(hour)
    cumulative += amount
    if (cumulative >= total * CORE_THRESHOLD) break
  }

  coreHours.sort((a, b) => a - b)
  const start = coreHours[0] ?? HOUR_MIN
  const end = coreHours[coreHours.length - 1] ?? HOUR_MAX

  // Turnover: hour after peak where sales start declining consistently
  const peak = sorted[0]?.[0] ?? 12
  let turnover = peak
  for (let h = peak + 1; h <= HOUR_MAX; h++) {
    const cur = hourlyAmounts.get(h) ?? 0
    const prev = hourlyAmounts.get(h - 1) ?? 0
    if (cur < prev * 0.7) {
      turnover = h
      break
    }
    turnover = h
  }

  return { start, end, turnover }
}

function buildChartData(
  rows: readonly StoreAggregationRow[],
  storesMap: ReadonlyMap<string, { name: string }>,
  mode: Mode,
): {
  chartData: ChartDataPoint[]
  storeInfos: StoreInfo[]
  similarities: SimilarityPair[]
} {
  // Build store hour maps
  const storeIds = new Set<string>()
  const storeHourMap = new Map<string, Map<number, number>>()
  const storeTotals = new Map<string, number>()

  for (const row of rows) {
    storeIds.add(row.storeId)
    if (row.hour < HOUR_MIN || row.hour > HOUR_MAX) continue

    if (!storeHourMap.has(row.storeId)) {
      storeHourMap.set(row.storeId, new Map())
    }
    const hourMap = storeHourMap.get(row.storeId)!
    hourMap.set(row.hour, (hourMap.get(row.hour) ?? 0) + row.amount)

    storeTotals.set(row.storeId, (storeTotals.get(row.storeId) ?? 0) + row.amount)
  }

  // Build store infos with analytics
  const sortedStoreIds = [...storeIds].sort()
  const storeInfos: StoreInfo[] = sortedStoreIds.map((storeId, i) => {
    const hourMap = storeHourMap.get(storeId) ?? new Map()
    const storeName = storesMap.get(storeId)?.name ?? storeId

    let peakHour = HOUR_MIN
    let peakAmount = 0
    const hourlyPattern: number[] = []

    for (let h = HOUR_MIN; h <= HOUR_MAX; h++) {
      const amount = hourMap.get(h) ?? 0
      hourlyPattern.push(amount)
      if (amount > peakAmount) {
        peakHour = h
        peakAmount = amount
      }
    }

    const { start, end, turnover } = findCoreTime(hourMap)

    return {
      storeId,
      name: storeName,
      color: STORE_COLORS[i % STORE_COLORS.length],
      peakHour,
      peakAmount: Math.round(peakAmount),
      totalAmount: Math.round(storeTotals.get(storeId) ?? 0),
      coreTimeStart: start,
      coreTimeEnd: end,
      turnoverHour: turnover,
      hourlyPattern,
    }
  })

  // Calculate pairwise cosine similarity
  const similarities: SimilarityPair[] = []
  for (let i = 0; i < storeInfos.length; i++) {
    for (let j = i + 1; j < storeInfos.length; j++) {
      const sim = cosineSimilarity(storeInfos[i].hourlyPattern, storeInfos[j].hourlyPattern)
      similarities.push({
        storeA: storeInfos[i].name,
        storeB: storeInfos[j].name,
        similarity: sim,
      })
    }
  }
  similarities.sort((a, b) => b.similarity - a.similarity)

  // Ratio mode: compute hour totals
  const hourTotals = new Map<number, number>()
  if (mode === 'ratio') {
    for (let h = HOUR_MIN; h <= HOUR_MAX; h++) {
      let total = 0
      for (const [, hourMap] of storeHourMap) {
        total += hourMap.get(h) ?? 0
      }
      hourTotals.set(h, total)
    }
  }

  // Build chart data points
  const chartData: ChartDataPoint[] = []
  for (let h = HOUR_MIN; h <= HOUR_MAX; h++) {
    const point: Record<string, string | number> = {
      hour: `${h}時`,
      hourNum: h,
    }

    for (const store of storeInfos) {
      const hourMap = storeHourMap.get(store.storeId) ?? new Map()
      const rawAmount = hourMap.get(h) ?? 0

      if (mode === 'ratio') {
        const hourTotal = hourTotals.get(h) ?? 0
        point[`store_${store.storeId}`] =
          hourTotal > 0 ? Math.round((rawAmount / hourTotal) * 10000) / 100 : 0
      } else {
        point[`store_${store.storeId}`] = Math.round(rawAmount)
      }
    }

    chartData.push(point as ChartDataPoint)
  }

  return { chartData, storeInfos, similarities }
}

// ── Component ──

export const DuckDBStoreHourlyChart = memo(function DuckDBStoreHourlyChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  stores,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [mode, setMode] = useState<Mode>('amount')
  const [selectedStoreInfo, setSelectedStoreInfo] = useState<StoreInfo | null>(null)

  const handleStoreCardClick = useCallback((store: StoreInfo) => {
    setSelectedStoreInfo(store)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedStoreInfo(null)
  }, [])

  const {
    data: storeRows,
    error,
    isLoading,
  } = useDuckDBStoreAggregation(duckConn, duckDataVersion, currentDateRange, selectedStoreIds)

  const { chartData, storeInfos, similarities } = useMemo(
    () =>
      storeRows
        ? buildChartData(storeRows, stores, mode)
        : { chartData: [], storeInfos: [], similarities: [] },
    [storeRows, stores, mode],
  )

  if (error) {
    return (
      <Wrapper aria-label="店舗×時間帯比較（DuckDB）">
        <Title>店舗×時間帯比較（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !storeRows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="店舗×時間帯比較（DuckDB）">
      <HeaderRow>
        <div>
          <Title>店舗×時間帯比較（DuckDB）</Title>
          <Subtitle>店舗別の時間帯売上パターン | ピーク・コアタイム・類似度分析</Subtitle>
        </div>
        <ToggleGroup role="tablist" aria-label="表示モード切替">
          <ToggleButton
            $active={mode === 'amount'}
            onClick={() => setMode('amount')}
            role="tab"
            aria-selected={mode === 'amount'}
          >
            金額
          </ToggleButton>
          <ToggleButton
            $active={mode === 'ratio'}
            onClick={() => setMode('ratio')}
            role="tab"
            aria-selected={mode === 'ratio'}
          >
            構成比
          </ToggleButton>
        </ToggleGroup>
      </HeaderRow>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => (mode === 'ratio' ? toPct(v / 100) : toAxisYen(v))}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value: unknown, name: string) => {
                const v = value as number | undefined
                return [v != null ? (mode === 'ratio' ? toPct(v / 100) : fmt(v)) : '-', name]
              },
            })}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {storeInfos.map((store) => (
            <Bar
              key={`store_${store.storeId}`}
              dataKey={`store_${store.storeId}`}
              name={store.name}
              fill={store.color}
              opacity={0.8}
              stackId={mode === 'ratio' ? 'ratio' : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Store summary cards with analytics — click to open detail modal */}
      <SummaryGrid>
        {storeInfos.map((store) => (
          <StoreCard
            key={store.storeId}
            $borderColor={store.color}
            onClick={() => handleStoreCardClick(store)}
            title="クリックで類似度分析を表示"
          >
            <StoreName>{store.name}</StoreName>
            <PeakInfo>
              ピーク: {store.peakHour}時 ({fmt(store.peakAmount)})
            </PeakInfo>
            <PeakInfo>
              コアタイム: {store.coreTimeStart}〜{store.coreTimeEnd}時
            </PeakInfo>
            <PeakInfo>折り返し: {store.turnoverHour}時</PeakInfo>
          </StoreCard>
        ))}
      </SummaryGrid>

      {/* Store detail + similarity modal */}
      {selectedStoreInfo && (
        <Modal title={`${selectedStoreInfo.name} — 時間帯分析`} onClose={handleCloseModal}>
          <ModalStoreDetail>
            <div>
              <strong>ピーク時間帯:</strong> {selectedStoreInfo.peakHour}時（
              {fmt(selectedStoreInfo.peakAmount)}）
            </div>
            <div>
              <strong>コアタイム:</strong> {selectedStoreInfo.coreTimeStart}〜
              {selectedStoreInfo.coreTimeEnd}時
            </div>
            <div>
              <strong>折り返し:</strong> {selectedStoreInfo.turnoverHour}時
            </div>
          </ModalStoreDetail>

          {similarities.length > 0 && (
            <>
              <ModalSectionTitle>店舗間パターン類似度（コサイン類似度）</ModalSectionTitle>
              <ModalSimilarityList>
                {similarities
                  .filter(
                    (pair) =>
                      pair.storeA === selectedStoreInfo.name ||
                      pair.storeB === selectedStoreInfo.name,
                  )
                  .map((pair) => (
                    <ModalSimilarityRow
                      key={`${pair.storeA}-${pair.storeB}`}
                      $high={pair.similarity >= SIMILARITY_HIGH}
                    >
                      <ModalPairLabel>
                        {pair.storeA === selectedStoreInfo.name ? pair.storeB : pair.storeA}
                      </ModalPairLabel>
                      <ModalSimValue $high={pair.similarity >= SIMILARITY_HIGH}>
                        {toPct(pair.similarity)}
                        {pair.similarity >= SIMILARITY_HIGH && ' (高相似度)'}
                      </ModalSimValue>
                    </ModalSimilarityRow>
                  ))}
              </ModalSimilarityList>

              {similarities.filter(
                (p) => p.storeA !== selectedStoreInfo.name && p.storeB !== selectedStoreInfo.name,
              ).length > 0 && (
                <>
                  <ModalSectionTitle>その他の店舗ペア</ModalSectionTitle>
                  <ModalSimilarityList>
                    {similarities
                      .filter(
                        (p) =>
                          p.storeA !== selectedStoreInfo.name &&
                          p.storeB !== selectedStoreInfo.name,
                      )
                      .map((pair) => (
                        <ModalSimilarityRow
                          key={`${pair.storeA}-${pair.storeB}`}
                          $high={pair.similarity >= SIMILARITY_HIGH}
                        >
                          <ModalPairLabel>
                            {pair.storeA} × {pair.storeB}
                          </ModalPairLabel>
                          <ModalSimValue $high={pair.similarity >= SIMILARITY_HIGH}>
                            {toPct(pair.similarity)}
                            {pair.similarity >= SIMILARITY_HIGH && ' (高相似度)'}
                          </ModalSimValue>
                        </ModalSimilarityRow>
                      ))}
                  </ModalSimilarityList>
                </>
              )}
            </>
          )}
        </Modal>
      )}
    </Wrapper>
  )
})
