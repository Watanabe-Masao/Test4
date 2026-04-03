/**
 * Screen Runtime 許可リスト — isPrevYear handler + presentation direct query
 *
 * Gate 3 再定義: nonPairableConsumers を3分類に分離し、
 * presentationDirectQueryAudit で全22ファイルの rollout 計画を台帳化。
 *
 * @invariant INV-RUN-02 Comparison Integrity — isPrevYear handler の段階的廃止を追跡
 * @invariant INV-RUN-03 Fetch Completeness — presentation 直接 query の段階的廃止を追跡
 */
import type { AllowlistEntry, DirectQueryAuditEntry } from './types'

// ════════════════════════════════════════════════════════════════════
// §1. isPrevYear handler 許容リスト（変更なし）
// ════════════════════════════════════════════════════════════════════

/**
 * isPrevYear フラグを持つ handler の許容リスト。
 *
 * Sprint 4: 全 13 handler を PrevYearFlag 型 + CURRENT_SCOPE/COMPARISON_SCOPE 定数に移行。
 * guard regex `isPrevYear\??:\s*(boolean|true|false)` に一致するハンドラは 0 件。
 *
 * isPrevYear フィールド自体は PrevYearFlag 型として全ハンドラに残るが、
 * `boolean` リテラル型ではなく型エイリアス経由のため guard 非検出。
 * @see application/queries/comparisonQueryScope.ts
 */
export const isPrevYearHandlers: readonly AllowlistEntry[] = [
  // ── Sprint 4: PrevYearFlag 移行完了 ──
  // LevelAggregationHandler — ExecuteInput を PrevYearFlag に移行
  // CategoryHourlyHandler — ExecuteInput を PrevYearFlag に移行
  // CategoryDiscountHandler — ExecuteInput を PrevYearFlag に移行
  // StoreCategoryPIHandler — ExecuteInput を PrevYearFlag に移行
  // DailyQuantityHandler — ExecuteInput を PrevYearFlag に移行
  // StoreDaySummaryHandler — 公開 Input を PrevYearFlag に移行
  // HourlyAggregationHandler — 公開 Input を PrevYearFlag に移行
  // DistinctDayCountHandler — 公開 Input を PrevYearFlag に移行
  // CategoryTimeRecordsHandler — 公開 Input を PrevYearFlag に移行
  // MovingAverageHandler — 公開 Input を PrevYearFlag に移行
  // YoyDailyHandler — body literals を CURRENT_SCOPE/COMPARISON_SCOPE に移行
  // DailyQuantityPairHandler — body literals を CURRENT_SCOPE/COMPARISON_SCOPE に移行
  // createPairedHandler — 型 + literals を PrevYearFlag + constants に移行
]

// ════════════════════════════════════════════════════════════════════
// §2. pair handler 消費側の3分類
// ════════════════════════════════════════════════════════════════════

/**
 * 専用設計が必要な消費側（exception design）。
 * 比較意味論が createPairedHandler と根本的に異なり、
 * 標準 pair handler ではなく専用の比較設計が必要。
 */
export const pairExceptionDesign: readonly AllowlistEntry[] = [
  // useCategoryTrendChartData.ts: useCategoryTrendPlan 経由に移行済み（非対称比較 plan）
  // YoYWaterfallChart.tsx: useYoYWaterfallPlan 経由に移行済み（fallback-aware plan）
  // useTimeSlotData.ts: useTimeSlotPlan 経由に移行済み（WoW comparison plan）
  // useDayDetailData.ts: useDayDetailPlan 経由に移行済み（14本 bundled query plan）
  // useClipExport.ts: useClipExportPlan 経由に移行済み（useQueryWithHandler 事前取得）
]

/**
 * 単一呼び出しで比較なし。base handler の直接使用が正当。
 * pair handler への移行は不要（比較意味論がない）。
 */
export const pairJustifiedSingle: readonly AllowlistEntry[] = [
  // ── 以下5件は plan hook 経由に移行済みのため除去 ──
  // CumulativeChart.tsx → useCumulativeChartPlan 経由
  // WeatherAnalysisPanel.tsx → useWeatherAnalysisPlan 経由
  // useDeptHourlyChartData.ts → useDeptHourlyChartPlan 経由
  // CategoryHourlyChart.tsx → useCategoryHourlyChartPlan 経由
  // CategoryMixChart.tsx → useCategoryMixChartPlan 経由
  {
    path: 'application/hooks/useHeatmapPlan.ts',
    reason: 'levelAggregationHandler × 3 ドロップダウン用（比較なし）。plan hook が一元管理',
    category: 'justified',
    removalCondition: '除去不要 — ドロップダウン候補取得は pair 不要',
    lifecycle: 'permanent',
  },
  {
    path: 'application/hooks/usePerformanceIndexPlan.ts',
    reason: 'storeCategoryPIHandler 単一呼び出し（比較なし）。levelAggregation は pair 化済み',
    category: 'justified',
    removalCondition: '除去不要 — 比較なしの正当な base handler 使用',
    lifecycle: 'permanent',
  },
]

/**
 * 後方互換: Gate 4 enforcement guard が参照する統合リスト。
 * pairExceptionDesign + pairJustifiedSingle の合算。
 */
export const nonPairableConsumers: readonly AllowlistEntry[] = [
  ...pairExceptionDesign,
  ...pairJustifiedSingle,
]

// ════════════════════════════════════════════════════════════════════
// §3. presentation direct query 台帳（残存分）
// ════════════════════════════════════════════════════════════════════

/**
 * INV-RUN-03 の対象となるファイルの分類台帳。
 *
 * Gate 3 rollout: 22件 → 0件。全 presentation direct query を Screen Plan hook に移行完了。
 *
 * 解消履歴:
 * - 22→3: Gate 3 rollout (16 plan hooks + comment fixes)
 * - 3→2: useIntegratedSalesPlan bridge 解消 (application/hooks/plans/ に移動)
 * - 2→1: useCategoryTrendPlan (非対称比較 plan)
 * - 1→0: useYoYWaterfallPlan (fallback-aware comparison plan)
 */
export const presentationDirectQueryAudit: readonly DirectQueryAuditEntry[] = []
