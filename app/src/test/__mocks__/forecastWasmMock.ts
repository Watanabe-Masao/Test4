/**
 * forecast-wasm 型付きモック
 *
 * Rust WASM モジュールの API サーフェスを模倣する。
 * compare 対象 5 関数を TS ドメイン関数へのパススルーで実装。
 */
import { detectAnomalies as detectAnomaliesTS } from '@/domain/calculations/forecast'
import { calculateStdDev as calculateStdDevTS } from '@/domain/calculations/forecast'
import {
  calculateWMA as calculateWMATS,
  linearRegression as linearRegressionTS,
} from '@/domain/calculations/algorithms/advancedForecast'
import { analyzeTrend as analyzeTrendTS } from '@/domain/calculations/algorithms/trendAnalysis'
import type { MonthlyDataPoint } from '@/domain/calculations/algorithms/trendAnalysis'

export default function init(): Promise<void> {
  return Promise.resolve()
}

/** [mean, stdDev] */
export function calculate_stddev(values: Float64Array): Float64Array {
  const r = calculateStdDevTS(Array.from(values))
  return Float64Array.from([r.mean, r.stdDev])
}

/**
 * [count, day0, value0, mean0, stdDev0, zScore0, isAnomaly0, ...]
 * isAnomaly: 1.0 = true, 0.0 = false
 */
export function detect_anomalies(
  keys: Float64Array,
  values: Float64Array,
  threshold: number,
): Float64Array {
  const dailySales = new Map<number, number>()
  for (let i = 0; i < keys.length; i++) {
    dailySales.set(keys[i], values[i])
  }
  const results = detectAnomaliesTS(dailySales, threshold)
  const arr = new Float64Array(1 + results.length * 6)
  arr[0] = results.length
  for (let i = 0; i < results.length; i++) {
    const base = 1 + i * 6
    const entry = results[i]
    arr[base] = entry.day
    arr[base + 1] = entry.value
    arr[base + 2] = entry.mean
    arr[base + 3] = entry.stdDev
    arr[base + 4] = entry.zScore
    arr[base + 5] = entry.isAnomaly ? 1.0 : 0.0
  }
  return arr
}

/**
 * [count, day0, actual0, wma0, ...]
 */
export function calculate_wma(
  keys: Float64Array,
  values: Float64Array,
  window: number,
): Float64Array {
  const dailySales = new Map<number, number>()
  for (let i = 0; i < keys.length; i++) {
    dailySales.set(keys[i], values[i])
  }
  const results = calculateWMATS(dailySales, window)
  const arr = new Float64Array(1 + results.length * 3)
  arr[0] = results.length
  for (let i = 0; i < results.length; i++) {
    const base = 1 + i * 3
    arr[base] = results[i].day
    arr[base + 1] = results[i].actual
    arr[base + 2] = results[i].wma
  }
  return arr
}

/** [slope, intercept, rSquared] */
export function linear_regression(keys: Float64Array, values: Float64Array): Float64Array {
  const dailySales = new Map<number, number>()
  for (let i = 0; i < keys.length; i++) {
    dailySales.set(keys[i], values[i])
  }
  const r = linearRegressionTS(dailySales)
  return Float64Array.from([r.slope, r.intercept, r.rSquared])
}

/**
 * [N, momChanges(N), yoyChanges(N), movingAvg3(N), movingAvg6(N),
 *  seasonalIndex(12), overallTrend, averageMonthlySales]
 * NaN = null。overallTrend: 0=up, 1=down, 2=flat
 */
export function analyze_trend(
  years: Float64Array,
  months: Float64Array,
  totalSales: Float64Array,
): Float64Array {
  const dataPoints: MonthlyDataPoint[] = []
  for (let i = 0; i < years.length; i++) {
    dataPoints.push({
      year: years[i],
      month: months[i],
      totalSales: totalSales[i],
      totalCustomers: null,
      grossProfit: null,
      grossProfitRate: null,
      budget: null,
      budgetAchievement: null,
      storeCount: 1,
      discountRate: null,
      costRate: null,
      costInclusionRate: null,
      averageMarkupRate: null,
    })
  }
  const r = analyzeTrendTS(dataPoints)
  const n = r.momChanges.length
  const totalLen = 1 + n * 4 + 12 + 1 + 1
  const arr = new Float64Array(totalLen)

  arr[0] = n
  let offset = 1

  for (const v of r.momChanges) {
    arr[offset++] = v ?? NaN
  }
  for (const v of r.yoyChanges) {
    arr[offset++] = v ?? NaN
  }
  for (const v of r.movingAvg3) {
    arr[offset++] = v ?? NaN
  }
  for (const v of r.movingAvg6) {
    arr[offset++] = v ?? NaN
  }
  for (const v of r.seasonalIndex) {
    arr[offset++] = v
  }
  arr[offset] = r.overallTrend === 'up' ? 0 : r.overallTrend === 'down' ? 1 : 2
  arr[offset + 1] = r.averageMonthlySales

  return arr
}
