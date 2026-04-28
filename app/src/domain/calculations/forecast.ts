/**
 * @responsibility R:unclassified
 */

import { z } from 'zod'
import { safeDivide } from './utils'
import { DAYS_PER_WEEK, ANOMALY_ZSCORE_THRESHOLD } from '@/domain/constants'

/**
 * 予測・異常値検出
 */

// ─── Zod Schemas ─────────────────────────────────────

export const WeeklySummarySchema = z.object({
  weekNumber: z.number(),
  startDay: z.number(),
  endDay: z.number(),
  totalSales: z.number(),
  totalGrossProfit: z.number(),
  grossProfitRate: z.number(),
  days: z.number(),
})
export type WeeklySummary = z.infer<typeof WeeklySummarySchema>

export const DayOfWeekAverageSchema = z.object({
  dayOfWeek: z.number(),
  averageSales: z.number(),
  count: z.number(),
})
export type DayOfWeekAverage = z.infer<typeof DayOfWeekAverageSchema>

export const AnomalyDetectionResultSchema = z.object({
  day: z.number(),
  value: z.number(),
  mean: z.number(),
  stdDev: z.number(),
  zScore: z.number(),
  isAnomaly: z.boolean(),
})
export type AnomalyDetectionResult = z.infer<typeof AnomalyDetectionResultSchema>

export const ForecastResultSchema = z.object({
  weeklySummaries: z.array(WeeklySummarySchema).readonly(),
  dayOfWeekAverages: z.array(DayOfWeekAverageSchema).readonly(),
  anomalies: z.array(AnomalyDetectionResultSchema).readonly(),
})
export type ForecastResult = z.infer<typeof ForecastResultSchema>

/** 予測入力（Map ベースのため Zod スキーマは出力のみ） */
export interface ForecastInput {
  readonly year: number
  readonly month: number
  readonly dailySales: ReadonlyMap<number, number>
  readonly dailyGrossProfit: ReadonlyMap<number, number>
}

/**
 * 標準偏差を計算
 */
export function calculateStdDev(values: readonly number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 }
  const mean = safeDivide(
    values.reduce((s, v) => s + v, 0),
    values.length,
    0,
  )
  const variance = safeDivide(
    values.reduce((s, v) => s + (v - mean) ** 2, 0),
    values.length,
    0,
  )
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
    const dayOfWeek = (date.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK // Monday=0

    // 週末（日曜）までか月末まで進める
    const daysUntilSunday = DAYS_PER_WEEK - 1 - dayOfWeek
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
  const buckets: { total: number; count: number }[] = Array.from({ length: DAYS_PER_WEEK }, () => ({
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
  threshold = ANOMALY_ZSCORE_THRESHOLD,
): readonly AnomalyDetectionResult[] {
  const entries = Array.from(dailySales.entries()).filter(([, v]) => v > 0)
  if (entries.length < 3) return []

  const values = entries.map(([, v]) => v)
  const { mean, stdDev } = calculateStdDev(values)

  if (stdDev === 0) return []

  return entries
    .map(([day, value]) => {
      const zScore = safeDivide(value - mean, stdDev, 0)
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
/** @calc-id CALC-008 */
export function calculateForecast(input: ForecastInput): ForecastResult {
  return {
    weeklySummaries: calculateWeeklySummaries(input),
    dayOfWeekAverages: calculateDayOfWeekAverages(input),
    anomalies: detectAnomalies(input.dailySales),
  }
}
