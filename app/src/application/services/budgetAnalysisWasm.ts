/**
 * budgetAnalysis WASM wrapper
 *
 * WASM の Float64Array 戻り値を既存の型に変換する薄い adapter。
 * ロジック判断・比較・モード判断・フォールバックは一切含めない（bridge の責務）。
 *
 * Rust 実装 (wasm/budget-analysis/) の wasm-bindgen export を呼び出す。
 */
import type {
  BudgetAnalysisInput,
  BudgetAnalysisResult,
  GrossProfitBudgetInput,
  GrossProfitBudgetResult,
} from '@/domain/calculations/budgetAnalysis'
import { getBudgetAnalysisWasmExports } from './wasmEngine'

/* ── WASM export 取得 ──────────────────────────── */

function getBudgetAnalysisWasm() {
  return getBudgetAnalysisWasmExports()!
}

/* ── WASM 呼び出し wrapper ────────────────────── */

export function calculateBudgetAnalysisWasm(
  input: BudgetAnalysisInput,
): BudgetAnalysisResult {
  const wasm = getBudgetAnalysisWasm()

  // budgetDaily / salesDaily を daysInMonth 長の flat array に変換
  // index i = day (i+1) の値。欠損は 0。
  const budgetDailyArr = new Float64Array(input.daysInMonth)
  const salesDailyArr = new Float64Array(input.daysInMonth)
  for (let d = 1; d <= input.daysInMonth; d++) {
    budgetDailyArr[d - 1] = input.budgetDaily[d] ?? 0
    salesDailyArr[d - 1] = input.salesDaily[d] ?? 0
  }

  const arr = wasm.calculate_budget_analysis(
    input.totalSales,
    input.budget,
    budgetDailyArr,
    input.elapsedDays,
    input.salesDays,
    input.daysInMonth,
  )

  // dailyCumulative は WASM 側では計算しない。
  // compare 対象は scalar フィールドのみ。
  return {
    budgetAchievementRate: arr[0],
    budgetProgressRate: arr[1],
    budgetElapsedRate: arr[2],
    budgetProgressGap: arr[3],
    budgetVariance: arr[4],
    averageDailySales: arr[5],
    projectedSales: arr[6],
    projectedAchievement: arr[7],
    requiredDailySales: arr[8],
    remainingBudget: arr[9],
    dailyCumulative: {},
  }
}

export function calculateGrossProfitBudgetWasm(
  input: GrossProfitBudgetInput,
): GrossProfitBudgetResult {
  const wasm = getBudgetAnalysisWasm()
  const arr = wasm.calculate_gross_profit_budget(
    input.grossProfit,
    input.grossProfitBudget,
    input.budgetElapsedRate,
    input.elapsedDays,
    input.salesDays,
    input.daysInMonth,
  )
  return {
    grossProfitBudgetVariance: arr[0],
    grossProfitProgressGap: arr[1],
    requiredDailyGrossProfit: arr[2],
    projectedGrossProfit: arr[3],
    projectedGPAchievement: arr[4],
  }
}
