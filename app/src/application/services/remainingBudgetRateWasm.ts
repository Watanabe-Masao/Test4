/**
 * remainingBudgetRate WASM wrapper (candidate)
 * @contractId BIZ-008
 * @semanticClass business
 * @authorityKind candidate-authoritative
 *
 * @responsibility R:unclassified
 */
import type { RemainingBudgetRateInput } from '@/domain/calculations/remainingBudgetRate'
import { getRemainingBudgetRateWasmExports } from './wasmEngine'

function getWasm() {
  return getRemainingBudgetRateWasmExports()!
}

/**
 * Map<number, number> を Float64Array に変換する。
 * index i = day (i+1) の予算。daysInMonth 長の配列。
 */
function mapToFloat64Array(
  budgetDaily: ReadonlyMap<number, number>,
  daysInMonth: number,
): Float64Array {
  const arr = new Float64Array(daysInMonth)
  for (let d = 1; d <= daysInMonth; d++) {
    arr[d - 1] = budgetDaily.get(d) ?? 0
  }
  return arr
}

export function calculateRemainingBudgetRateWasm(input: RemainingBudgetRateInput): number {
  const wasm = getWasm()
  const dailyArr = mapToFloat64Array(input.budgetDaily, input.daysInMonth)
  return wasm.calculate_remaining_budget_rate(
    input.budget,
    input.totalSales,
    dailyArr,
    input.elapsedDays,
    input.daysInMonth,
  )
}
