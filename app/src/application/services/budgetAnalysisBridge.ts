/**
 * budgetAnalysis モード切替ディスパッチャ (Bridge)
 *
 * forecastBridge / factorDecompositionBridge と同一パターン。
 * 現時点では ts-only モードのみ。WASM 実装後に dual-run-compare を追加する。
 *
 * bridge の責務: mode dispatch, 入口統一
 * bridge に含めないもの: metrics, timings, cache, mode persistence
 *
 * Note: calculateAggregateBudget は application 層の集約責務であり、
 * authoritative single-store core ではないため bridge に含めない。
 */
import {
  calculateBudgetAnalysis as calculateBudgetAnalysisTS,
  calculateGrossProfitBudget as calculateGrossProfitBudgetTS,
} from '@/domain/calculations/budgetAnalysis'
import type {
  BudgetAnalysisInput,
  BudgetAnalysisResult,
  GrossProfitBudgetInput,
  GrossProfitBudgetResult,
} from '@/domain/calculations/budgetAnalysis'

// Re-export types for consumer convenience
export type {
  BudgetAnalysisInput,
  BudgetAnalysisResult,
  GrossProfitBudgetInput,
  GrossProfitBudgetResult,
}

/* ── 公開関数（ts-only） ────────────────────────── */

/**
 * 予算分析（単店 authoritative core）
 *
 * Bridge エントリポイント 1: 予算達成率・進捗・月末予測
 */
export function calculateBudgetAnalysis(input: BudgetAnalysisInput): BudgetAnalysisResult {
  // TODO: Phase 7 で dual-run-compare / wasm-only を追加
  return calculateBudgetAnalysisTS(input)
}

/**
 * 粗利予算分析（単店 authoritative core）
 *
 * Bridge エントリポイント 2: 粗利予算達成率・進捗差・月末予測
 */
export function calculateGrossProfitBudget(
  input: GrossProfitBudgetInput,
): GrossProfitBudgetResult {
  return calculateGrossProfitBudgetTS(input)
}
