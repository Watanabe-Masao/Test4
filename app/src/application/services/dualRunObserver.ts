/**
 * DEV-only dual-run 観測アキュムレータ
 *
 * bridge の dual-run compare 実行統計を蓄積し、DevTools から確認可能にする。
 * PROD ビルドでは import されない（main.tsx の DEV ガード内で登録）。
 *
 * DevTools での使い方:
 *   __dualRunStats()        — 全関数の統計サマリ
 *   __dualRunStats('reset') — 統計をリセット
 *   __dualRunStats('log')   — mismatch ログ一覧
 */

type FnName =
  // grossProfit
  | 'calculateInvMethod'
  | 'calculateEstMethod'
  | 'calculateCoreSales'
  | 'calculateDiscountRate'
  | 'calculateDiscountImpact'
  | 'calculateMarkupRates'
  | 'calculateTransferTotals'
  | 'calculateInventoryCost'
  // timeSlot
  | 'findCoreTime'
  | 'findTurnaroundHour'

interface FnStats {
  calls: number
  mismatches: number
  nullMismatches: number
  invariantViolations: number
  maxAbsDiff: number
  lastCallAt: string | null
  lastMismatchAt: string | null
}

interface MismatchEntry {
  readonly timestamp: string
  readonly function: FnName
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

/* ── 内部状態 ─────────────────────────────────── */

const TOLERANCE = 1e-10

function makeFnStats(): FnStats {
  return {
    calls: 0,
    mismatches: 0,
    nullMismatches: 0,
    invariantViolations: 0,
    maxAbsDiff: 0,
    lastCallAt: null,
    lastMismatchAt: null,
  }
}

const stats: Record<FnName, FnStats> = {
  // factorDecomposition
  // grossProfit
  calculateInvMethod: makeFnStats(),
  calculateEstMethod: makeFnStats(),
  calculateCoreSales: makeFnStats(),
  calculateDiscountRate: makeFnStats(),
  calculateDiscountImpact: makeFnStats(),
  calculateMarkupRates: makeFnStats(),
  calculateTransferTotals: makeFnStats(),
  calculateInventoryCost: makeFnStats(),
  // budgetAnalysis
  // forecast
  // timeSlot
  findCoreTime: makeFnStats(),
  findTurnaroundHour: makeFnStats(),
}

const mismatchLog: MismatchEntry[] = []
const MAX_LOG_ENTRIES = 200

/* ── 記録 API ─────────────────────────────────── */

export function recordCall(fnName: FnName): void {
  stats[fnName].calls++
  stats[fnName].lastCallAt = new Date().toISOString()
}

export function recordMismatch(
  fnName: FnName,
  maxAbsDiff: number,
  sumInvariantTs: 'ok' | 'violated',
  sumInvariantWasm: 'ok' | 'violated',
  inputSummary: Record<string, number | undefined>,
): void {
  const s = stats[fnName]
  s.mismatches++
  s.maxAbsDiff = Math.max(s.maxAbsDiff, maxAbsDiff)
  s.lastMismatchAt = new Date().toISOString()

  if (sumInvariantTs === 'violated' || sumInvariantWasm === 'violated') {
    s.invariantViolations++
  }

  const classification: MismatchEntry['classification'] =
    sumInvariantTs === 'violated' || sumInvariantWasm === 'violated'
      ? 'invariant-violation'
      : maxAbsDiff <= TOLERANCE
        ? 'numeric-within-tolerance'
        : 'numeric-over-tolerance'

  if (mismatchLog.length < MAX_LOG_ENTRIES) {
    mismatchLog.push({
      timestamp: new Date().toISOString(),
      function: fnName,
      maxAbsDiff,
      sumInvariantTs,
      sumInvariantWasm,
      inputSummary,
      classification,
    })
  }
}

export function recordNullMismatch(fnName: FnName): void {
  const s = stats[fnName]
  s.nullMismatches++
  s.mismatches++
  s.lastMismatchAt = new Date().toISOString()

  if (mismatchLog.length < MAX_LOG_ENTRIES) {
    mismatchLog.push({
      timestamp: new Date().toISOString(),
      function: fnName,
      maxAbsDiff: NaN,
      sumInvariantTs: 'ok',
      sumInvariantWasm: 'ok',
      inputSummary: {},
      classification: 'null-mismatch',
    })
  }
}

/* ── DevTools 公開 API ────────────────────────── */

interface ObservationSummary {
  totalCalls: number
  totalMismatches: number
  totalNullMismatches: number
  totalInvariantViolations: number
  globalMaxAbsDiff: number
  byFunction: Record<FnName, FnStats>
  verdict: 'clean' | 'tolerance-only' | 'needs-investigation'
}

function getSummary(): ObservationSummary {
  let totalCalls = 0
  let totalMismatches = 0
  let totalNullMismatches = 0
  let totalInvariantViolations = 0
  let globalMaxAbsDiff = 0

  for (const fn of Object.values(stats)) {
    totalCalls += fn.calls
    totalMismatches += fn.mismatches
    totalNullMismatches += fn.nullMismatches
    totalInvariantViolations += fn.invariantViolations
    globalMaxAbsDiff = Math.max(globalMaxAbsDiff, fn.maxAbsDiff)
  }

  const verdict: ObservationSummary['verdict'] =
    totalInvariantViolations > 0 || totalNullMismatches > 0
      ? 'needs-investigation'
      : totalMismatches > 0 && globalMaxAbsDiff > TOLERANCE
        ? 'needs-investigation'
        : totalMismatches > 0
          ? 'tolerance-only'
          : 'clean'

  return {
    totalCalls,
    totalMismatches,
    totalNullMismatches,
    totalInvariantViolations,
    globalMaxAbsDiff,
    byFunction: { ...stats },
    verdict,
  }
}

function resetStats(): void {
  for (const fn of Object.keys(stats) as FnName[]) {
    stats[fn] = makeFnStats()
  }
  mismatchLog.length = 0
}

/**
 * DevTools エントリポイント。
 * window.__dualRunStats として登録される。
 *
 * 呼び方:
 *   __dualRunStats()        → サマリ表示
 *   __dualRunStats('reset') → 統計リセット
 *   __dualRunStats('log')   → mismatch ログ一覧
 */
export function dualRunStatsHandler(
  command?: 'reset' | 'log',
): ObservationSummary | readonly MismatchEntry[] | string {
  if (command === 'reset') {
    resetStats()
    return 'dual-run observation stats reset'
  }
  if (command === 'log') {
    return [...mismatchLog]
  }
  return getSummary()
}
