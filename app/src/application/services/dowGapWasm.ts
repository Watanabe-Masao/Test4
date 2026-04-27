/**
 * dowGapAnalysis WASM wrapper (candidate)
 *
 * countDowsInMonth（Date 依存）は TS adapter の責務。
 * Rust kernel は pre-computed な曜日カウントを受け取る。
 *
 * @contractId ANA-007
 * @semanticClass analytic
 * @authorityKind candidate-authoritative
 *
 * @responsibility R:unclassified
 */
import type {
  DowDayCount,
  DowGapAnalysis,
  DowGapMethod,
  DowMethodResult,
} from '@/domain/models/ComparisonContext'
import { countDowsInMonth } from '@/domain/calculations/dowGapAnalysis'
import type { DowGapDailyData } from '@/domain/calculations/dowGapAnalysis'
import { DAYS_PER_WEEK } from '@/domain/constants'
import { getDowGapWasmExports } from './wasmEngine'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const
const METHODS: DowGapMethod[] = ['mean', 'median', 'adjustedMean']

function getWasm() {
  return getDowGapWasmExports()!
}

/**
 * DowGapDailyData の 2D 配列を column-major flat array に正規化する。
 */
function flattenDowData(
  byDow: readonly (readonly number[])[],
  lengths: Uint32Array,
): Float64Array<ArrayBuffer> {
  let totalLen = 0
  for (let d = 0; d < DAYS_PER_WEEK; d++) totalLen += lengths[d]

  const flat = new Float64Array(totalLen)
  let offset = 0
  for (let d = 0; d < DAYS_PER_WEEK; d++) {
    const arr = byDow[d] ?? []
    for (let i = 0; i < lengths[d]; i++) {
      flat[offset++] = i < arr.length ? arr[i] : 0
    }
  }
  return flat
}

export function analyzeDowGapWasm(
  currentYear: number,
  currentMonth: number,
  previousYear: number,
  previousMonth: number,
  dailyAverageSales: number,
  prevDowSales?: readonly number[],
  dailyData?: DowGapDailyData,
): DowGapAnalysis {
  const wasm = getWasm()

  // TS adapter: Date 計算は TS 側の責務
  const currentCounts = new Float64Array(countDowsInMonth(currentYear, currentMonth))
  const previousCounts = new Float64Array(countDowsInMonth(previousYear, previousMonth))

  // prevDowSales: NaN = no data
  const prevSales = new Float64Array(DAYS_PER_WEEK)
  for (let d = 0; d < DAYS_PER_WEEK; d++) {
    prevSales[d] = prevDowSales && prevDowSales[d] != null ? prevDowSales[d] : NaN
  }

  // Daily data flattening
  const hasDailyData = dailyData != null
  const dowDataLengths = new Uint32Array(DAYS_PER_WEEK)
  let salesFlat = new Float64Array(0)
  let custFlat = new Float64Array(0)
  let dailyAvgCustomers = 0

  if (dailyData) {
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      dowDataLengths[d] = (dailyData.salesByDow[d] ?? []).length
    }
    salesFlat = flattenDowData(dailyData.salesByDow, dowDataLengths)
    custFlat = flattenDowData(dailyData.customersByDow, dowDataLengths)
    dailyAvgCustomers = dailyData.dailyAverageCustomers
  }

  const out = wasm.analyze_dow_gap(
    currentCounts,
    previousCounts,
    prevSales,
    dailyAverageSales,
    salesFlat,
    custFlat,
    dowDataLengths,
    dailyAvgCustomers,
    hasDailyData,
  )

  // Decode output: [estimatedImpact, prevDowDailyAvg[7], prevDowDailyAvgCustomers[7],
  //   isValid, isSameStructure, methods×3 × (salesImpact, customerImpact, dowAvgSales[7], dowAvgCustomers[7])]
  let off = 0
  const estimatedImpact = out[off++]

  const prevDowDailyAvg: number[] = []
  for (let d = 0; d < 7; d++) prevDowDailyAvg.push(out[off++])

  const prevDowDailyAvgCustomers: number[] = []
  for (let d = 0; d < 7; d++) prevDowDailyAvgCustomers.push(out[off++])

  const isValid = out[off++] === 1.0
  const isSameStructure = out[off++] === 1.0

  // DOW counts
  const dowCounts: DowDayCount[] = []
  for (let d = 0; d < DAYS_PER_WEEK; d++) {
    dowCounts.push({
      dow: d,
      label: DOW_LABELS[d],
      currentCount: currentCounts[d],
      previousCount: previousCounts[d],
      diff: currentCounts[d] - previousCounts[d],
    })
  }

  // Method results
  const result: Partial<{
    methodResults: Record<DowGapMethod, DowMethodResult>
  }> = {}

  if (hasDailyData) {
    const methodResults = {} as Record<DowGapMethod, DowMethodResult>
    for (const method of METHODS) {
      const salesImpact = out[off++]
      const customerImpact = out[off++]
      const dowAvgSales: number[] = []
      for (let d = 0; d < 7; d++) dowAvgSales.push(out[off++])
      const dowAvgCustomers: number[] = []
      for (let d = 0; d < 7; d++) dowAvgCustomers.push(out[off++])
      methodResults[method] = { salesImpact, customerImpact, dowAvgSales, dowAvgCustomers }
    }
    result.methodResults = methodResults
  }

  // Warnings (TS 側の責務 — 文字列生成は WASM に持ち込まない)
  const hasPrevDowSales = prevDowSales != null && prevDowSales.some((v) => v > 0)
  const missingDataWarnings: string[] = []
  if (!hasPrevDowSales) {
    missingDataWarnings.push('前年の曜日別売上データがありません（全体平均で代替しています）')
  }
  if (dailyAverageSales <= 0) {
    missingDataWarnings.push('当年の日平均売上データがありません')
  }
  if (isSameStructure) {
    missingDataWarnings.push(
      `${currentYear}年${currentMonth}月と${previousYear}年${previousMonth}月は曜日構成が同一のため、平均法の影響額は0です（実日法で境界日の売上差を確認できます）`,
    )
  }

  return {
    dowCounts,
    estimatedImpact,
    isValid,
    prevDowDailyAvg,
    prevDowDailyAvgCustomers,
    ...result,
    hasPrevDowSales: hasPrevDowSales,
    isSameStructure,
    missingDataWarnings,
  }
}
