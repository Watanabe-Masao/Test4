/**
 * dual-run compare 共通ユーティリティ
 *
 * 各 bridge の compareNumericResults / compareScalarResults に共通する
 * 最小限の計算ロジックを集約する。
 *
 * 方針: 過剰抽象化しない。各 bridge は引き続き独自の invariant checker、
 * null 処理、semantic mismatch 判定を持つ。ここでは純粋な計算のみ。
 */
import type { WasmState, ExecutionMode } from './wasmEngine'

/* ── diff 計算 ────────────────────────────────── */

export interface DiffResult {
  readonly diffs: Record<string, number>
  readonly maxAbsDiff: number
}

/**
 * 2 つの数値 Record の差分を計算する。
 * key は tsFields 基準。wasmFields に key がなければ 0 として扱う。
 */
export function computeNumericDiffs(
  tsFields: Record<string, number>,
  wasmFields: Record<string, number>,
): DiffResult {
  const diffs: Record<string, number> = {}
  let maxAbsDiff = 0

  for (const key of Object.keys(tsFields)) {
    const diff = (wasmFields[key] ?? 0) - tsFields[key]
    diffs[key] = diff
    maxAbsDiff = Math.max(maxAbsDiff, Math.abs(diff))
  }

  return { diffs, maxAbsDiff }
}

/* ── 共通 log 型 ──────────────────────────────── */

/**
 * 全 bridge の mismatch log に共通する基本フィールド。
 * 各 bridge はこれを拡張して使う。
 */
export interface MismatchLogBase {
  readonly function: string
  readonly inputSummary: Record<string, number | undefined>
  readonly tsResult: Record<string, number | string | null>
  readonly wasmResult: Record<string, number | string | null>
  readonly diffs: Record<string, number | string>
  readonly maxAbsDiff: number
  readonly wasmState: WasmState
  readonly executionMode: ExecutionMode
}

/* ── finite チェック ──────────────────────────── */

/**
 * 全フィールドが finite かを検証する。
 * invariant checker のデフォルトとして使える。
 */
export function checkAllFinite(fields: Record<string, number>): 'ok' | 'violated' {
  for (const v of Object.values(fields)) {
    if (!Number.isFinite(v)) return 'violated'
  }
  return 'ok'
}

/* ── tolerance 定数 ───────────────────────────── */

export const DEFAULT_TOLERANCE = 1e-10
export const ANALYSIS_TOLERANCE = 1e-8
