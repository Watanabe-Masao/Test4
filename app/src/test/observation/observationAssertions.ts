/**
 * Observation Assertions — 自動判定ロジック
 *
 * 観測結果を pass / warning / fail に分類する。
 * promotion-criteria.md の判定基準と整合する。
 */
import type { ObservationSummary, ObservationRunResult } from './observationRunner'

export type ObservationStatus = 'pass' | 'warning' | 'fail'

export interface ObservationJudgment {
  readonly status: ObservationStatus
  readonly reasons: readonly string[]
}

/**
 * Expected functions の call coverage を検証する
 */
export function checkCallCoverage(
  summary: ObservationSummary,
  expectedFunctions: readonly string[],
): ObservationJudgment {
  const reasons: string[] = []
  let hasFail = false

  for (const fn of expectedFunctions) {
    const stats = summary.byFunction[fn]
    if (!stats || stats.calls === 0) {
      reasons.push(`${fn}: call count = 0 (expected ≥ 1)`)
      hasFail = true
    }
  }

  if (hasFail) {
    return { status: 'fail', reasons }
  }
  return { status: 'pass', reasons: [] }
}

/**
 * Mismatch 条件を検証する（promotion-candidate 判定基準）
 */
export function checkMismatchConditions(summary: ObservationSummary): ObservationJudgment {
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
 * 観測結果を総合判定する
 *
 * fail 条件:
 * - invariant-violation > 0
 * - null-mismatch > 0
 * - numeric-over-tolerance > 0
 * - expected function の callCount = 0
 *
 * warning 条件:
 * - numeric-within-tolerance > 0
 * - coverage は満たすが件数が少ない
 *
 * pass 条件:
 * - fail 条件なし + expected coverage 充足
 */
export function judgeObservation(
  result: ObservationRunResult,
  expectedFunctions: readonly string[],
): ObservationJudgment {
  const reasons: string[] = []

  // 1. call coverage
  const coverageJudgment = checkCallCoverage(result.summary, expectedFunctions)
  if (coverageJudgment.status === 'fail') {
    return coverageJudgment
  }

  // 2. mismatch conditions
  const mismatchJudgment = checkMismatchConditions(result.summary)
  if (mismatchJudgment.status === 'fail') {
    return mismatchJudgment
  }

  // 3. verdict check
  if (result.summary.verdict === 'needs-investigation') {
    return {
      status: 'fail',
      reasons: ['verdict: needs-investigation'],
    }
  }

  // 4. warning aggregation
  if (mismatchJudgment.status === 'warning') {
    reasons.push(...mismatchJudgment.reasons)
  }

  if (reasons.length > 0) {
    return { status: 'warning', reasons }
  }

  return { status: 'pass', reasons: [] }
}
