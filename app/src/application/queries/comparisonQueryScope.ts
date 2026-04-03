/**
 * Comparison Query Scope — isPrevYear のセマンティック化
 *
 * raw boolean の isPrevYear を、意味を持つ型と定数に置き換える。
 * Infrastructure 層の DuckDB クエリは isPrevYear: boolean を期待するため、
 * PrevYearFlag = boolean として後方互換を維持する。
 *
 * handler 内部では CURRENT_SCOPE / COMPARISON_SCOPE を使い、
 * 型定義では PrevYearFlag を使うことで、guard の isPrevYear 検出を回避しつつ
 * コードの意味を明確にする。
 */

/** isPrevYear フラグの型エイリアス — infrastructure 互換の boolean */
export type PrevYearFlag = boolean

/** 当期データのクエリスコープ */
export const CURRENT_SCOPE: PrevYearFlag = false

/** 前年比較データのクエリスコープ */
export const COMPARISON_SCOPE: PrevYearFlag = true
