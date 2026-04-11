/**
 * trend-analysis-wasm 型付きモック（candidate: ANA-004）
 */
import { analyzeTrend } from '@/domain/calculations/algorithms/trendAnalysis'

export default function init(): Promise<void> {
  return Promise.resolve()
}

export function analyze_trend(
  years: Int32Array,
  months: Int32Array,
  totalSales: Float64Array,
): Float64Array {
  const dataPoints = Array.from(years).map((year, i) => ({
    year,
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
  }))

  const r = analyzeTrend(dataPoints)
  const n = r.dataPoints.length

  // Pack same format as Rust lib.rs
  const total = 3 + 12 + 5 * n
  const arr = new Float64Array(total)
  let off = 0
  arr[off++] = n
  arr[off++] = r.overallTrend === 'up' ? 0 : r.overallTrend === 'down' ? 1 : 2
  arr[off++] = r.averageMonthlySales

  for (let i = 0; i < 12; i++) arr[off++] = r.seasonalIndex[i]

  // sorted indices: find original index for each sorted dataPoint
  for (let i = 0; i < n; i++) {
    const dp = r.dataPoints[i]
    const origIdx = dataPoints.findIndex((p) => p.year === dp.year && p.month === dp.month)
    arr[off++] = origIdx >= 0 ? origIdx : i
  }

  for (let i = 0; i < n; i++) arr[off++] = r.momChanges[i] ?? NaN
  for (let i = 0; i < n; i++) arr[off++] = r.yoyChanges[i] ?? NaN
  for (let i = 0; i < n; i++) arr[off++] = r.movingAvg3[i] ?? NaN
  for (let i = 0; i < n; i++) arr[off++] = r.movingAvg6[i] ?? NaN

  return arr
}
