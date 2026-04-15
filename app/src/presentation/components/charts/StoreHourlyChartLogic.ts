/**
 * StoreHourlyChart — 純粋ロジック層
 *
 * `TimeSlotSeries` (= projectTimeSlotSeries 出力) を受け取り、店舗×時間帯比較
 * データに変換する。React 非依存。副作用なし。
 *
 * 責務:
 *   - ピーク時間帯・コアタイム・折り返し時間の算出
 *   - コサイン類似度による店舗間パターン比較
 *   - 金額/構成比モードのデータ変換
 *
 * @migration unify-period-analysis Phase 6 Step C: 旧 raw row 直接消費から
 *            ctx.timeSlotLane.bundle.currentSeries (TimeSlotSeries) 経由に切り替え。
 *            raw row 集約は application/hooks/timeSlot/projectTimeSlotSeries.ts に
 *            移管された
 * @guard G5 hook ≤300行 — 純粋関数を分離
 * @responsibility R:calculation
 */
import type { TimeSlotSeries } from '@/application/hooks/timeSlot/TimeSlotBundle.types'
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

/**
 * `TimeSlotSeries` → 店舗×時間帯チャートデータ
 *
 * Phase 6 Step C: 入力は projection 済みの `TimeSlotSeries`。本関数は raw rows
 * を集約しない。`series.entries[i].byHour[h]` (24 長、null 含む) を hourMin..hourMax
 * 範囲で読み出し、UI 用の chartData / storeInfos / similarities に組み立てる。
 */
export function buildStoreHourlyData(
  series: TimeSlotSeries | null,
  storesMap: ReadonlyMap<string, { name: string }>,
  mode: StoreHourlyMode,
  hourMin: number,
  hourMax: number,
): StoreHourlyResult {
  if (!series || series.entries.length === 0) {
    return { chartData: [], storeInfos: [], similarities: [] }
  }

  // entries は projection 側で storeId 順にソート済み (truth-table で固定)
  const storeInfos: StoreInfo[] = series.entries.map((entry, i) => {
    const storeName = storesMap.get(entry.storeId)?.name ?? entry.storeId

    // hourMin..hourMax の窓だけを読み出す。null は 0 として扱う。
    const hourMap = new Map<number, number>()
    let peakHour = hourMin
    let peakAmount = 0
    const hourlyPattern: number[] = []
    let storeTotalInWindow = 0
    for (let h = hourMin; h <= hourMax; h++) {
      const v = entry.byHour[h]
      const amount = v ?? 0
      hourMap.set(h, amount)
      hourlyPattern.push(amount)
      storeTotalInWindow += amount
      if (amount > peakAmount) {
        peakHour = h
        peakAmount = amount
      }
    }

    const { start, end, turnover } = findCoreTime(hourMap, hourMin, hourMax)

    return {
      storeId: entry.storeId,
      name: storeName,
      color: STORE_COLORS[i % STORE_COLORS.length],
      peakHour,
      peakAmount: Math.round(peakAmount),
      totalAmount: Math.round(storeTotalInWindow),
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

  // Ratio mode: compute hour totals across all stores in the window
  const hourTotals = new Map<number, number>()
  if (mode === 'ratio') {
    for (let h = hourMin; h <= hourMax; h++) {
      let total = 0
      for (const entry of series.entries) {
        total += entry.byHour[h] ?? 0
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

    for (let i = 0; i < storeInfos.length; i++) {
      const store = storeInfos[i]
      const rawAmount = series.entries[i].byHour[h] ?? 0

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
