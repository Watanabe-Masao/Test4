/**
 * E2E Observation Assertions — 自動判定ロジック
 *
 * dual-run summary / log を見て pass / warning / fail を判定する。
 * promotion-criteria.md の判定基準と整合。
 */
import type { DualRunSummary, MismatchEntry } from './dualRunStatsClient'

export type ObservationStatus = 'pass' | 'warning' | 'fail'

export interface ObservationEvaluation {
  readonly status: ObservationStatus
  readonly reasons: readonly string[]
}

/**
 * Expected functions の call coverage を検証する。
 */
export function checkCallCoverage(
  summary: DualRunSummary,
  expectedFunctions: readonly string[],
): ObservationEvaluation {
  const reasons: string[] = []
  let hasFail = false

  for (const fn of expectedFunctions) {
    const stats = summary.byFunction[fn]
    if (!stats || stats.calls === 0) {
      reasons.push(`${fn}: call count = 0 (expected >= 1)`)
      hasFail = true
    }
  }

  if (hasFail) {
    return { status: 'fail', reasons }
  }
  return { status: 'pass', reasons: [] }
}

/**
 * Mismatch 条件を検証する（promotion-candidate 判定基準）。
 */
export function checkMismatchConditions(summary: DualRunSummary): ObservationEvaluation {
  const reasons: string[] = []

  // invariant-violation: 即 fail
  if (summary.totalInvariantViolations > 0) {
    reasons.push(`invariant-violation: ${summary.totalInvariantViolations} (must be 0)`)
  }

  // null-mismatch: 即 fail
  if (summary.totalNullMismatches > 0) {
    reasons.push(`null-mismatch: ${summary.totalNullMismatches} (must be 0)`)
  }

  if (reasons.length > 0) {
    return { status: 'fail', reasons }
  }

  // warning: numeric-within-tolerance > 0
  if (summary.totalMismatches > 0 && summary.verdict === 'tolerance-only') {
    return {
      status: 'warning',
      reasons: [
        `numeric-within-tolerance: ${summary.totalMismatches} mismatches (maxAbsDiff=${summary.globalMaxAbsDiff})`,
      ],
    }
  }

  return { status: 'pass', reasons: [] }
}

/**
 * 観測結果を総合判定する。
 *
 * fail 条件:
 * - invariant-violation > 0
 * - null-mismatch > 0
 * - numeric-over-tolerance > 0
 * - expected function の callCount = 0
 *
 * warning 条件:
 * - numeric-within-tolerance > 0
 *
 * pass 条件:
 * - fail 条件なし + expected coverage 充足
 */
export function evaluateObservation(
  summary: DualRunSummary,
  _log: readonly MismatchEntry[],
  expectedFunctions: readonly string[],
): ObservationEvaluation {
  const reasons: string[] = []

  // 1. call coverage
  const coverageResult = checkCallCoverage(summary, expectedFunctions)
  if (coverageResult.status === 'fail') {
    return coverageResult
  }

  // 2. mismatch conditions
  const mismatchResult = checkMismatchConditions(summary)
  if (mismatchResult.status === 'fail') {
    return mismatchResult
  }

  // 3. verdict check
  if (summary.verdict === 'needs-investigation') {
    return {
      status: 'fail',
      reasons: ['verdict: needs-investigation'],
    }
  }

  // 4. warning aggregation
  if (mismatchResult.status === 'warning') {
    reasons.push(...mismatchResult.reasons)
  }

  if (reasons.length > 0) {
    return { status: 'warning', reasons }
  }

  return { status: 'pass', reasons: [] }
}
