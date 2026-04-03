/**
 * Paired Query Contract — 比較取得の一級契約
 *
 * current/prev の取得を pair/bundle 契約として標準化する。
 * isPrevYear フラグによる単発取得を段階的に置換する。
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 */
import type { BaseQueryInput } from './QueryContract'

/**
 * 比較期間付きの入力。current の日付範囲に加え、
 * comparison の日付範囲をオプションで持つ。
 */
export interface PairedQueryInput extends BaseQueryInput {
  readonly comparisonDateFrom?: string
  readonly comparisonDateTo?: string
}

/**
 * 比較取得の出力。current は必ず存在し、comparison は
 * comparisonDateFrom/To が指定された場合のみ返る。
 */
export interface PairedQueryOutput<T> {
  readonly current: T
  readonly comparison: T | null
}
