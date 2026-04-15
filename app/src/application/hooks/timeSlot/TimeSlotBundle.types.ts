/**
 * TimeSlotBundle — 時間帯比較レーンの型契約 (contract only, 実装なし)
 *
 * unify-period-analysis Phase 6 Step C pre-work:
 * 時間帯比較 (StoreHourlyChart 系) を `FreePeriodReadModel` に吸収せず、
 * sibling lane (`ctx.timeSlotLane`) として切り出すための最小契約を、
 * 実装に先立って型レベルで固定する。
 *
 * ## 責務
 *
 * 1. `TimeSlotFrame` は `(dateRange, storeIds, comparison)` を受け取る
 * 2. `TimeSlotBundle` は `current / comparison` の 2 series + meta を返す
 * 3. presentation は `TimeSlotSeries` のみ触る。`StoreAggregationRow` を
 *    直接 import しない (`timeSlotLaneSurfaceGuard` で ratchet-down)
 *
 * ## 非責務
 *
 * - 日別 raw rows を presentation に露出しない (G3-2 の time-slot 版)
 * - Shapley 分解や category 次元は持たない (FreePeriodReadModel Step B と整合)
 *
 * ## 比較意味論
 *
 * - `sameDate` / `sameDayOfWeek` は既存 `ComparisonScope` を流用する
 * - `wow` (week-over-week) は初期契約から外す
 * - 比較先日付の解決は `comparisonRangeResolver` 経由 (Phase 2 で固定済み)
 *
 * @see projects/unify-period-analysis/step-c-timeslot-lane-policy.md
 *
 * @responsibility R:utility
 */
import type { DateRange } from '@/domain/models/calendar'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'

// ── Frame ────────────────────────────────────────────────

/**
 * 時間帯比較の入力 frame。
 * `FreePeriodAnalysisFrame` と sibling 関係にあり、同じ `ComparisonScope` を流用する。
 */
export interface TimeSlotFrame {
  readonly dateRange: DateRange
  readonly storeIds: readonly string[]
  readonly comparison: ComparisonScope | null
}

// ── Series (projection 済み、presentation 消費可) ─────────

/**
 * 店舗別×時間帯の projection 済み系列。
 * presentation はこの型のみを消費する。`StoreAggregationRow` を直接消費しない。
 *
 * `entries[i].byHour[h]` は 0-23 時間帯の金額 (null は欠損)。
 */
export interface TimeSlotStoreEntry {
  readonly storeId: string
  /** 24 長の配列。index = hour (0-23)。null = 該当時間帯の raw row なし */
  readonly byHour: readonly (number | null)[]
  /** 店舗単位の合計 (byHour の非 null 値の sum) */
  readonly total: number
}

export interface TimeSlotSeries {
  readonly entries: readonly TimeSlotStoreEntry[]
  /** 期間単位の totals: 全店舗×全時間帯の合計 */
  readonly grandTotal: number
  /** 対象日数 */
  readonly dayCount: number
}

// ── Meta ─────────────────────────────────────────────────

/**
 * 時間帯比較レーンのメタデータ。FreePeriodReadModel の `meta` と一致する構造。
 */
export interface TimeSlotMeta {
  /** フォールバックが発生したか */
  readonly usedFallback: boolean
}

// ── Bundle (useUnifiedWidgetContext 配布面) ──────────────

/**
 * 時間帯比較レーンの bundle 出力。`useTimeSlotBundle(executor, frame)` の戻り値。
 *
 * **実装時の配置**: `app/src/application/hooks/timeSlot/useTimeSlotBundle.ts` (Step C 実装)。
 * 本ファイルは型契約のみで、hook 実装はまだない。
 */
export interface TimeSlotBundle {
  readonly currentSeries: TimeSlotSeries | null
  readonly comparisonSeries: TimeSlotSeries | null
  readonly meta: TimeSlotMeta
  readonly isLoading: boolean
  readonly errors: Partial<Record<'current' | 'comparison', Error>>
  readonly error: Error | null
}

// ── ctx 配布点 (Step C 実装時に UnifiedWidgetContext に追加する形) ──

/**
 * `ctx.timeSlotLane` の期待形。
 * Step C 実装時に `UnifiedWidgetContext` に追加する。本 phase では型定義のみ。
 */
export interface TimeSlotLane {
  readonly frame: TimeSlotFrame | null
  readonly bundle: TimeSlotBundle
}
