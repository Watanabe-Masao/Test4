/**
 * CategoryDailyBundle — 部門×日次シリーズレーンの型契約 (contract only, 実装なし)
 *
 * unify-period-analysis Phase 6.5 Step B pre-work (Phase 6.5-1):
 * `YoYWaterfallChart` が現在 `CategoryTimeSalesRecord[]` を presentation 層で
 * 直接 iterate している状態を解消するため、sibling lane
 * (`ctx.categoryDailyLane`) として切り出す最小契約を、実装に先立って型レベル
 * で固定する。
 *
 * `timeSlotLane` / `freePeriodLane` / `storeDailyLane` と並置する 4 本目の
 * sibling lane。
 *
 * ## 責務
 *
 * 1. `CategoryDailyFrame` は `(dateRange, storeIds, comparison)` を受け取る
 * 2. `CategoryDailyBundle` は `current / comparison` の 2 series + meta を返す
 * 3. presentation は `CategoryDailySeries` のみ触る。
 *    `CategoryTimeSalesRecord` の直接 import は禁止
 *    (`categoryDailyLaneSurfaceGuard` で ratchet-down、Phase 6.5-5 で
 *    YoYWaterfallChart ecosystem の 0 到達を目標)
 *
 * ## 非責務
 *
 * - CTS (Category×Time×Sales) raw records の廃止 (infra 層の取得経路は継続)
 * - 時刻次元 (Step C `timeSlotLane` で別管理)
 * - 店舗次元 (Phase 6.5 sibling `StoreDailyBundle` で別管理)
 * - Shapley 要因分解の domain 計算 (既存 `calculateFactorDecomposition` を継続利用)
 *
 * ## 比較意味論
 *
 * `timeSlotLane` / `storeDailyLane` と同じく `sameDate` / `sameDayOfWeek` を
 * 既存 `ComparisonScope` から流用。`wow` は初期契約から外す。
 *
 * @see projects/unify-period-analysis/phase-6-5-step-b-design.md
 * @see app/src/application/hooks/storeDaily/StoreDailyBundle.types.ts (sibling)
 * @see app/src/application/hooks/timeSlot/TimeSlotBundle.types.ts (参照実装)
 *
 * @responsibility R:utility
 */
import type { DateRange } from '@/domain/models/calendar'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'

// ── Frame ────────────────────────────────────────────────

/**
 * 部門×日次シリーズの入力 frame。
 * `TimeSlotFrame` / `StoreDailyFrame` / `FreePeriodAnalysisFrame` と sibling
 * 関係にあり、同じ `ComparisonScope` を流用する。
 */
export interface CategoryDailyFrame {
  readonly dateRange: DateRange
  readonly storeIds: readonly string[]
  readonly comparison: ComparisonScope | null
}

// ── Series (projection 済み、presentation 消費可) ─────────

/**
 * 部門×日次の projection 済みデータポイント。
 *
 * `dateKey` は `YYYY-MM-DD` (ISO) 形式。
 * Shapley 要因分解 (`calculateFactorDecomposition`) 入力として直接使える最小面:
 *   - sales (= amount): 売上金額
 *   - customers: 客数 (部門粒度の客数は店舗側の按分結果)
 *   - salesQty: 販売点数 (CTS の quantity)
 */
export interface CategoryDailyDataPoint {
  readonly dateKey: string
  readonly sales: number
  readonly customers: number
  readonly salesQty: number
}

/**
 * 部門単位のエントリ。
 * `deptCode` は業務上の部門コード、`deptName` は表示名 (行単位で stale しない
 * よう projection 時に紐付け済み)。
 */
export interface CategoryDailyDeptEntry {
  readonly deptCode: string
  readonly deptName: string
  /** dateKey 昇順で安定ソートされた日次データポイント */
  readonly daily: readonly CategoryDailyDataPoint[]
  /** 部門単位の期間合計 */
  readonly totals: {
    readonly sales: number
    readonly customers: number
    readonly salesQty: number
  }
}

/**
 * 部門×日次 series。presentation はこの型のみを消費し、
 * `CategoryTimeSalesRecord` の直接 import は行わない
 * (`categoryDailyLaneSurfaceGuard` で ratchet-down)。
 */
export interface CategoryDailySeries {
  /** deptCode 昇順で安定ソートされたエントリ */
  readonly entries: readonly CategoryDailyDeptEntry[]
  /** 全部門×全期間の grand totals */
  readonly grandTotals: {
    readonly sales: number
    readonly customers: number
    readonly salesQty: number
  }
  /** 対象日数 */
  readonly dayCount: number
}

// ── Meta ─────────────────────────────────────────────────

/**
 * 部門×日次レーンの provenance。**全フィールド必須**。
 * `TimeSlotProvenance` / `StoreDailyProvenance` と同形。
 */
export interface CategoryDailyProvenance {
  readonly mappingKind: 'sameDate' | 'sameDayOfWeek' | 'none'
  readonly comparisonRange: { readonly from: string; readonly to: string } | null
}

export interface CategoryDailyMeta {
  readonly usedFallback: boolean
  readonly provenance: CategoryDailyProvenance
}

// ── Bundle (useUnifiedWidgetContext 配布面) ──────────────

/**
 * 部門×日次レーンの bundle 出力。
 * `useCategoryDailyBundle(executor, frame)` の戻り値 (Phase 6.5-3 実装時に追加)。
 */
export interface CategoryDailyBundle {
  readonly currentSeries: CategoryDailySeries | null
  readonly comparisonSeries: CategoryDailySeries | null
  readonly meta: CategoryDailyMeta
  readonly isLoading: boolean
  readonly errors: Partial<Record<'current' | 'comparison', Error>>
  readonly error: Error | null
}

// ── ctx 配布点 (Phase 6.5-4 実装時に UnifiedWidgetContext に追加する形) ──

/**
 * `ctx.categoryDailyLane` の期待形。`timeSlotLane` / `storeDailyLane` /
 * `freePeriodLane` の sibling。Phase 6.5-4 実装時に `WidgetContext` に追加する。
 * 本 phase では型定義のみ。
 */
export interface CategoryDailyLane {
  readonly frame: CategoryDailyFrame | null
  readonly bundle: CategoryDailyBundle
}
