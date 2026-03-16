/**
 * Phase 4.4: 複数月・トレンド分析
 *
 * IndexedDB に保存された過去月データを横断的に分析する。
 * 月次 KPI の推移、季節性パターン、前月比/前年同月比を計算する。
 */
import { safeDivide } from '../utils'
import { MONTHS_PER_YEAR, SHORT_TERM_MA_MONTHS, MEDIUM_TERM_MA_MONTHS } from '@/domain/constants'

// ─── Types ────────────────────────────────────────────

/** 月次データポイント */
export interface MonthlyDataPoint {
  readonly year: number
  readonly month: number
  readonly totalSales: number
  readonly totalCustomers: number | null
  readonly grossProfit: number | null
  readonly grossProfitRate: number | null
  readonly budget: number | null
  readonly budgetAchievement: number | null
  readonly storeCount: number
  /** 売変率（= 売変合計 / 売上） */
  readonly discountRate: number | null
  /** 原価率（= (在庫仕入原価 + 売上納品原価) / 粗売上） */
  readonly costRate: number | null
  /** 原価算入率（= 原価算入費 / 売上） */
  readonly costInclusionRate: number | null
  /** 平均値入率（= (売価合計 - 原価合計) / 売価合計） */
  readonly averageMarkupRate: number | null
}

/** トレンド分析結果 */
export interface TrendAnalysisResult {
  /** 月次データポイント列 (時系列順) */
  readonly dataPoints: readonly MonthlyDataPoint[]
  /** 前月比 (%) — 2番目以降のポイントに対応 */
  readonly momChanges: readonly (number | null)[]
  /** 前年同月比 (%) — 対応する前年データがある場合のみ */
  readonly yoyChanges: readonly (number | null)[]
  /** 3ヶ月移動平均 (売上) */
  readonly movingAvg3: readonly (number | null)[]
  /** 6ヶ月移動平均 (売上) */
  readonly movingAvg6: readonly (number | null)[]
  /** 季節性インデックス (月平均に対する各月の比率) */
  readonly seasonalIndex: readonly number[]
  /** 売上の全体トレンド (正=上昇、負=下降) */
  readonly overallTrend: 'up' | 'down' | 'flat'
  /** 月平均売上 */
  readonly averageMonthlySales: number
}

// ─── Analysis Functions ───────────────────────────────

/**
 * 月次データポイント列からトレンド分析を実行する。
 */
export function analyzeTrend(dataPoints: readonly MonthlyDataPoint[]): TrendAnalysisResult {
  if (dataPoints.length === 0) {
    return {
      dataPoints: [],
      momChanges: [],
      yoyChanges: [],
      movingAvg3: [],
      movingAvg6: [],
      seasonalIndex: Array(MONTHS_PER_YEAR).fill(1),
      overallTrend: 'flat',
      averageMonthlySales: 0,
    }
  }

  // 時系列順にソート
  const sorted = [...dataPoints].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  )

  // 前月比
  const momChanges: (number | null)[] = sorted.map((dp, i) => {
    if (i === 0) return null
    const prev = sorted[i - 1]
    return prev.totalSales === 0 ? null : dp.totalSales / prev.totalSales
  })

  // 前年同月比
  const yoyChanges: (number | null)[] = sorted.map((dp) => {
    const sameMonthPrevYear = sorted.find((p) => p.year === dp.year - 1 && p.month === dp.month)
    if (!sameMonthPrevYear || sameMonthPrevYear.totalSales === 0) return null
    return dp.totalSales / sameMonthPrevYear.totalSales
  })

  // 移動平均
  const movingAvg3 = calculateMovingAverage(
    sorted.map((d) => d.totalSales),
    SHORT_TERM_MA_MONTHS,
  )
  const movingAvg6 = calculateMovingAverage(
    sorted.map((d) => d.totalSales),
    MEDIUM_TERM_MA_MONTHS,
  )

  // 季節性インデックス
  const seasonalIndex = calculateSeasonalIndex(sorted)

  // 全体トレンド判定
  const averageMonthlySales = sorted.reduce((s, d) => s + d.totalSales, 0) / sorted.length
  const overallTrend = determineOverallTrend(sorted)

  return {
    dataPoints: sorted,
    momChanges,
    yoyChanges,
    movingAvg3,
    movingAvg6,
    seasonalIndex,
    overallTrend,
    averageMonthlySales,
  }
}

// ─── Helper Functions ─────────────────────────────────

function calculateMovingAverage(
  values: readonly number[],
  window: number,
): readonly (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null
    let sum = 0
    for (let j = i - window + 1; j <= i; j++) {
      sum += values[j]
    }
    return sum / window
  })
}

/**
 * 季節性インデックスを計算する。
 * 各月の平均売上 / 全体の月平均売上 = 季節性比率
 * index > 1.0 = 繁忙期、index < 1.0 = 閑散期
 */
function calculateSeasonalIndex(dataPoints: readonly MonthlyDataPoint[]): readonly number[] {
  const monthlyBuckets = Array.from({ length: MONTHS_PER_YEAR }, () => ({ total: 0, count: 0 }))
  let grandTotal = 0
  let grandCount = 0

  for (const dp of dataPoints) {
    monthlyBuckets[dp.month - 1].total += dp.totalSales
    monthlyBuckets[dp.month - 1].count++
    grandTotal += dp.totalSales
    grandCount++
  }

  const grandAvg = safeDivide(grandTotal, grandCount, 0)
  if (grandAvg === 0) return Array(MONTHS_PER_YEAR).fill(1)

  return monthlyBuckets.map((b) => {
    if (b.count === 0) return 1
    return b.total / b.count / grandAvg
  })
}

/** トレンド判定の変化率閾値（±3%以上で上昇/下降と判定） */
const TREND_CHANGE_THRESHOLD = 0.03

/**
 * 直近3ヶ月と、その前の3ヶ月の売上平均を比較して
 * トレンドの方向を判定する。
 */
function determineOverallTrend(sorted: readonly MonthlyDataPoint[]): 'up' | 'down' | 'flat' {
  if (sorted.length < 4) return 'flat'

  const recent3 = sorted.slice(-SHORT_TERM_MA_MONTHS)
  const previous3 = sorted.slice(-MEDIUM_TERM_MA_MONTHS, -SHORT_TERM_MA_MONTHS)

  if (previous3.length === 0) return 'flat'

  const recentAvg = recent3.reduce((s, d) => s + d.totalSales, 0) / recent3.length
  const previousAvg = previous3.reduce((s, d) => s + d.totalSales, 0) / previous3.length

  if (previousAvg === 0) return 'flat'

  const changeRate = (recentAvg - previousAvg) / previousAvg
  if (changeRate > TREND_CHANGE_THRESHOLD) return 'up'
  if (changeRate < -TREND_CHANGE_THRESHOLD) return 'down'
  return 'flat'
}
