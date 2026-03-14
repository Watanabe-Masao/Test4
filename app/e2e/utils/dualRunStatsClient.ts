/**
 * Dual-Run Stats Client — Playwright から __dualRunStats を安全に呼ぶラッパー
 *
 * __dualRunStats は DEV ビルドでのみ window に登録される（main.tsx 内）。
 * preview/PROD ビルドでは存在しない。
 * observation spec は DEV サーバー（npm run dev）で実行する必要がある。
 */
import type { Page } from '@playwright/test'

/* ── 型定義 ── */

export interface FnStats {
  readonly calls: number
  readonly mismatches: number
  readonly nullMismatches: number
  readonly invariantViolations: number
  readonly maxAbsDiff: number
  readonly lastCallAt: string | null
  readonly lastMismatchAt: string | null
}

export interface DualRunSummary {
  readonly totalCalls: number
  readonly totalMismatches: number
  readonly totalNullMismatches: number
  readonly totalInvariantViolations: number
  readonly globalMaxAbsDiff: number
  readonly byFunction: Record<string, FnStats>
  readonly verdict: 'clean' | 'tolerance-only' | 'needs-investigation'
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

/* ── API ── */

/**
 * __dualRunStats が window に存在するか確認する。
 * DEV サーバーでない場合は false を返す。
 */
export async function isDualRunStatsAvailable(page: Page): Promise<boolean> {
  return page.evaluate(() => typeof (window as Record<string, unknown>).__dualRunStats === 'function')
}

/**
 * 統計をリセットする。
 * @throws __dualRunStats が未定義の場合
 */
export async function resetDualRunStats(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const fn = (window as Record<string, unknown>).__dualRunStats
    if (typeof fn !== 'function') throw new Error('__dualRunStats not available (not DEV build?)')
    return fn('reset')
  })
  if (result !== 'dual-run observation stats reset') {
    throw new Error(`unexpected reset result: ${JSON.stringify(result)}`)
  }
}

/**
 * サマリ統計を取得する。
 */
export async function getDualRunSummary(page: Page): Promise<DualRunSummary> {
  const result = await page.evaluate(() => {
    const fn = (window as Record<string, unknown>).__dualRunStats
    if (typeof fn !== 'function') throw new Error('__dualRunStats not available (not DEV build?)')
    return fn()
  })
  if (!result || typeof result !== 'object') {
    throw new Error(`unexpected summary shape: ${JSON.stringify(result)}`)
  }
  return result as DualRunSummary
}

/**
 * Mismatch ログを取得する。
 */
export async function getDualRunLog(page: Page): Promise<readonly MismatchEntry[]> {
  const result = await page.evaluate(() => {
    const fn = (window as Record<string, unknown>).__dualRunStats
    if (typeof fn !== 'function') throw new Error('__dualRunStats not available (not DEV build?)')
    return fn('log')
  })
  if (!Array.isArray(result)) {
    throw new Error(`unexpected log shape: ${JSON.stringify(result)}`)
  }
  return result as MismatchEntry[]
}
