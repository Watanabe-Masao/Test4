/**
 * budgetAnalysis WASM business-authoritative bridge
 *
 * @semanticClass business
 * @bridgeKind business
 * @contractId BIZ-003
 *
 * WASM が ready なら scalar フィールドは WASM 実装を使用する。
 * dailyCumulative は WASM 側で計算しないため、常に TS 実装から補完する。
 * 未初期化時は全体を TS にフォールバックする。
 *
 * Note: calculateAggregateBudget は application 層の集約責務であり bridge に含めない。
 *
 * @see references/03-guides/contract-definition-policy.md — 契約定義ポリシー
 * @see references/01-principles/semantic-classification-policy.md — 意味分類ポリシー
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
import { getBudgetAnalysisWasmExports } from './wasmEngine'
import { calculateBudgetAnalysisWasm, calculateGrossProfitBudgetWasm } from './budgetAnalysisWasm'

// Re-export types for consumer convenience
export type {
  BudgetAnalysisInput,
  BudgetAnalysisResult,
  GrossProfitBudgetInput,
  GrossProfitBudgetResult,
}

function isWasmReady(): boolean {
  return getBudgetAnalysisWasmExports() !== null
}

/**
 * 予算分析（単店 authoritative core）
 *
 * scalar フィールドは WASM authoritative。
 * dailyCumulative は WASM 未実装のため TS から補完する（類型 B）。
 */
export function calculateBudgetAnalysis(input: BudgetAnalysisInput): BudgetAnalysisResult {
  if (!isWasmReady()) return calculateBudgetAnalysisTS(input)

  const wasmResult = calculateBudgetAnalysisWasm(input)
  const tsResult = calculateBudgetAnalysisTS(input)
  return { ...wasmResult, dailyCumulative: tsResult.dailyCumulative }
}

/**
 * 粗利予算分析（単店 authoritative core）
 *
 * 全フィールドが scalar のため、WASM が ready なら WASM のみ。
 */
export function calculateGrossProfitBudget(input: GrossProfitBudgetInput): GrossProfitBudgetResult {
  if (isWasmReady()) return calculateGrossProfitBudgetWasm(input)
  return calculateGrossProfitBudgetTS(input)
}
