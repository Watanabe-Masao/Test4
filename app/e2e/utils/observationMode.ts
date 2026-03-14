/**
 * Observation Mode Helper — Playwright から execution mode を安全に切り替える
 *
 * wasmEngine.ts は localStorage からモードを読み込む（loadModeFromStorage）。
 * localStorage に書いてリロードすることで反映する。
 *
 * 注: 現在は全 engine が共通の localStorage key を使用:
 * 'factorDecomposition.executionMode'
 */
import type { Page } from '@playwright/test'

export type ObservationEngine =
  | 'grossProfit'
  | 'budgetAnalysis'
  | 'forecast'
  | 'factorDecomposition'

export type ObservationMode = 'ts-only' | 'dual-run-compare' | 'wasm-only'

/**
 * localStorage 経由で execution mode を設定し、ページをリロードする。
 */
export async function setObservationMode(
  page: Page,
  mode: ObservationMode,
): Promise<void> {
  await page.evaluate((m) => {
    localStorage.setItem('factorDecomposition.executionMode', m)
  }, mode)
  await page.reload()
  await page.waitForLoadState('networkidle')
}

/**
 * observation テスト後にモード設定をクリーンアップする。
 */
export async function cleanupObservationMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('factorDecomposition.executionMode')
  })
}
