/**
 * StoreHourlyChart — 純粋ロジック層
 *
 * DuckDB の StoreAggregationRow[] を受け取り、店舗×時間帯比較データに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - 店舗別×時間帯別の集計
 *   - ピーク時間帯・コアタイム・折り返し時間の算出
 *   - コサイン類似度による店舗間パターン比較
 *   - 金額/構成比モードのデータ変換
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 * @responsibility R:calculation
 */
import type { StoreAggregationRow } from '@/application/hooks/duckdb'
import { STORE_COLORS } from './chartTheme'

// ─── Types ──────────────────────────────────────────

export interface StoreInfo {
  readonly storeId: string
  readonly name: string
  readonly color: string
  readonly peakHour: number
  readonly peakAmount: number
  readonly totalAmount: number
  readonly coreTimeStart: number
  readonly coreTimeEnd: number
  readonly turnoverHour: number
  readonly hourlyPattern: readonly number[]
}

export interface StoreHourlyDataPoint {
  readonly hour: string
  readonly hourNum: number
  readonly [storeKey: string]: string | number
}

export interface SimilarityPair {
  readonly storeA: string
  readonly storeB: string
  readonly similarity: number
}

export type StoreHourlyMode = 'amount' | 'ratio'

export interface StoreHourlyResult {
  readonly chartData: readonly StoreHourlyDataPoint[]
  readonly storeInfos: readonly StoreInfo[]
  readonly similarities: readonly SimilarityPair[]
}

// ─── Constants ──────────────────────────────────────

/** コアタイム判定閾値（売上の上位80%がコアタイム） */
export const CORE_THRESHOLD = 0.8

/** 高い類似度の閾値 */
export const SIMILARITY_HIGH = 0.95

// ─── Pure Helpers ───────────────────────────────────

/** コサイン類似度 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
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

/** コアタイム算出（売上の上位 CORE_THRESHOLD を占める時間帯） */
export function findCoreTime(
  hourlyAmounts: ReadonlyMap<number, number>,
  hourMin: number,
  hourMax: number,
): { start: number; end: number; turnover: number } {
  const total = [...hourlyAmounts.values()].reduce((s, v) => s + v, 0)
  if (total === 0) return { start: hourMin, end: hourMax, turnover: 12 }

  const sorted = [...hourlyAmounts.entries()].sort((a, b) => b[1] - a[1])

  let cumulative = 0
  const coreHours: number[] = []
  for (const [hour, amount] of sorted) {
    coreHours.push(hour)
    cumulative += amount
    if (cumulative >= total * CORE_THRESHOLD) break
  }

  coreHours.sort((a, b) => a - b)
  const start = coreHours[0] ?? hourMin
  const end = coreHours[coreHours.length - 1] ?? hourMax

  const peak = sorted[0]?.[0] ?? 12
  let turnover = peak
  for (let h = peak + 1; h <= hourMax; h++) {
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

// ─── Main Logic ─────────────────────────────────────

/** StoreAggregationRow[] → 店舗×時間帯チャートデータ */
export function buildStoreHourlyData(
  rows: readonly StoreAggregationRow[],
  storesMap: ReadonlyMap<string, { name: string }>,
  mode: StoreHourlyMode,
  hourMin: number,
  hourMax: number,
): StoreHourlyResult {
  const storeIds = new Set<string>()
  const storeHourMap = new Map<string, Map<number, number>>()
  const storeTotals = new Map<string, number>()

  for (const row of rows) {
    storeIds.add(row.storeId)
    if (row.hour < hourMin || row.hour > hourMax) continue

    if (!storeHourMap.has(row.storeId)) {
      storeHourMap.set(row.storeId, new Map())
    }
    const hourMap = storeHourMap.get(row.storeId)!
    hourMap.set(row.hour, (hourMap.get(row.hour) ?? 0) + row.amount)
    storeTotals.set(row.storeId, (storeTotals.get(row.storeId) ?? 0) + row.amount)
  }

  const sortedStoreIds = [...storeIds].sort()
  const storeInfos: StoreInfo[] = sortedStoreIds.map((storeId, i) => {
    const hourMap = storeHourMap.get(storeId) ?? new Map()
    const storeName = storesMap.get(storeId)?.name ?? storeId

    let peakHour = hourMin
    let peakAmount = 0
    const hourlyPattern: number[] = []

    for (let h = hourMin; h <= hourMax; h++) {
      const amount = hourMap.get(h) ?? 0
      hourlyPattern.push(amount)
      if (amount > peakAmount) {
        peakHour = h
        peakAmount = amount
      }
    }

    const { start, end, turnover } = findCoreTime(hourMap, hourMin, hourMax)

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

  // Pairwise cosine similarity
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
    for (let h = hourMin; h <= hourMax; h++) {
      let total = 0
      for (const [, hourMap] of storeHourMap) {
        total += hourMap.get(h) ?? 0
      }
      hourTotals.set(h, total)
    }
  }

  // Build chart data
  const chartData: StoreHourlyDataPoint[] = []
  for (let h = hourMin; h <= hourMax; h++) {
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

    chartData.push(point as StoreHourlyDataPoint)
  }

  return { chartData, storeInfos, similarities }
}
