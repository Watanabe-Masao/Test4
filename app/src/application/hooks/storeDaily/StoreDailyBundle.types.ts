/**
 * StoreDailyBundle — 店舗別日次シリーズレーンの型契約 (contract only, 実装なし)
 *
 * unify-period-analysis Phase 6.5 Step B pre-work (Phase 6.5-1):
 * `SalesPurchaseComparisonChart` が現在 `ctx.allStoreResults`
 * (= `ReadonlyMap<storeId, StoreResult>`) から `s.result.daily` を直接 iterate
 * している状態を解消するため、sibling lane (`ctx.storeDailyLane`) として
 * 切り出す最小契約を、実装に先立って型レベルで固定する。
 *
 * `timeSlotLane` / `freePeriodLane` と並置する 3 本目の sibling lane。
 *
 * ## 責務
 *
 * 1. `StoreDailyFrame` は `(dateRange, storeIds, comparison)` を受け取る
 * 2. `StoreDailyBundle` は `current / comparison` の 2 series + meta を返す
 * 3. presentation は `StoreDailySeries` のみ触る。`StoreResult.daily` の
 *    直接 iterate や raw query rows の import を禁止 (Phase 6.5-5 で
 *    `storeDailyLaneSurfaceGuard` baseline 0 到達)
 *
 * ## 非責務
 *
 * - StoreResult 全体の廃止 (StoreResult は単月確定値の正本として継続)
 * - 月間 summary の再提供 (`FreePeriodReadModel.currentSummary` の役割)
 * - 時刻次元 (Step C `timeSlotLane` で提供済み)
 * - category 次元 (本 Phase の sibling `CategoryDailyBundle` で提供)
 *
 * ## 比較意味論
 *
 * `timeSlotLane` と同じく `sameDate` / `sameDayOfWeek` を既存 `ComparisonScope`
 * から流用。`wow` は初期契約から外す。比較先日付の解決は
 * `comparisonRangeResolver` 経由 (Phase 2 で固定済み)。
 *
 * @see projects/unify-period-analysis/phase-6-5-step-b-design.md
 * @see app/src/application/hooks/timeSlot/TimeSlotBundle.types.ts (参照実装)
 *
 * @responsibility R:utility
 */
import type { DateRange } from '@/domain/models/calendar'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'

// ── Frame ────────────────────────────────────────────────

/**
 * 店舗別日次シリーズの入力 frame。
 * `TimeSlotFrame` / `FreePeriodAnalysisFrame` と sibling 関係にあり、同じ
 * `ComparisonScope` を流用する。
 */
export interface StoreDailyFrame {
  readonly dateRange: DateRange
  readonly storeIds: readonly string[]
  readonly comparison: ComparisonScope | null
}

// ── Series (projection 済み、presentation 消費可) ─────────

/**
 * 店舗別日次の projection 済みデータポイント。
 * `dateKey` は `YYYY-MM-DD` (ISO) 形式で、`weatherDaily` 等の他 lane と突合可能。
 */
export interface StoreDailyDataPoint {
  readonly dateKey: string
  readonly sales: number
  readonly customers: number
  readonly purchaseCost: number
  readonly grossSales: number
}

/**
 * 店舗単位のエントリ。
 * `daily` は `dateKey` 昇順の配列 (Map ではなく配列で、Zod 契約 / JSON
 * serialize / chart iteration すべてに優しい形)。欠損日は配列に現れない。
 */
export interface StoreDailyStoreEntry {
  readonly storeId: string
  /** dateKey 昇順で安定ソートされた日次データポイント */
  readonly daily: readonly StoreDailyDataPoint[]
  /** 店舗単位の期間合計 */
  readonly totals: {
    readonly sales: number
    readonly customers: number
    readonly purchaseCost: number
    readonly grossSales: number
  }
}

/**
 * 店舗別日次 series。presentation はこの型のみを消費し、`StoreResult.daily`
 * の直接 iterate は行わない (`storeDailyLaneSurfaceGuard` で ratchet-down)。
 */
export interface StoreDailySeries {
  /** storeId 昇順で安定ソートされたエントリ */
  readonly entries: readonly StoreDailyStoreEntry[]
  /** 全店舗×全期間の grand totals */
  readonly grandTotals: {
    readonly sales: number
    readonly customers: number
    readonly purchaseCost: number
    readonly grossSales: number
  }
  /** 対象日数 */
  readonly dayCount: number
}

// ── Meta ─────────────────────────────────────────────────

/**
 * 店舗別日次レーンの provenance。**全フィールド必須**。
 * `TimeSlotProvenance` と同形 (Step C で確立した sibling lane の共通形)。
 */
export interface StoreDailyProvenance {
  readonly mappingKind: 'sameDate' | 'sameDayOfWeek' | 'none'
  readonly comparisonRange: { readonly from: string; readonly to: string } | null
}

export interface StoreDailyMeta {
  readonly usedFallback: boolean
  readonly provenance: StoreDailyProvenance
}

// ── Bundle (useUnifiedWidgetContext 配布面) ──────────────

/**
 * 店舗別日次レーンの bundle 出力。
 * `useStoreDailyBundle(executor, frame)` の戻り値 (Phase 6.5-3 実装時に追加)。
 */
export interface StoreDailyBundle {
  readonly currentSeries: StoreDailySeries | null
  readonly comparisonSeries: StoreDailySeries | null
  readonly meta: StoreDailyMeta
  readonly isLoading: boolean
  readonly errors: Partial<Record<'current' | 'comparison', Error>>
  readonly error: Error | null
}

// ── ctx 配布点 (Phase 6.5-4 実装時に UnifiedWidgetContext に追加する形) ──

/**
 * `ctx.storeDailyLane` の期待形。`timeSlotLane` / `freePeriodLane` の sibling。
 * Phase 6.5-4 実装時に `WidgetContext` に追加する。本 phase では型定義のみ。
 */
export interface StoreDailyLane {
  readonly frame: StoreDailyFrame | null
  readonly bundle: StoreDailyBundle
}
