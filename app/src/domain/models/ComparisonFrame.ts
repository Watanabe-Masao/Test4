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
