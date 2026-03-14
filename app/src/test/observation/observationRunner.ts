/**
 * Observation Runner — 自動観測ハーネスのコア
 *
 * 各 engine の bridge 関数を固定フィクスチャで実行し、
 * dualRunObserver の summary / log を回収する。
 *
 * 責務:
 * - compare mode セットアップ
 * - observer リセット
 * - bridge 関数の一括実行
 * - summary / log の回収
 */
import { dualRunStatsHandler } from '@/application/services/dualRunObserver'

export type ObservationTarget =
  | 'grossProfit'
  | 'budgetAnalysis'
  | 'forecast'
  | 'factorDecomposition'

export interface ObservationSummary {
  readonly totalCalls: number
  readonly totalMismatches: number
  readonly totalNullMismatches: number
  readonly totalInvariantViolations: number
  readonly globalMaxAbsDiff: number
  readonly byFunction: Record<string, FnStats>
  readonly verdict: 'clean' | 'tolerance-only' | 'needs-investigation'
}

export interface FnStats {
  readonly calls: number
  readonly mismatches: number
  readonly nullMismatches: number
  readonly invariantViolations: number
  readonly maxAbsDiff: number
  readonly lastCallAt: string | null
  readonly lastMismatchAt: string | null
}

export interface MismatchEntry {
  readonly timestamp: string
  readonly function: string
  readonly maxAbsDiff: number
  readonly sumInvariantTs: 'ok' | 'violated'
  readonly sumInvariantWasm: 'ok' | 'violated'
  readonly inputSummary: Record<string, number | undefined>
  readonly classification:
    | 'numeric-within-tolerance'
    | 'numeric-over-tolerance'
    | 'invariant-violation'
    | 'null-mismatch'
}

export interface ObservationRunResult {
  readonly target: ObservationTarget
  readonly fixture: string
  readonly summary: ObservationSummary
  readonly log: readonly MismatchEntry[]
  readonly mode: 'ts-only' | 'wasm-only' | 'dual-run-compare'
}

/**
 * observer をリセットする
 */
export function resetObserver(): void {
  dualRunStatsHandler('reset')
}

/**
 * observer から summary を取得する
 */
export function getSummary(): ObservationSummary {
  return dualRunStatsHandler() as ObservationSummary
}

/**
 * observer から mismatch log を取得する
 */
export function getMismatchLog(): readonly MismatchEntry[] {
  return dualRunStatsHandler('log') as readonly MismatchEntry[]
}

/**
 * 観測結果を構築する
 */
export function buildRunResult(
  target: ObservationTarget,
  fixture: string,
  mode: 'ts-only' | 'wasm-only' | 'dual-run-compare' = 'dual-run-compare',
): ObservationRunResult {
  return {
    target,
    fixture,
    summary: getSummary(),
    log: getMismatchLog(),
    mode,
  }
}

/**
 * 特定 engine の expected functions の call count を取得する
 */
export function getCallCounts(
  summary: ObservationSummary,
  expectedFunctions: readonly string[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const fn of expectedFunctions) {
    counts[fn] = summary.byFunction[fn]?.calls ?? 0
  }
  return counts
}
