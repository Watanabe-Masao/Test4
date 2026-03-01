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
import { useState, useMemo, memo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBStoreAggregation,
  type StoreAggregationRow,
} from '@/application/hooks/useDuckDBQuery'
import {
  useChartTheme,
  tooltipStyle,
  useCurrencyFormatter,
  STORE_COLORS,
  toPct,
} from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
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

const SummaryGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

const StoreCard = styled.div<{ $borderColor: string }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-left: 3px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  font-size: 0.6rem;
  min-width: 140px;
`

const StoreName = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const PeakInfo = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const InsightBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.6rem;
`

const SimilarityBadge = styled.span<{ $high: boolean }>`
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $high }) => ($high ? `${sc.positive}18` : 'transparent')};
  color: ${({ $high, theme }) => ($high ? sc.positive : theme.colors.text4)};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
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

const HOUR_MIN = 6
const HOUR_MAX = 22
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

  const { data: storeRows, error } = useDuckDBStoreAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
  )

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

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return null
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
            tickFormatter={(v: number) => (mode === 'ratio' ? toPct(v / 100) : fmt(v))}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name?: string) => [
              value != null ? (mode === 'ratio' ? toPct(value / 100) : fmt(value)) : '-',
              name ?? '',
            ]}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {storeInfos.map((store) => (
            <Bar
              key={`store_${store.storeId}`}
              dataKey={`store_${store.storeId}`}
              name={store.name}
              fill={store.color}
              opacity={0.8}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Store summary cards with analytics */}
      <SummaryGrid>
        {storeInfos.map((store) => (
          <StoreCard key={store.storeId} $borderColor={store.color}>
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

      {/* Pattern similarity insights */}
      {similarities.length > 0 && (
        <InsightBar>
          {similarities.map((pair) => (
            <SimilarityBadge
              key={`${pair.storeA}-${pair.storeB}`}
              $high={pair.similarity >= SIMILARITY_HIGH}
            >
              {pair.storeA} × {pair.storeB}: {toPct(pair.similarity)}
              {pair.similarity >= SIMILARITY_HIGH && ' (高相似度)'}
            </SimilarityBadge>
          ))}
        </InsightBar>
      )}
    </Wrapper>
  )
})
