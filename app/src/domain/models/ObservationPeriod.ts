/**
 * ObservationPeriod — 観測期間の評価結果
 *
 * observation-period-spec.md Section 6 準拠。
 * domain 層の契約型として、観測品質を構造化する。
 *
 * ## 設計意図
 * - lastRecordedSalesDay は daily Map から導出する（single source of truth）
 * - elapsedDays = lastRecordedSalesDay（仕様準拠）
 * - 全フィールドは整数（率なし — @guard B3）
 * - 月内で閉じる（temporal-scope-semantics 準拠）
 */

/** 観測品質ステータス（observation-period-spec.md Section 6 準拠） */
export type ObservationStatus = 'ok' | 'partial' | 'invalid' | 'undefined'

/** 観測期間の評価結果 — domain 層の契約型 */
export interface ObservationPeriod {
  /** 最終販売計上日（対象月内、0 = 販売実績なし） */
  readonly lastRecordedSalesDay: number
  /** 経過日数（= lastRecordedSalesDay、仕様準拠） */
  readonly elapsedDays: number
  /** 営業日数（売上 > 0 の日数） */
  readonly salesDays: number
  /** 対象月の日数 */
  readonly daysInMonth: number
  /** 残日数（= daysInMonth - elapsedDays） */
  readonly remainingDays: number
  /** 観測品質ステータス */
  readonly status: ObservationStatus
  /** 警告コード一覧 */
  readonly warnings: readonly string[]
}
