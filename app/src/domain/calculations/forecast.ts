import { safeDivide } from './utils'

/**
 * 予測・異常値検出
 */

/** 週別サマリー */
export interface WeeklySummary {
  readonly weekNumber: number // 1-based
  readonly startDay: number
  readonly endDay: number
  readonly totalSales: number
  readonly totalGrossProfit: number
  readonly grossProfitRate: number
  readonly days: number // 営業日数
}

/** 曜日別平均 */
export interface DayOfWeekAverage {
  readonly dayOfWeek: number // 0=Sun, 1=Mon, ... 6=Sat
  readonly averageSales: number
  readonly count: number
}

/** 異常値検出結果 */
export interface AnomalyDetectionResult {
  readonly day: number
  readonly value: number
  readonly mean: number
  readonly stdDev: number
  readonly zScore: number
  readonly isAnomaly: boolean
}

/** 予測入力 */
export interface ForecastInput {
  readonly year: number
  readonly month: number // 1-12
  readonly dailySales: ReadonlyMap<number, number> // day → sales
  readonly dailyGrossProfit: ReadonlyMap<number, number> // day → grossProfit
}

/** 予測結果 */
export interface ForecastResult {
  readonly weeklySummaries: readonly WeeklySummary[]
  readonly dayOfWeekAverages: readonly DayOfWeekAverage[]
  readonly anomalies: readonly AnomalyDetectionResult[]
}

/**
 * 標準偏差を計算
 */
export function calculateStdDev(values: readonly number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 }
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return { mean, stdDev: Math.sqrt(variance) }
}

/**
 * 週番号の開始日・終了日を月曜始まりで計算する
 */
export function getWeekRanges(
  year: number,
  month: number,
): readonly { weekNumber: number; startDay: number; endDay: number }[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  const weeks: { weekNumber: number; startDay: number; endDay: number }[] = []
  let weekNum = 1
  let day = 1

  while (day <= daysInMonth) {
    const startDay = day
    const date = new Date(year, month - 1, day)
    // 0=Sun → 6, 1=Mon → 0, ... 6=Sat → 5
    const dayOfWeek = (date.getDay() + 6) % 7 // Monday=0

    // 週末（日曜）までか月末まで進める
    const daysUntilSunday = 6 - dayOfWeek
    const endDay = Math.min(day + daysUntilSunday, daysInMonth)

    weeks.push({ weekNumber: weekNum, startDay, endDay })
    weekNum++
    day = endDay + 1
  }

  return weeks
}

/**
 * 週別サマリーを計算する
 */
export function calculateWeeklySummaries(input: ForecastInput): readonly WeeklySummary[] {
  const { year, month, dailySales, dailyGrossProfit } = input
  const weekRanges = getWeekRanges(year, month)

  return weekRanges.map(({ weekNumber, startDay, endDay }) => {
    let totalSales = 0
    let totalGrossProfit = 0
    let days = 0

    for (let d = startDay; d <= endDay; d++) {
      const sales = dailySales.get(d) ?? 0
      if (sales > 0) days++
      totalSales += sales
      totalGrossProfit += dailyGrossProfit.get(d) ?? 0
    }

    return {
      weekNumber,
      startDay,
      endDay,
      totalSales,
      totalGrossProfit,
      grossProfitRate: safeDivide(totalGrossProfit, totalSales, 0),
      days,
    }
  })
}

/**
 * 曜日別平均を計算する
 */
export function calculateDayOfWeekAverages(input: ForecastInput): readonly DayOfWeekAverage[] {
  const { year, month, dailySales } = input
  const daysInMonth = new Date(year, month, 0).getDate()
  const buckets: { total: number; count: number }[] = Array.from({ length: 7 }, () => ({
    total: 0,
    count: 0,
  }))

  for (let d = 1; d <= daysInMonth; d++) {
    const sales = dailySales.get(d) ?? 0
    if (sales > 0) {
      const dow = new Date(year, month - 1, d).getDay() // 0=Sun
      buckets[dow].total += sales
      buckets[dow].count++
    }
  }

  return buckets.map((b, i) => ({
    dayOfWeek: i,
    averageSales: safeDivide(b.total, b.count, 0),
    count: b.count,
  }))
}

/**
 * 異常値検出（平均±標準偏差からの乖離）
 */
export function detectAnomalies(
  dailySales: ReadonlyMap<number, number>,
  threshold = 2.0,
): readonly AnomalyDetectionResult[] {
  const entries = Array.from(dailySales.entries()).filter(([, v]) => v > 0)
  if (entries.length < 3) return []

  const values = entries.map(([, v]) => v)
  const { mean, stdDev } = calculateStdDev(values)

  if (stdDev === 0) return []

  return entries
    .map(([day, value]) => {
      const zScore = (value - mean) / stdDev
      return {
        day,
        value,
        mean,
        stdDev,
        zScore,
        isAnomaly: Math.abs(zScore) > threshold,
      }
    })
    .filter((r) => r.isAnomaly)
}

/**
 * 予測分析をまとめて実行する
 */
export function calculateForecast(input: ForecastInput): ForecastResult {
  return {
    weeklySummaries: calculateWeeklySummaries(input),
    dayOfWeekAverages: calculateDayOfWeekAverages(input),
    anomalies: detectAnomalies(input.dailySales),
  }
}
