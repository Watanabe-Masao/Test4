/**
 * Observation Report — JSON / Markdown レポート生成
 *
 * 観測結果を構造化された形式で出力する。
 * CI artifact や PR コメントに貼れる形式を提供する。
 */
import type { ObservationRunResult, ObservationSummary } from './observationRunner'
import type { ObservationJudgment } from './observationAssertions'

export interface ObservationReport {
  readonly engine: string
  readonly fixture: string
  readonly mode: string
  readonly status: string
  readonly callCounts: Record<string, number>
  readonly mismatchCounts: {
    readonly numericWithinTolerance: number
    readonly numericOverTolerance: number
    readonly nullMismatch: number
    readonly invariantViolation: number
  }
  readonly maxAbsDiff: number
  readonly totalCalls: number
  readonly verdict: string
  readonly notes: readonly string[]
}

/**
 * 観測結果から JSON レポートを構築する
 */
export function buildJsonReport(
  result: ObservationRunResult,
  judgment: ObservationJudgment,
  expectedFunctions: readonly string[],
): ObservationReport {
  const callCounts: Record<string, number> = {}
  for (const fn of expectedFunctions) {
    callCounts[fn] = result.summary.byFunction[fn]?.calls ?? 0
  }

  return {
    engine: result.target,
    fixture: result.fixture,
    mode: result.mode,
    status: judgment.status,
    callCounts,
    mismatchCounts: extractMismatchCounts(result.summary),
    maxAbsDiff: result.summary.globalMaxAbsDiff,
    totalCalls: result.summary.totalCalls,
    verdict: result.summary.verdict,
    notes: [...judgment.reasons],
  }
}

function extractMismatchCounts(summary: ObservationSummary): ObservationReport['mismatchCounts'] {
  // observer tracks totals; break down by type using available data
  const totalMismatches = summary.totalMismatches
  const nullMismatch = summary.totalNullMismatches
  const invariantViolation = summary.totalInvariantViolations
  const numericMismatches = totalMismatches - nullMismatch

  // Determine if numeric mismatches are within or over tolerance
  // If verdict is 'tolerance-only', all numeric mismatches are within tolerance
  // If verdict is 'needs-investigation' and invariant/null are zero, they're over tolerance
  const isWithinTolerance = summary.verdict === 'tolerance-only' || summary.verdict === 'clean'

  return {
    numericWithinTolerance: isWithinTolerance ? numericMismatches : 0,
    numericOverTolerance: isWithinTolerance ? 0 : numericMismatches,
    nullMismatch,
    invariantViolation,
  }
}

/**
 * 複数の JSON レポートから Markdown サマリを生成する
 */
export function buildMarkdownReport(reports: readonly ObservationReport[]): string {
  const lines: string[] = []
  lines.push('# Observation Report')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')

  // サマリテーブル
  lines.push('## Summary')
  lines.push('')
  lines.push('| Engine | Fixture | Status | Calls | Mismatches | maxAbsDiff | Verdict |')
  lines.push('|---|---|---|---|---|---|---|')
  for (const r of reports) {
    const totalMismatches =
      r.mismatchCounts.numericWithinTolerance +
      r.mismatchCounts.numericOverTolerance +
      r.mismatchCounts.nullMismatch +
      r.mismatchCounts.invariantViolation
    lines.push(
      `| ${r.engine} | ${r.fixture} | ${statusIcon(r.status)} ${r.status} | ${r.totalCalls} | ${totalMismatches} | ${r.maxAbsDiff} | ${r.verdict} |`,
    )
  }
  lines.push('')

  // Notes
  const failReports = reports.filter((r) => r.status === 'fail')
  const warningReports = reports.filter((r) => r.status === 'warning')

  if (failReports.length > 0) {
    lines.push('## Failures')
    lines.push('')
    for (const r of failReports) {
      lines.push(`### ${r.engine} / ${r.fixture}`)
      for (const note of r.notes) {
        lines.push(`- ${note}`)
      }
      lines.push('')
    }
  }

  if (warningReports.length > 0) {
    lines.push('## Warnings')
    lines.push('')
    for (const r of warningReports) {
      lines.push(`### ${r.engine} / ${r.fixture}`)
      for (const note of r.notes) {
        lines.push(`- ${note}`)
      }
      lines.push('')
    }
  }

  // Call Coverage Details
  lines.push('## Call Coverage')
  lines.push('')
  for (const r of reports) {
    lines.push(`### ${r.engine} / ${r.fixture}`)
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

function statusIcon(status: string): string {
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
