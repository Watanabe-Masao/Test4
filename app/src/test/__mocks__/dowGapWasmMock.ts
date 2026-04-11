/**
 * dow-gap-wasm 型付きモック（candidate: ANA-007）
 */
import { analyzeDowGap, countDowsInMonth } from '@/domain/calculations/dowGapAnalysis'

export default function init(): Promise<void> {
  return Promise.resolve()
}

export function analyze_dow_gap(
  currentCounts: Float64Array,
  previousCounts: Float64Array,
  prevDowSales: Float64Array,
  dailyAverageSales: number,
  _salesByDowFlat: Float64Array,
  _customersByDowFlat: Float64Array,
  _dowDataLengths: Uint32Array,
  _dailyAverageCustomers: number,
  _hasDailyData: boolean,
): Float64Array {
  // Reconstruct year/month from counts (reverse lookup not possible)
  // Mock uses 2025/1 vs 2024/1 as defaults — tests should provide via adapter
  const prevSales: number[] = []
  for (let d = 0; d < 7; d++) {
    prevSales.push(Number.isNaN(prevDowSales[d]) ? 0 : prevDowSales[d])
  }

  // Use TS implementation directly with simplified inputs
  const r = analyzeDowGap(2025, 1, 2024, 1, dailyAverageSales, prevSales)

  // Pack output (65 fields)
  const arr = new Float64Array(65)
  let off = 0
  arr[off++] = r.estimatedImpact
  for (let d = 0; d < 7; d++) arr[off++] = r.prevDowDailyAvg[d]
  for (let d = 0; d < 7; d++) arr[off++] = r.prevDowDailyAvgCustomers[d]
  arr[off++] = r.isValid ? 1.0 : 0.0
  arr[off++] = r.isSameStructure ? 1.0 : 0.0

  // Method results (zeros if no daily data)
  // Remaining 48 fields are already 0
  return arr
}
