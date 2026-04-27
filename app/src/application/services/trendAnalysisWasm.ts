/**
 * trendAnalysis WASM wrapper (candidate)
 * @contractId ANA-004
 * @semanticClass analytic
 * @authorityKind candidate-authoritative
 *
 * @responsibility R:unclassified
 */
import type {
  MonthlyDataPoint,
  TrendAnalysisResult,
} from '@/domain/calculations/algorithms/trendAnalysis'
import { getTrendAnalysisWasmExports } from './wasmEngine'

const TREND_MAP: readonly ('up' | 'down' | 'flat')[] = ['up', 'down', 'flat']

function getWasm() {
  return getTrendAnalysisWasmExports()!
}

export function analyzeTrendWasm(dataPoints: readonly MonthlyDataPoint[]): TrendAnalysisResult {
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

  const wasm = getWasm()
  const years = new Int32Array(dataPoints.map((d) => d.year))
  const months = new Int32Array(dataPoints.map((d) => d.month))
  const sales = new Float64Array(dataPoints.map((d) => d.totalSales))

  const arr = wasm.analyze_trend(years, months, sales)

  // Unpack: [n, overallTrend, avgMonthlySales, seasonal[12], sortedIndices[n], mom[n], yoy[n], ma3[n], ma6[n]]
  let off = 0
  const n = arr[off++]
  const overallTrend = TREND_MAP[arr[off++]] ?? 'flat'
  const averageMonthlySales = arr[off++]

  const seasonalIndex: number[] = []
  for (let i = 0; i < 12; i++) seasonalIndex.push(arr[off++])

  const sortedIndices: number[] = []
  for (let i = 0; i < n; i++) sortedIndices.push(arr[off++])

  const momChanges: (number | null)[] = []
  for (let i = 0; i < n; i++) {
    const v = arr[off++]
    momChanges.push(Number.isNaN(v) ? null : v)
  }

  const yoyChanges: (number | null)[] = []
  for (let i = 0; i < n; i++) {
    const v = arr[off++]
    yoyChanges.push(Number.isNaN(v) ? null : v)
  }

  const movingAvg3: (number | null)[] = []
  for (let i = 0; i < n; i++) {
    const v = arr[off++]
    movingAvg3.push(Number.isNaN(v) ? null : v)
  }

  const movingAvg6: (number | null)[] = []
  for (let i = 0; i < n; i++) {
    const v = arr[off++]
    movingAvg6.push(Number.isNaN(v) ? null : v)
  }

  // Reorder dataPoints by sorted indices
  const sortedDataPoints = sortedIndices.map((i) => dataPoints[i])

  return {
    dataPoints: sortedDataPoints,
    momChanges,
    yoyChanges,
    movingAvg3,
    movingAvg6,
    seasonalIndex,
    overallTrend,
    averageMonthlySales,
  }
}
