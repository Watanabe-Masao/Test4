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
 * createPairedHandler で pair 化されたら除去する。
 */
export const isPrevYearHandlers: readonly AllowlistEntry[] = [
  // ── pair handler 導入済み（利用側移行も完了） ──
  {
    path: 'application/queries/cts/LevelAggregationHandler.ts',
    reason:
      'isPrevYear は公開 Input 型から除去済み。ExecuteInput 内部型で createPairedHandler 互換性を維持',
    category: 'structural',
    removalCondition: '除去不要 — ExecuteInput は handler 内部実装',
  },
  {
    path: 'application/queries/cts/CategoryHourlyHandler.ts',
    reason:
      'isPrevYear は公開 Input 型から除去済み。ExecuteInput 内部型で createPairedHandler 互換性を維持',
    category: 'structural',
    removalCondition: '除去不要 — ExecuteInput は handler 内部実装',
  },
  // HourDowMatrixHandler — isPrevYear 型除去済み
  {
    path: 'application/queries/cts/CategoryDiscountHandler.ts',
    reason:
      'isPrevYear は公開 Input 型から除去済み。ExecuteInput 内部型で createPairedHandler 互換性を維持',
    category: 'structural',
    removalCondition: '除去不要 — ExecuteInput は handler 内部実装',
  },
  // CategoryDailyTrendHandler — isPrevYear 型除去済み
  {
    path: 'application/queries/cts/StoreCategoryPIHandler.ts',
    reason:
      'isPrevYear は公開 Input 型から除去済み。ExecuteInput 内部型で createPairedHandler 互換性を維持',
    category: 'structural',
    removalCondition: '除去不要 — ExecuteInput は handler 内部実装',
  },
  {
    path: 'application/queries/summary/StoreDaySummaryHandler.ts',
    reason:
      'dayDetailDataLogic が isPrevYear を直接渡す。pair 化済みだが fallback パターンで除去不可',
    category: 'structural',
    removalCondition:
      '除去不要 — dayDetailDataLogic の fallback パターンが isPrevYear を必要とする',
  },
  {
    path: 'application/queries/cts/HourlyAggregationHandler.ts',
    reason: 'useTimeSlotData が WoW 比較で isPrevYear=false を直接渡す。pair 化済みだが除去不可',
    category: 'structural',
    removalCondition: '除去不要 — WoW 比較の isPrevYear=false は pair handler の意味論と異なる',
  },
  // ── pair handler 導入済み（isPrevYear 型除去済み） ──
  // DailyCumulativeHandler — isPrevYear 型除去済み
  // AggregatedRatesHandler — isPrevYear 型除去済み
  {
    path: 'application/queries/cts/DistinctDayCountHandler.ts',
    reason: 'useTimeSlotData が WoW 比較で isPrevYear=false を直接渡す。pair 化済みだが除去不可',
    category: 'structural',
    removalCondition: '除去不要 — WoW 比較の isPrevYear=false は pair handler の意味論と異なる',
  },
  // CategoryMixWeeklyHandler — isPrevYear 型除去済み
  // ── pair handler 導入済み（利用側が複雑パターン） ──
  {
    path: 'application/queries/cts/CategoryTimeRecordsHandler.ts',
    reason: 'YoYWaterfallChart/useClipExport/dayDetailDataLogic が isPrevYear を直接渡す。除去不可',
    category: 'structural',
    removalCondition: 'fallback パターンの専用 handler 設計時に判断',
  },
  // ── 構造的に pair handler に変換不可 ──
  {
    path: 'application/queries/temporal/MovingAverageHandler.ts',
    reason: 'BaseQueryInput 非準拠（RollingAnalysisFrame 使用）。createPairedHandler 不適合',
    category: 'structural',
    removalCondition: 'MovingAverage 専用 pair handler の設計時に判断',
  },
  {
    path: 'application/queries/comparison/YoyDailyHandler.ts',
    reason: '比較専用 handler。pair 化はこの handler の責務と重複するため要検討',
    category: 'structural',
    removalCondition: 'comparison semantics 統一時に判断',
  },
  {
    path: 'application/queries/createPairedHandler.ts',
    reason: 'pair ファクトリ自体が isPrevYear を内部で使用（設計上必要）',
    category: 'structural',
    removalCondition: '除去不要 — ファクトリの内部実装',
  },
  {
    path: 'application/queries/summary/DailyQuantityPairHandler.ts',
    reason: '既存の専用 pair handler。alignPrevYearDay があるため createPairedHandler に置換しない',
    category: 'structural',
    removalCondition: '除去不要 — 専用 pair handler として維持',
  },
  {
    path: 'application/queries/summary/DailyQuantityHandler.ts',
    reason: 'isPrevYear は公開 Input 型から除去済み。ExecuteInput 内部型で互換性を維持',
    category: 'structural',
    removalCondition: '除去不要 — ExecuteInput は handler 内部実装',
  },
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
  {
    path: 'presentation/components/charts/useCategoryTrendChartData.ts',
    reason: 'cur topN（ユーザー選択）≠ prev topN（100固定）— 非対称入力',
    category: 'debt',
    removalCondition: '専用 pair handler（topN 分離型）の設計時に移行',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    reason: '3本のクエリ + isPrevYear fallback パターン',
    category: 'debt',
    removalCondition: 'fallback 統合型の専用 handler 設計時に移行',
  },
  {
    path: 'application/hooks/useTimeSlotData.ts',
    reason: 'hourlyAgg/distinctDayCount: WoW 比較で isPrevYear=false。categoryHourly は移行済み',
    category: 'debt',
    removalCondition: 'WoW 比較対応の比較 handler 設計時に移行',
  },
  {
    path: 'application/hooks/duckdb/useDayDetailData.ts',
    reason: '14本のクエリ + fallback パターン（CTS 7系統 + Summary 3系統 + Weather 2系統）',
    category: 'debt',
    removalCondition: 'bundled query handler（fallback 統合型）の設計時に移行',
  },
  {
    path: 'application/hooks/useClipExport.ts',
    reason: 'queryExecutor.execute() 直接実行（useQueryWithHandler 不使用）。isPrevYear 手動制御',
    category: 'debt',
    removalCondition: 'useQueryWithHandler + pair handler への移行設計時に判断',
  },
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
  },
  {
    path: 'application/hooks/usePerformanceIndexPlan.ts',
    reason: 'storeCategoryPIHandler 単一呼び出し（比較なし）。levelAggregation は pair 化済み',
    category: 'justified',
    removalCondition: '除去不要 — 比較なしの正当な base handler 使用',
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
 * Gate 3 rollout により 22件 → 3件に削減。
 * 残り3件は全て設計対応が必要な項目。
 *
 * 分類:
 * - exception-design: 複雑パターンのため専用設計が必要
 * - plan-bridge: 既に plan hook だが presentation 層に配置。application 層に移動すべき
 */
export const presentationDirectQueryAudit: readonly DirectQueryAuditEntry[] = [
  {
    path: 'presentation/components/charts/useCategoryTrendChartData.ts',
    cluster: 'category',
    classification: 'exception-design',
    reason: 'categoryDailyTrendHandler × 2（cur/prev topN 非対称）。専用 pair handler が先に必要',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    cluster: 'dashboard',
    classification: 'exception-design',
    reason:
      'categoryTimeRecordsHandler × 3（cur + prev + fallback）。isPrevYear fallback パターンの専用設計が必要',
  },
  {
    path: 'presentation/components/charts/useIntegratedSalesPlan.ts',
    cluster: 'standalone',
    classification: 'plan-bridge',
    reason:
      '既に Screen Plan hook だが presentation/ に配置。application/hooks/ への移動に層境界依存の解消が先に必要',
  },
]
