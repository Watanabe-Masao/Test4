/**
 * Phase 4.4: 複数月・トレンド分析
 *
 * IndexedDB に保存された過去月データを横断的に分析する。
 * 月次 KPI の推移、季節性パターン、前月比/前年同月比を計算する。
 */

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
      seasonalIndex: Array(12).fill(1),
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
    const sameMonthPrevYear = sorted.find(
      (p) => p.year === dp.year - 1 && p.month === dp.month,
    )
    if (!sameMonthPrevYear || sameMonthPrevYear.totalSales === 0) return null
    return dp.totalSales / sameMonthPrevYear.totalSales
  })

  // 移動平均
  const movingAvg3 = calculateMovingAverage(sorted.map((d) => d.totalSales), 3)
  const movingAvg6 = calculateMovingAverage(sorted.map((d) => d.totalSales), 6)

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
  const monthlyBuckets = Array.from({ length: 12 }, () => ({ total: 0, count: 0 }))
  let grandTotal = 0
  let grandCount = 0

  for (const dp of dataPoints) {
    monthlyBuckets[dp.month - 1].total += dp.totalSales
    monthlyBuckets[dp.month - 1].count++
    grandTotal += dp.totalSales
    grandCount++
  }

  const grandAvg = grandCount > 0 ? grandTotal / grandCount : 0
  if (grandAvg === 0) return Array(12).fill(1)

  return monthlyBuckets.map((b) => {
    if (b.count === 0) return 1
    return (b.total / b.count) / grandAvg
  })
}

/**
 * 直近3ヶ月と、その前の3ヶ月の売上平均を比較して
 * トレンドの方向を判定する。
 */
function determineOverallTrend(
  sorted: readonly MonthlyDataPoint[],
): 'up' | 'down' | 'flat' {
  if (sorted.length < 4) return 'flat'

  const recent3 = sorted.slice(-3)
  const previous3 = sorted.slice(-6, -3)

  if (previous3.length === 0) return 'flat'

  const recentAvg = recent3.reduce((s, d) => s + d.totalSales, 0) / recent3.length
  const previousAvg = previous3.reduce((s, d) => s + d.totalSales, 0) / previous3.length

  if (previousAvg === 0) return 'flat'

  const changeRate = (recentAvg - previousAvg) / previousAvg
  if (changeRate > 0.03) return 'up'
  if (changeRate < -0.03) return 'down'
  return 'flat'
}
