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
 * 現在は `CategoryTimeSalesRecord` を基底に **flat field を並行提供する
 * intersection 型** (category-leaf-daily-entry-shape-break Phase 1, 2026-04-19)。
 * presentation は新 flat field (`deptCode` / `deptName` / `lineCode` / `lineName` /
 * `klassCode` / `klassName`) を参照する。nested field (`department.code` 等) は
 * 既存 consumer の非破壊経路として残存するが、Phase 4 で intersection を解除して
 * 独立 interface に昇格する予定 (nested field は entry から除外され、
 * presentation は raw 型と構造的に分離される)。
 *
 * **flat field の生成点は `projectCategoryLeafDailySeries` のみ。** consumer が
 * 手動で `{ ...rec, deptCode: rec.department.code }` 等を組まない
 * (`plan.md` 不可侵原則 §3)。
 */
export type CategoryLeafDailyEntry = CategoryTimeSalesRecord & {
  readonly deptCode: string
  readonly deptName: string
  readonly lineCode: string
  readonly lineName: string
  readonly klassCode: string
  readonly klassName: string
}

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
