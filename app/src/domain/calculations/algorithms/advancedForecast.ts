/**
 * Phase 4.1: 高度な予測分析
 *
 * - 加重移動平均 (Weighted Moving Average)
 * - 曜日パターン調整済み月末予測
 * - 信頼区間付き予測
 * - 線形回帰による傾向推定
 */
import { safeDivide } from '../utils'
import { calculateStdDev } from '../forecast'
import { DEFAULT_WMA_WINDOW, DAYS_PER_WEEK, CONFIDENCE_95_ZSCORE } from '@/domain/constants'
import type { DailyForecast } from '@/domain/models/record'

// ─── Types ────────────────────────────────────────────

/** 加重移動平均の結果 */
export interface WMAEntry {
  readonly day: number
  readonly actual: number
  readonly wma: number
}

/** 月末予測結果 */
export interface MonthEndProjection {
  /** 単純平均ベースの予測 */
  readonly linearProjection: number
  /** 曜日調整済み予測 */
  readonly dowAdjustedProjection: number
  /** 加重移動平均ベースの予測 (直近重み) */
  readonly wmaProjection: number
  /** 予測の信頼区間 (95%) */
  readonly confidenceInterval: {
    readonly lower: number
    readonly upper: number
  }
  /** 線形回帰による傾向 (1日あたりの増減) */
  readonly dailyTrend: number
  /** 回帰ベースの予測 */
  readonly regressionProjection: number
}

/** 線形回帰の結果 */
export interface LinearRegressionResult {
  readonly slope: number // 傾き (1日あたりの変化量)
  readonly intercept: number // 切片
  readonly rSquared: number // 決定係数
}

// ─── Weighted Moving Average ──────────────────────────

/**
 * 加重移動平均を計算する。
 * 直近のデータに大きい重みを付与することで、トレンド変化に敏感に反応する。
 *
 * @param dailySales day → sales の Map
 * @param window 移動平均の窓サイズ (default: 5)
 */
export function calculateWMA(
  dailySales: ReadonlyMap<number, number>,
  window = DEFAULT_WMA_WINDOW,
): readonly WMAEntry[] {
  const entries = Array.from(dailySales.entries())
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a - b)

  if (entries.length < window) return entries.map(([day, actual]) => ({ day, actual, wma: actual }))

  const results: WMAEntry[] = []
  const totalWeight = (window * (window + 1)) / 2

  for (let i = 0; i < entries.length; i++) {
    const [day, actual] = entries[i]
    if (i < window - 1) {
      results.push({ day, actual, wma: actual })
      continue
    }

    let weightedSum = 0
    for (let j = 0; j < window; j++) {
      const weight = j + 1
      weightedSum += entries[i - window + 1 + j][1] * weight
    }
    results.push({ day, actual, wma: weightedSum / totalWeight })
  }

  return results
}

// ─── Linear Regression ────────────────────────────────

/**
 * 単純線形回帰: y = slope * x + intercept
 * x = day number, y = sales
 */
export function linearRegression(dailySales: ReadonlyMap<number, number>): LinearRegressionResult {
  const entries = Array.from(dailySales.entries()).filter(([, v]) => v > 0)
  const n = entries.length
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 }

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0
  for (const [x, y] of entries) {
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  // 決定係数 R²
  const yMean = sumY / n
  let ssTot = 0,
    ssRes = 0
  for (const [x, y] of entries) {
    ssTot += (y - yMean) ** 2
    ssRes += (y - (slope * x + intercept)) ** 2
  }
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot

  return { slope, intercept, rSquared }
}

// ─── DOW-Adjusted Projection ──────────────────────────

/**
 * 曜日パターン調整済みの月末売上予測。
 *
 * 仕組み:
 * 1. 実績日から曜日別平均売上を計算
 * 2. 未来日の曜日を取得
 * 3. 各未来日に対応する曜日平均売上を合算
 *
 * @param year 対象年
 * @param month 対象月 (1-12)
 * @param dailySales day → sales の Map (実績)
 * @param dataEndDay 実績の最終日
 */
export function projectDowAdjusted(
  year: number,
  month: number,
  dailySales: ReadonlyMap<number, number>,
  dataEndDay: number,
): number {
  const daysInMonth = new Date(year, month, 0).getDate()

  // 曜日別平均 (0=Sun ... 6=Sat)
  const dowBuckets = Array.from({ length: DAYS_PER_WEEK }, () => ({ total: 0, count: 0 }))
  for (const [day, sales] of dailySales) {
    if (sales > 0) {
      const dow = new Date(year, month - 1, day).getDay()
      dowBuckets[dow].total += sales
      dowBuckets[dow].count++
    }
  }

  const dowAvg = dowBuckets.map((b) => safeDivide(b.total, b.count, 0))

  // 実績合計
  let actualTotal = 0
  for (const [, sales] of dailySales) {
    actualTotal += sales
  }

  // 未来日の曜日平均を足す
  let projectedRemaining = 0
  for (let d = dataEndDay + 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    projectedRemaining += dowAvg[dow]
  }

  return actualTotal + projectedRemaining
}

// ─── Month-End Projection with Confidence ─────────────

/**
 * 複数手法による月末予測と信頼区間を一括計算する。
 */
export function calculateMonthEndProjection(
  year: number,
  month: number,
  dailySales: ReadonlyMap<number, number>,
): MonthEndProjection {
  const daysInMonth = new Date(year, month, 0).getDate()
  const entries = Array.from(dailySales.entries()).filter(([, v]) => v > 0)

  if (entries.length === 0) {
    return {
      linearProjection: 0,
      dowAdjustedProjection: 0,
      wmaProjection: 0,
      confidenceInterval: { lower: 0, upper: 0 },
      dailyTrend: 0,
      regressionProjection: 0,
    }
  }

  const values = entries.map(([, v]) => v)
  const actualTotal = values.reduce((s, v) => s + v, 0)
  const dataEndDay = Math.max(...entries.map(([d]) => d))
  const remainingDays = daysInMonth - dataEndDay

  // 1. 単純平均ベース
  const dailyAvg = actualTotal / entries.length
  const linearProjection = actualTotal + dailyAvg * remainingDays

  // 2. 曜日調整済み
  const dowAdjustedProjection = projectDowAdjusted(year, month, dailySales, dataEndDay)

  // 3. 加重移動平均ベース (直近の WMA 値を残日数に適用)
  const wmaEntries = calculateWMA(dailySales)
  const lastWma = wmaEntries.length > 0 ? wmaEntries[wmaEntries.length - 1].wma : dailyAvg
  const wmaProjection = actualTotal + lastWma * remainingDays

  // 4. 線形回帰ベース
  const reg = linearRegression(dailySales)
  let regressionProjection = actualTotal
  for (let d = dataEndDay + 1; d <= daysInMonth; d++) {
    regressionProjection += Math.max(0, reg.slope * d + reg.intercept)
  }

  // 5. 信頼区間 (95%, 正規分布近似)
  const { stdDev } = calculateStdDev(values)
  const standardError = stdDev / Math.sqrt(entries.length)
  const z95 = CONFIDENCE_95_ZSCORE
  const projectionUncertainty = z95 * standardError * remainingDays
  const bestEstimate = (linearProjection + dowAdjustedProjection + wmaProjection) / 3

  return {
    linearProjection: Math.round(linearProjection),
    dowAdjustedProjection: Math.round(dowAdjustedProjection),
    wmaProjection: Math.round(wmaProjection),
    confidenceInterval: {
      lower: Math.round(Math.max(0, bestEstimate - projectionUncertainty)),
      upper: Math.round(bestEstimate + projectionUncertainty),
    },
    dailyTrend: Math.round(reg.slope),
    regressionProjection: Math.round(regressionProjection),
  }
}

// ─── Weather-Adjusted Projection ─────────────────────

/** 天候補正済み予測の入力 */
export interface WeatherAdjustmentInput {
  /** 基準予測値（補正対象） */
  readonly baseProjection: number
  /** 予報データ（未来日のみ） */
  readonly forecasts: readonly DailyForecast[]
  /** 売上と気温の相関係数 (Pearson r) */
  readonly salesTempCorrelation: number
  /** 売上と降水量の相関係数 (Pearson r) */
  readonly salesPrecipCorrelation: number
  /** 平年気温 (°C) */
  readonly normalTemp: number
  /** 日平均売上（補正のベース単位） */
  readonly dailyAvgSales: number
}

/** 天候補正済み予測の出力 */
export interface WeatherAdjustedProjection {
  /** 天候補正済み予測値 */
  readonly adjustedProjection: number
  /** 補正量（正=上方、負=下方） */
  readonly adjustmentAmount: number
  /** 各予報日の補正内訳 */
  readonly dailyAdjustments: readonly {
    readonly dateKey: string
    readonly tempEffect: number
    readonly precipEffect: number
  }[]
}

/**
 * 天気予報と売上-天気相関を使い、月末予測を天候補正する。
 *
 * 補正ロジック:
 *   1. 各予報日の気温偏差 = 予報気温 - 平年気温
 *   2. 気温効果 = 相関係数 × (気温偏差 / 平年気温) × 日平均売上
 *   3. 降水効果 = 降水確率が高い場合、降水相関係数に基づく補正
 *   4. 合計補正量を baseProjection に加算
 *
 * @param input 天候補正入力パラメータ
 * @returns 天候補正済み予測
 */
export function weatherAdjustedProjection(
  input: WeatherAdjustmentInput,
): WeatherAdjustedProjection {
  const {
    baseProjection,
    forecasts,
    salesTempCorrelation,
    salesPrecipCorrelation,
    normalTemp,
    dailyAvgSales,
  } = input

  if (forecasts.length === 0 || dailyAvgSales === 0) {
    return { adjustedProjection: baseProjection, adjustmentAmount: 0, dailyAdjustments: [] }
  }

  const dailyAdjustments: {
    readonly dateKey: string
    readonly tempEffect: number
    readonly precipEffect: number
  }[] = []

  let totalAdjustment = 0

  for (const f of forecasts) {
    let tempEffect = 0
    let precipEffect = 0

    // 気温効果: 予報気温と平年値の偏差 × 相関係数
    if (f.tempMax != null && normalTemp !== 0) {
      const tempDeviation = (f.tempMax - normalTemp) / Math.abs(normalTemp)
      tempEffect = salesTempCorrelation * tempDeviation * dailyAvgSales
    }

    // 降水効果: 降水確率ベースの補正
    // 降水確率が50%以上の場合、相関係数に基づいて売上への影響を推定
    if (f.pop != null && f.pop >= 50) {
      const precipIntensity = f.pop / 100
      precipEffect = salesPrecipCorrelation * precipIntensity * dailyAvgSales * 0.5
    }

    const dayTotal = tempEffect + precipEffect
    totalAdjustment += dayTotal

    dailyAdjustments.push({ dateKey: f.dateKey, tempEffect, precipEffect })
  }

  return {
    adjustedProjection: Math.round(baseProjection + totalAdjustment),
    adjustmentAmount: Math.round(totalAdjustment),
    dailyAdjustments,
  }
}
