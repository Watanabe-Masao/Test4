/**
 * budgetAnalysis WASM wrapper
 *
 * WASM の Float64Array 戻り値を既存の型に変換する薄い adapter。
 * ロジック判断・比較・モード判断・フォールバックは一切含めない（bridge の責務）。
 *
 * 現時点では WASM 実装は存在しないため、getWasmExports() 経由で
 * 将来の WASM export を呼び出す形のスタブとする。
 * WASM モジュールに budgetAnalysis 関数が追加されるまで、これらの関数は
 * bridge の vi.mock でモックされた状態でのみテストから呼ばれる。
 */
import type {
  BudgetAnalysisInput,
  BudgetAnalysisResult,
  GrossProfitBudgetInput,
  GrossProfitBudgetResult,
} from '@/domain/calculations/budgetAnalysis'
import { getWasmExports } from './wasmEngine'

/* ── 将来の WASM export 型定義 ─────────────────── */

/**
 * budgetAnalysis WASM モジュールが export する関数の型。
 * Rust 実装完了後、wasm-bindgen が生成する型に置き換える。
 */
interface BudgetAnalysisWasmExports {
  calculate_budget_analysis: (
    totalSales: number,
    budget: number,
    days: number[],
    budgetDays: Float64Array,
    salesDays: Float64Array,
    elapsedDays: number,
    salesDaysCount: number,
    daysInMonth: number,
  ) => Float64Array
  calculate_gross_profit_budget: (...args: number[]) => Float64Array
}

function getBudgetAnalysisWasm(): BudgetAnalysisWasmExports {
  return getWasmExports()! as unknown as BudgetAnalysisWasmExports
}

/* ── WASM 呼び出し wrapper ────────────────────── */

export function calculateBudgetAnalysisWasm(
  input: BudgetAnalysisInput,
): BudgetAnalysisResult {
  const wasm = getBudgetAnalysisWasm()

  // budgetDaily / salesDaily を並列配列として渡す
  const days = Object.keys(input.budgetDaily).map(Number).sort((a, b) => a - b)
  const budgetDays = new Float64Array(days.map((d) => input.budgetDaily[d] ?? 0))
  const salesDays = new Float64Array(days.map((d) => input.salesDaily[d] ?? 0))

  const arr = wasm.calculate_budget_analysis(
    input.totalSales,
    input.budget,
    days,
    budgetDays,
    salesDays,
    input.elapsedDays,
    input.salesDays,
    input.daysInMonth,
  )

  // dailyCumulative は WASM 側でも計算されるが、
  // compare 対象は scalar フィールドのみ。ここでは空で返す。
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
