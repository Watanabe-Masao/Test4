/**
 * forecast WASM wrapper
 *
 * compare 対象 5 関数の WASM adapter。
 * Rust/WASM 実装から Float64Array を受け取り、TS 型に変換する。
 *
 * compare 対象:
 *   - calculateStdDev
 *   - detectAnomalies
 *   - calculateWMA
 *   - linearRegression
 *   - analyzeTrend
 *
 * compare 対象外（Date 依存）:
 *   - getWeekRanges, calculateDayOfWeekAverages, calculateWeeklySummaries
 *   - projectDowAdjusted, calculateMonthEndProjection, calculateForecast
 *
 * @responsibility R:unclassified
 */
import type { AnomalyDetectionResult } from '@/domain/calculations/forecast'
import type {
  LinearRegressionResult,
  WMAEntry,
} from '@/domain/calculations/algorithms/advancedForecast'
import type {
  MonthlyDataPoint,
  TrendAnalysisResult,
} from '@/domain/calculations/algorithms/trendAnalysis'
import { getForecastWasmExports } from './wasmEngine'

/* ── 内部ヘルパー ── */

function getForecastWasm() {
  return getForecastWasmExports()!
}

/* ── WASM adapter 実装 ── */

export function calculateStdDevWasm(values: readonly number[]): { mean: number; stdDev: number } {
  const wasm = getForecastWasm()
  const arr = wasm.calculate_stddev(new Float64Array(values))
  return { mean: arr[0], stdDev: arr[1] }
}

export function detectAnomaliesWasm(
  dailySales: ReadonlyMap<number, number>,
  threshold = 2.0,
): readonly AnomalyDetectionResult[] {
  const entries = Array.from(dailySales.entries())
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a - b)
  if (entries.length < 3) return []

  const keys = new Float64Array(entries.map(([k]) => k))
  const vals = new Float64Array(entries.map(([, v]) => v))
  const wasm = getForecastWasm()
  const arr = wasm.detect_anomalies(keys, vals, threshold)
  const count = arr[0]
  const results: AnomalyDetectionResult[] = []
  for (let i = 0; i < count; i++) {
    const base = 1 + i * 6
    results.push({
      day: arr[base],
      value: arr[base + 1],
      mean: arr[base + 2],
      stdDev: arr[base + 3],
      zScore: arr[base + 4],
      isAnomaly: arr[base + 5] === 1.0,
    })
  }
  return results
}

export function calculateWMAWasm(
  dailySales: ReadonlyMap<number, number>,
  window = 5,
): readonly WMAEntry[] {
  const entries = Array.from(dailySales.entries())
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a - b)
  if (entries.length === 0) return []

  const keys = new Float64Array(entries.map(([k]) => k))
  const vals = new Float64Array(entries.map(([, v]) => v))
  const wasm = getForecastWasm()
  const arr = wasm.calculate_wma(keys, vals, window)
  const count = arr[0]
  const results: WMAEntry[] = []
  for (let i = 0; i < count; i++) {
    const base = 1 + i * 3
    results.push({
      day: arr[base],
      actual: arr[base + 1],
      wma: arr[base + 2],
    })
  }
  return results
}

export function linearRegressionWasm(
  dailySales: ReadonlyMap<number, number>,
): LinearRegressionResult {
  const entries = Array.from(dailySales.entries()).filter(([, v]) => v > 0)
  if (entries.length < 2) return { slope: 0, intercept: 0, rSquared: 0 }

  const keys = new Float64Array(entries.map(([k]) => k))
  const vals = new Float64Array(entries.map(([, v]) => v))
  const wasm = getForecastWasm()
  const arr = wasm.linear_regression(keys, vals)
  return {
    slope: arr[0],
    intercept: arr[1],
    rSquared: arr[2],
  }
}

export function analyzeTrendWasm(dataPoints: readonly MonthlyDataPoint[]): TrendAnalysisResult {
  if (dataPoints.length === 0) {
    return {
      dataPoints: [],
      momChanges: [],
      yoyChanges: [],
      movingAvg3: [],
      movingAvg6: [],
      seasonalIndex: Array(12).fill(1) as number[],
      overallTrend: 'flat',
      averageMonthlySales: 0,
    }
  }

  const years = new Float64Array(dataPoints.map((d) => d.year))
  const months = new Float64Array(dataPoints.map((d) => d.month))
  const totalSales = new Float64Array(dataPoints.map((d) => d.totalSales))

  const wasm = getForecastWasm()
  const arr = wasm.analyze_trend(years, months, totalSales)

  const n = arr[0]

  // Sort dataPoints the same way Rust does (by year, month)
  const sorted = [...dataPoints].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  )

  let offset = 1

  const momChanges: (number | null)[] = []
  for (let i = 0; i < n; i++) {
    const v = arr[offset + i]
    momChanges.push(Number.isNaN(v) ? null : v)
  }
  offset += n

  const yoyChanges: (number | null)[] = []
  for (let i = 0; i < n; i++) {
    const v = arr[offset + i]
    yoyChanges.push(Number.isNaN(v) ? null : v)
  }
  offset += n

  const movingAvg3: (number | null)[] = []
  for (let i = 0; i < n; i++) {
    const v = arr[offset + i]
    movingAvg3.push(Number.isNaN(v) ? null : v)
  }
  offset += n

  const movingAvg6: (number | null)[] = []
  for (let i = 0; i < n; i++) {
    const v = arr[offset + i]
    movingAvg6.push(Number.isNaN(v) ? null : v)
  }
  offset += n

  const seasonalIndex: number[] = []
  for (let i = 0; i < 12; i++) {
    seasonalIndex.push(arr[offset + i])
  }
  offset += 12

  const trendCode = arr[offset]
  const overallTrend: 'up' | 'down' | 'flat' =
    trendCode === 0 ? 'up' : trendCode === 1 ? 'down' : 'flat'
  const averageMonthlySales = arr[offset + 1]

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
