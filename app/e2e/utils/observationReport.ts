/**
 * E2E Observation Report — JSON / Markdown レポート生成
 *
 * 観測結果を構造化された形式で出力する。
 * CI artifact や PR コメントに貼れる形式を提供する。
 */
import type { DualRunSummary, MismatchEntry } from './dualRunStatsClient'
import type { ObservationEvaluation } from './observationAssertions'
import type { ObservationEngine, ObservationMode } from './observationMode'

/* ── JSON レポート ── */

export interface ObservationJsonReport {
  readonly engine: string
  readonly path: string
  readonly fixture: string
  readonly mode: string
  readonly status: 'pass' | 'warning' | 'fail'
  readonly mismatchCounts: {
    readonly numericWithinTolerance: number
    readonly numericOverTolerance: number
    readonly nullMismatch: number
    readonly invariantViolation: number
  }
  readonly maxAbsDiff: number
  readonly callCounts: Record<string, number>
  readonly totalCalls: number
  readonly verdict: string
  readonly notes: readonly string[]
}

export function buildJsonReport(
  engine: ObservationEngine,
  path: string,
  fixture: string,
  mode: ObservationMode,
  summary: DualRunSummary,
  _log: readonly MismatchEntry[],
  evaluation: ObservationEvaluation,
  expectedFunctions: readonly string[],
): ObservationJsonReport {
  const callCounts: Record<string, number> = {}
  for (const fn of expectedFunctions) {
    callCounts[fn] = summary.byFunction[fn]?.calls ?? 0
  }

  const totalMismatches = summary.totalMismatches
  const nullMismatch = summary.totalNullMismatches
  const invariantViolation = summary.totalInvariantViolations
  const numericMismatches = totalMismatches - nullMismatch
  const isWithinTolerance = summary.verdict === 'tolerance-only' || summary.verdict === 'clean'

  return {
    engine,
    path,
    fixture,
    mode,
    status: evaluation.status,
    mismatchCounts: {
      numericWithinTolerance: isWithinTolerance ? numericMismatches : 0,
      numericOverTolerance: isWithinTolerance ? 0 : numericMismatches,
      nullMismatch,
      invariantViolation,
    },
    maxAbsDiff: summary.globalMaxAbsDiff,
    callCounts,
    totalCalls: summary.totalCalls,
    verdict: summary.verdict,
    notes: [...evaluation.reasons],
  }
}

/* ── Markdown レポート ── */

export function buildMarkdownReport(reports: readonly ObservationJsonReport[]): string {
  const lines: string[] = []
  lines.push('# E2E Observation Report')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')

  // サマリテーブル
  lines.push('## Summary')
  lines.push('')
  lines.push('| Engine | Path | Fixture | Status | Calls | Mismatches | maxAbsDiff | Verdict |')
  lines.push('|---|---|---|---|---|---|---|---|')
  for (const r of reports) {
    const totalMismatches =
      r.mismatchCounts.numericWithinTolerance +
      r.mismatchCounts.numericOverTolerance +
      r.mismatchCounts.nullMismatch +
      r.mismatchCounts.invariantViolation
    lines.push(
      `| ${r.engine} | ${r.path} | ${r.fixture} | ${statusLabel(r.status)} | ${r.totalCalls} | ${totalMismatches} | ${r.maxAbsDiff} | ${r.verdict} |`,
    )
  }
  lines.push('')

  // Failures
  const failReports = reports.filter((r) => r.status === 'fail')
  if (failReports.length > 0) {
    lines.push('## Failures')
    lines.push('')
    for (const r of failReports) {
      lines.push(`### ${r.engine} / ${r.path} / ${r.fixture}`)
      for (const note of r.notes) {
        lines.push(`- ${note}`)
      }
      lines.push('')
    }
  }

  // Warnings
  const warningReports = reports.filter((r) => r.status === 'warning')
  if (warningReports.length > 0) {
    lines.push('## Warnings')
    lines.push('')
    for (const r of warningReports) {
      lines.push(`### ${r.engine} / ${r.path} / ${r.fixture}`)
      for (const note of r.notes) {
        lines.push(`- ${note}`)
      }
      lines.push('')
    }
  }

  // Call Coverage
  lines.push('## Call Coverage')
  lines.push('')
  for (const r of reports) {
    lines.push(`### ${r.engine} / ${r.path} / ${r.fixture}`)
    lines.push('')
    lines.push('| Function | Calls |')
    lines.push('|---|---|')
    for (const [fn, count] of Object.entries(r.callCounts)) {
      lines.push(`| ${fn} | ${count} |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pass':
      return 'PASS'
    case 'warning':
      return 'WARN'
    case 'fail':
      return 'FAIL'
    default:
      return '?'
  }
}
