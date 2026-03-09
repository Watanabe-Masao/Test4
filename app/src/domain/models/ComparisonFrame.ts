/**
 * 比較フレーム — 全クエリ・全チャートの比較期間入力を統一する型
 *
 * 前年比較の期間解釈を一箇所に集約し、ページ・チャートごとの不整合を防ぐ。
 * resolveComparisonFrame() が唯一の生成元となる。
 */
import type { DateRange } from './CalendarDate'

/** 比較期間の合わせ方 */
export type AlignmentPolicy = 'sameDayOfWeek' | 'sameDate'

/** 比較フレーム — 全クエリ・全チャートの比較期間入力 */
export interface ComparisonFrame {
  /** 当年の表示期間 */
  readonly current: DateRange
  /** 前年（比較対象）の期間 */
  readonly previous: DateRange
  /** 同曜日寄せ時の日オフセット (0-6)。sameDate なら 0 */
  readonly dowOffset: number
  /** 適用されたポリシー */
  readonly policy: AlignmentPolicy
}

/**
 * 前年比較スコープ — DuckDB 日付範囲と JS 集計値の整合性を型で保証
 *
 * DOW offset + elapsedDays で調整済みの日付範囲と、
 * 同じスコープで算出された客数をセットで管理する。
 * 分離すると「DuckDB は全月クエリ ÷ JS は一部日数の客数」のようなスコープ不一致が発生する。
 */
export interface PrevYearScope {
  /** DuckDB クエリ用の前年日付範囲（DOW offset + elapsedDays で調整済み） */
  readonly dateRange: DateRange
  /** JS エンジンで算出された前年客数（dateRange と同じスコープ） */
  readonly totalCustomers: number
  /** 同曜日寄せの日オフセット (0-6) */
  readonly dowOffset: number
}
