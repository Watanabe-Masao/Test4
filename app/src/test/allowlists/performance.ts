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
  {
    path: 'presentation/components/charts/CumulativeChart.tsx',
    reason: 'dailyCumulativeHandler 単一呼び出し（比較なし）',
    category: 'justified',
    removalCondition: '除去不要 — 比較なしの正当な base handler 使用',
  },
  {
    path: 'application/hooks/useHeatmapPlan.ts',
    reason: 'levelAggregationHandler × 3 ドロップダウン用（比較なし）。plan hook が一元管理',
    category: 'justified',
    removalCondition: '除去不要 — ドロップダウン候補取得は pair 不要',
  },
  {
    path: 'presentation/components/charts/WeatherAnalysisPanel.tsx',
    reason: 'storeDaySummaryHandler 単一呼び出し（比較なし）',
    category: 'justified',
    removalCondition: '除去不要 — 比較なしの正当な base handler 使用',
  },
  {
    path: 'presentation/components/charts/useDeptHourlyChartData.ts',
    reason: 'categoryHourlyHandler 単一呼び出し（比較なし）。hourlyAgg は pair 化済み',
    category: 'justified',
    removalCondition: '除去不要 — 比較なしの正当な base handler 使用',
  },
  {
    path: 'features/category/ui/charts/CategoryHourlyChart.tsx',
    reason: 'categoryHourlyHandler 単一呼び出し（比較なし）',
    category: 'justified',
    removalCondition: '除去不要 — 比較なしの正当な base handler 使用',
  },
  {
    path: 'features/category/ui/charts/CategoryMixChart.tsx',
    reason: 'categoryMixWeeklyHandler 単一呼び出し（比較なし）',
    category: 'justified',
    removalCondition: '除去不要 — 比較なしの正当な base handler 使用',
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
// §3. presentation direct query 台帳（全22ファイル）
// ════════════════════════════════════════════════════════════════════

/**
 * INV-RUN-03 の対象となる全22ファイルの分類台帳。
 *
 * 分類:
 * - debt: plan hook 化で除去すべき（useQueryWithHandler を application 層に移動）
 * - exception-design: 複雑パターンのため専用設計が必要
 * - plan-bridge: 既に plan hook だが presentation 層に配置。application 層に移動すべき
 * - comment-only: コード使用なし（コメント/JSDoc 内の言及のみ）
 *
 * クラスター:
 * - category: カテゴリ分析系（高ROI、階層・比較の再利用多）
 * - time-slot: 時間帯・曜日分析系
 * - standalone: 単発チャート系（低影響、最後に対応）
 * - dashboard: ダッシュボード widget 系
 * - infra: 型定義・基盤コンポーネント
 */
export const presentationDirectQueryAudit: readonly DirectQueryAuditEntry[] = [
  // ── category cluster（優先度1: 高ROI）──
  {
    path: 'presentation/components/charts/useCategoryHierarchyData.ts',
    cluster: 'category',
    classification: 'debt',
    reason: 'levelAggregationPairHandler + categoryHourlyPairHandler 2本。plan hook に集約可能',
  },
  {
    path: 'presentation/components/charts/useCategoryTrendChartData.ts',
    cluster: 'category',
    classification: 'exception-design',
    reason: 'categoryDailyTrendHandler × 2（cur/prev topN 非対称）。専用 pair handler が先に必要',
  },
  {
    path: 'presentation/components/charts/useDeptHourlyChartData.ts',
    cluster: 'category',
    classification: 'debt',
    reason: 'categoryHourlyHandler 単一呼び出し。plan hook に移動可能',
  },
  {
    path: 'features/category/ui/charts/CategoryDiscountChart.tsx',
    cluster: 'category',
    classification: 'debt',
    reason: 'categoryDiscountPairHandler 単一呼び出し + visibility guard。plan hook に移動可能',
  },
  {
    path: 'features/category/ui/charts/CategoryBarChart.tsx',
    cluster: 'category',
    classification: 'debt',
    reason: 'categoryDailyTrendPairHandler 単一呼び出し + visibility guard。plan hook に移動可能',
  },
  {
    path: 'features/category/ui/charts/CategoryHourlyChart.tsx',
    cluster: 'category',
    classification: 'debt',
    reason: 'categoryHourlyHandler 単一呼び出し。plan hook に移動可能',
  },
  {
    path: 'features/category/ui/charts/CategoryMixChart.tsx',
    cluster: 'category',
    classification: 'debt',
    reason: 'categoryMixWeeklyHandler 単一呼び出し。plan hook に移動可能',
  },
  // ── dashboard cluster（優先度2）──
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    cluster: 'dashboard',
    classification: 'exception-design',
    reason:
      'categoryTimeRecordsHandler × 3（cur + prev + fallback）。isPrevYear fallback パターンの専用設計が必要',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/ConditionMatrixTable.tsx',
    cluster: 'dashboard',
    classification: 'debt',
    reason: 'conditionMatrixHandler 単一呼び出し。plan hook に移動可能',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/ConditionSummaryBudgetDrill.tsx',
    cluster: 'dashboard',
    classification: 'debt',
    reason: 'storeDailyMarkupRateHandler 条件付き呼び出し（activeMetric=markupRate 時のみ）',
  },
  {
    path: 'presentation/components/charts/FactorDecompositionPanel.tsx',
    cluster: 'dashboard',
    classification: 'debt',
    reason: 'storeDaySummaryPairHandler 条件付き呼び出し（rightAxisMode 時のみ）',
  },
  // ── standalone cluster（優先度3: 低影響）──
  {
    path: 'presentation/components/charts/CumulativeChart.tsx',
    cluster: 'standalone',
    classification: 'debt',
    reason: 'dailyCumulativeHandler 単一呼び出し。plan hook に移動可能',
  },
  {
    path: 'presentation/components/charts/DowPatternChart.tsx',
    cluster: 'standalone',
    classification: 'debt',
    reason: 'dowPatternHandler 単一呼び出し。plan hook に移動可能',
  },
  {
    path: 'presentation/components/charts/DeptTrendChart.tsx',
    cluster: 'standalone',
    classification: 'debt',
    reason: 'deptKpiTrendHandler 単一呼び出し。plan hook に移動可能',
  },
  {
    path: 'presentation/components/charts/StoreHourlyChart.tsx',
    cluster: 'standalone',
    classification: 'debt',
    reason: 'storeAggregationHandler 単一呼び出し。plan hook に移動可能',
  },
  {
    path: 'presentation/components/charts/WeatherAnalysisPanel.tsx',
    cluster: 'standalone',
    classification: 'debt',
    reason: 'storeDaySummaryHandler 単一呼び出し。plan hook に移動可能',
  },
  {
    path: 'presentation/components/charts/FeatureChart.tsx',
    cluster: 'standalone',
    classification: 'debt',
    reason: 'dailyFeaturesHandler 単一呼び出し。plan hook に移動可能',
  },
  {
    path: 'presentation/components/charts/YoYChart.tsx',
    cluster: 'standalone',
    classification: 'debt',
    reason: 'yoyDailyHandler 単一呼び出し（handler 自体が比較内蔵）。plan hook に移動可能',
  },
  // ── time-slot cluster ──
  // 注: useTimeSlotData, useDayDetailData は application 層のため INV-RUN-03 対象外
  // ── plan-bridge（plan hook だが presentation 層に配置）──
  {
    path: 'presentation/components/charts/useIntegratedSalesPlan.ts',
    cluster: 'standalone',
    classification: 'plan-bridge',
    reason: '既に Screen Plan hook だが presentation/ に配置。application/hooks/ に移動すべき',
  },
  // ── infra（コメント言及のみ、コード使用なし）──
  {
    path: 'presentation/components/widgets/PageWidgetContainer.tsx',
    cluster: 'infra',
    classification: 'comment-only',
    reason: 'JSDoc コメント内の言及のみ。useQueryWithHandler の import/呼び出しなし',
  },
  {
    path: 'presentation/components/widgets/types.ts',
    cluster: 'infra',
    classification: 'comment-only',
    reason: 'JSDoc コメント内の言及のみ。useQueryWithHandler の import/呼び出しなし',
  },
  {
    path: 'features/category/ui/charts/CategoryHierarchyExplorer.tsx',
    cluster: 'category',
    classification: 'comment-only',
    reason: 'migration コメント内の言及のみ。クエリは useCategoryHierarchyData に委譲',
  },
]
