/**
 * budgetAnalysis モード切替ディスパッチャ (Bridge)
 *
 * factorDecompositionBridge / grossProfitBridge と同一パターン。
 * 3モードディスパッチ:
 *   - ts-only: TS 実装のみ
 *   - wasm-only: WASM のみ（初期化未完了時は TS フォールバック）
 *   - dual-run-compare: 両方実行→結果比較→差分ログ→TS 結果を返却
 *
 * bridge の責務: mode dispatch, fallback, dual-run compare, logging
 * bridge に含めないもの: metrics, timings, cache, mode persistence
 *
 * Note: calculateAggregateBudget は application 層の集約責務であり、
 * authoritative single-store core ではないため bridge に含めない。
 *
 * compare 対象: scalar フィールドのみ（dailyCumulative は除外）
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
import { getExecutionMode, getWasmState, getBudgetAnalysisWasmExports } from './wasmEngine'
import type { WasmState, ExecutionMode } from './wasmEngine'
import { calculateBudgetAnalysisWasm, calculateGrossProfitBudgetWasm } from './budgetAnalysisWasm'
import { recordCall, recordMismatch } from './dualRunObserver'

// Re-export types for consumer convenience
export type {
  BudgetAnalysisInput,
  BudgetAnalysisResult,
  GrossProfitBudgetInput,
  GrossProfitBudgetResult,
}

/* ── dual-run 差分ログフォーマット ────────────── */

type BudgetAnalysisFnName = 'calculateBudgetAnalysis' | 'calculateGrossProfitBudget'

export interface BudgetAnalysisMismatchLog {
  readonly function: BudgetAnalysisFnName
  readonly inputSummary: Record<string, number | undefined>
  readonly tsResult: Record<string, number>
  readonly wasmResult: Record<string, number>
  readonly diffs: Record<string, number>
  readonly maxAbsDiff: number
  readonly wasmState: WasmState
  readonly executionMode: ExecutionMode
}

/* ── 内部ヘルパー ─────────────────────────────── */

function isWasmReady(): boolean {
  return getBudgetAnalysisWasmExports() !== null
}

function isDualRun(): boolean {
  return import.meta.env.DEV && getExecutionMode() === 'dual-run-compare' && isWasmReady()
}

function compareScalarResults(
  fnName: BudgetAnalysisFnName,
  tsFields: Record<string, number>,
  wasmFields: Record<string, number>,
  inputSummary: Record<string, number | undefined>,
): void {
  const diffs: Record<string, number> = {}
  let maxAbsDiff = 0

  for (const key of Object.keys(tsFields)) {
    const diff = (wasmFields[key] ?? 0) - tsFields[key]
    diffs[key] = diff
    maxAbsDiff = Math.max(maxAbsDiff, Math.abs(diff))
  }

  if (maxAbsDiff > 1e-10) {
    const log: BudgetAnalysisMismatchLog = {
      function: fnName,
      inputSummary,
      tsResult: tsFields,
      wasmResult: wasmFields,
      diffs,
      maxAbsDiff,
      wasmState: getWasmState(),
      executionMode: getExecutionMode(),
    }
    console.warn('[budgetAnalysis dual-run mismatch]', log)
    recordMismatch(fnName, maxAbsDiff, 'ok', 'ok', inputSummary)
  }
}

/* ── 公開関数 ─────────────────────────────────── */

/**
 * 予算分析（単店 authoritative core）
 */
export function calculateBudgetAnalysis(input: BudgetAnalysisInput): BudgetAnalysisResult {
  if (import.meta.env.DEV) recordCall('calculateBudgetAnalysis')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateBudgetAnalysisTS(input)
  }

  if (mode === 'wasm-only') {
    return calculateBudgetAnalysisWasm(input)
  }

  // dual-run-compare
  const tsResult = calculateBudgetAnalysisTS(input)
  if (isDualRun()) {
    const wasmResult = calculateBudgetAnalysisWasm(input)
    compareScalarResults(
      'calculateBudgetAnalysis',
      {
        budgetAchievementRate: tsResult.budgetAchievementRate,
        budgetProgressRate: tsResult.budgetProgressRate,
        budgetElapsedRate: tsResult.budgetElapsedRate,
        budgetProgressGap: tsResult.budgetProgressGap,
        budgetVariance: tsResult.budgetVariance,
        averageDailySales: tsResult.averageDailySales,
        projectedSales: tsResult.projectedSales,
        projectedAchievement: tsResult.projectedAchievement,
        requiredDailySales: tsResult.requiredDailySales,
        remainingBudget: tsResult.remainingBudget,
      },
      {
        budgetAchievementRate: wasmResult.budgetAchievementRate,
        budgetProgressRate: wasmResult.budgetProgressRate,
        budgetElapsedRate: wasmResult.budgetElapsedRate,
        budgetProgressGap: wasmResult.budgetProgressGap,
        budgetVariance: wasmResult.budgetVariance,
        averageDailySales: wasmResult.averageDailySales,
        projectedSales: wasmResult.projectedSales,
        projectedAchievement: wasmResult.projectedAchievement,
        requiredDailySales: wasmResult.requiredDailySales,
        remainingBudget: wasmResult.remainingBudget,
      },
      { totalSales: input.totalSales, budget: input.budget, elapsedDays: input.elapsedDays },
    )
  }
  return tsResult
}

/**
 * 粗利予算分析（単店 authoritative core）
 */
export function calculateGrossProfitBudget(input: GrossProfitBudgetInput): GrossProfitBudgetResult {
  if (import.meta.env.DEV) recordCall('calculateGrossProfitBudget')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateGrossProfitBudgetTS(input)
  }

  if (mode === 'wasm-only') {
    return calculateGrossProfitBudgetWasm(input)
  }

  // dual-run-compare
  const tsResult = calculateGrossProfitBudgetTS(input)
  if (isDualRun()) {
    const wasmResult = calculateGrossProfitBudgetWasm(input)
    compareScalarResults(
      'calculateGrossProfitBudget',
      {
        grossProfitBudgetVariance: tsResult.grossProfitBudgetVariance,
        grossProfitProgressGap: tsResult.grossProfitProgressGap,
        requiredDailyGrossProfit: tsResult.requiredDailyGrossProfit,
        projectedGrossProfit: tsResult.projectedGrossProfit,
        projectedGPAchievement: tsResult.projectedGPAchievement,
      },
      {
        grossProfitBudgetVariance: wasmResult.grossProfitBudgetVariance,
        grossProfitProgressGap: wasmResult.grossProfitProgressGap,
        requiredDailyGrossProfit: wasmResult.requiredDailyGrossProfit,
        projectedGrossProfit: wasmResult.projectedGrossProfit,
        projectedGPAchievement: wasmResult.projectedGPAchievement,
      },
      {
        grossProfit: input.grossProfit,
        grossProfitBudget: input.grossProfitBudget,
        budgetElapsedRate: input.budgetElapsedRate,
      },
    )
  }
  return tsResult
}
