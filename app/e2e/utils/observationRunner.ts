/**
 * E2E Observation Runner — 観測実行ハーネスのコア
 *
 * engine / path / fixture / mode を受け取り、
 * ページ操作 → stats 回収 → 結果構築を行う。
 *
 * 前提:
 * - DEV サーバー（npm run dev）で実行（__dualRunStats が必要）
 * - dual-run-compare モードが有効
 * - WASM モジュールが初期化済み
 */
import type { Page } from '@playwright/test'
import type { ObservationEngine, ObservationMode } from './observationMode'
import { setObservationMode } from './observationMode'
import {
  resetDualRunStats,
  getDualRunSummary,
  getDualRunLog,
  isDualRunStatsAvailable,
  type DualRunSummary,
  type MismatchEntry,
} from './dualRunStatsClient'
import { evaluateObservation, type ObservationEvaluation } from './observationAssertions'
import { buildJsonReport, type ObservationJsonReport } from './observationReport'

/* ── 型定義 ── */

export interface ObservationRunResult {
  readonly engine: ObservationEngine
  readonly path: string
  readonly fixture: string
  readonly mode: ObservationMode
  readonly summary: DualRunSummary
  readonly log: readonly MismatchEntry[]
  readonly evaluation: ObservationEvaluation
  readonly report: ObservationJsonReport
  readonly notes: readonly string[]
}

export interface ObservationRunConfig {
  readonly engine: ObservationEngine
  readonly path: string
  readonly fixture: string
  readonly mode: ObservationMode
  /** bridge 関数を踏む操作（ページ遷移・インタラクション） */
  readonly execute: (page: Page) => Promise<void>
  /** 対象関数リスト */
  readonly expectedFunctions: readonly string[]
}

/* ── メイン実行 ── */

/**
 * 1 回の観測を実行し、結果を返す。
 *
 * フロー:
 * 1. __dualRunStats の存在確認
 * 2. mode 設定
 * 3. stats リセット
 * 4. 対象経路を実行（execute コールバック）
 * 5. summary / log を回収
 * 6. 判定 + レポート構築
 */
export async function runObservation(
  page: Page,
  config: ObservationRunConfig,
): Promise<ObservationRunResult> {
  const notes: string[] = []

  // 1. __dualRunStats 存在確認
  const available = await isDualRunStatsAvailable(page)
  if (!available) {
    throw new Error(
      '__dualRunStats is not available. Observation specs require DEV server (npm run dev).',
    )
  }

  // 2. mode 設定
  await setObservationMode(page, config.mode)

  // 3. stats リセット
  await resetDualRunStats(page)

  // 4. 対象経路を実行
  await config.execute(page)

  // 短い待機（非同期計算の完了を待つ）
  await page.waitForTimeout(500)

  // 5. summary / log 回収
  const summary = await getDualRunSummary(page)
  const log = await getDualRunLog(page)

  // 6. 判定
  const evaluation = evaluateObservation(summary, log, config.expectedFunctions)

  // 7. レポート構築
  const report = buildJsonReport(
    config.engine,
    config.path,
    config.fixture,
    config.mode,
    summary,
    log,
    evaluation,
    config.expectedFunctions,
  )

  if (evaluation.status !== 'pass') {
    notes.push(...evaluation.reasons)
  }

  return {
    engine: config.engine,
    path: config.path,
    fixture: config.fixture,
    mode: config.mode,
    summary,
    log,
    evaluation,
    report,
    notes,
  }
}
