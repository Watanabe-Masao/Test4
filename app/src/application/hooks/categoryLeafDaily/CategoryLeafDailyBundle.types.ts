/**
 * CategoryLeafDailyBundle — カテゴリ leaf-grain (dept|line|klass) 日次比較レーンの型契約
 *
 * category-leaf-daily-series project で新設した leaf-grain 正本契約。
 * `CategoryDailyBundle`（dept 粒度）の sibling として、`(dept, line, klass, dateKey)`
 * 粒度の日次値 + 時間帯別データを持つ。
 *
 * 設計方針:
 * - `CategoryLeafDailyEntry` は現在の `CategoryTimeSalesRecord` と同構造を持つ
 *   （`dept`/`line`/`klass` の 3 次元 + `totalAmount`/`totalQuantity` + `timeSlots`）。
 *   既存 presentation ロジックとの接続を最小化するため、型は `CategoryTimeSalesRecord`
 *   を alias する形で最初定義し、時期を見て独自構造に進化させる。
 * - bundle 層は pair 取得（current + comparison）+ provenance を担う。
 *   `selectCtsWithFallback` の「prev 空 → current scope で救済」ロジックは bundle
 *   内部に畳み込み、consumer からは意識しない。
 *
 * ## 責務
 *
 * 1. `CategoryLeafDailyFrame` は `(dateRange, storeIds, comparison)` を受け取る
 * 2. `CategoryLeafDailyBundle` は `current / comparison` の 2 series + meta を返す
 * 3. presentation は `CategoryLeafDailyEntry` のみを触り、
 *    `CategoryTimeSalesRecord` を直接 import しない
 *    (`categoryLeafDailyLaneSurfaceGuard` で計測)
 *
 * ## 非責務
 *
 * - 日別 raw rows の露出（presentation は `entries` 経由のみ）
 * - wow alignment（`timeSlotLane` と同様に bundle 対象外）
 * - Shapley 要因分解計算自体（consumer 側の domain 呼び出し）
 *
 * @see projects/category-leaf-daily-series/HANDOFF.md
 * @see projects/completed/calendar-modal-bundle-migration/HANDOFF.md §1.2
 *
 * @responsibility R:utility
 */
import type { DateRange } from '@/domain/models/calendar'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

// ── Frame ────────────────────────────────────────────────

export interface CategoryLeafDailyFrame {
  readonly dateRange: DateRange
  readonly storeIds: readonly string[]
  readonly comparison: ComparisonScope | null
}

// ── Entry (presentation 消費可) ───────────────────────────

/**
 * leaf-grain `(dept, line, klass)` 1 件分のエントリ。
 *
 * 初期実装では `CategoryTimeSalesRecord` と同一構造。presentation は
 * 直接 `CategoryTimeSalesRecord` を import する代わりに本型を使う。
 * 時期を見て独自構造（例: 時間帯配列を fixed-24 化など）に進化させる。
 */
export type CategoryLeafDailyEntry = CategoryTimeSalesRecord

// ── Series ────────────────────────────────────────────────

export interface CategoryLeafDailySeries {
  /** leaf-grain で集約された entries（元は同日・同店舗で集計済み） */
  readonly entries: readonly CategoryLeafDailyEntry[]
  /** 期間 × 全 leaf の grand totals */
  readonly grandTotals: {
    readonly amount: number
    readonly quantity: number
  }
  /** 対象日数 */
  readonly dayCount: number
}

export const EMPTY_CATEGORY_LEAF_DAILY_SERIES: CategoryLeafDailySeries = {
  entries: [],
  grandTotals: { amount: 0, quantity: 0 },
  dayCount: 0,
}

// ── Meta ─────────────────────────────────────────────────

export interface CategoryLeafDailyProvenance {
  readonly mappingKind: 'sameDate' | 'sameDayOfWeek' | 'none'
  readonly comparisonRange: { readonly from: string; readonly to: string } | null
  /**
   * comparison 側が空だったため current scope の同日付レンジで救済された場合に true。
   * 旧 `selectCtsWithFallback` の意味論を bundle 内に畳み込んだ結果を表現する。
   */
  readonly usedComparisonFallback: boolean
}

export interface CategoryLeafDailyMeta {
  readonly usedFallback: boolean
  readonly provenance: CategoryLeafDailyProvenance
}

// ── Bundle ────────────────────────────────────────────────

export interface CategoryLeafDailyBundle {
  readonly currentSeries: CategoryLeafDailySeries | null
  readonly comparisonSeries: CategoryLeafDailySeries | null
  readonly meta: CategoryLeafDailyMeta
  readonly isLoading: boolean
  readonly errors: Partial<Record<'current' | 'comparison' | 'comparisonFallback', Error>>
  readonly error: Error | null
}
