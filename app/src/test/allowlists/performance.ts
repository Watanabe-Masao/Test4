/**
 * Screen Runtime 許可リスト — isPrevYear handler + presentation direct query
 *
 * @invariant INV-RUN-02 Comparison Integrity — isPrevYear handler の段階的廃止を追跡
 * @invariant INV-RUN-03 Fetch Completeness — presentation 直接 query の段階的廃止を追跡
 */
import type { AllowlistEntry } from './types'

/**
 * isPrevYear フラグを持つ handler の許容リスト。
 * createPairedHandler で pair 化されたら除去する。
 */
export const isPrevYearHandlers: readonly AllowlistEntry[] = [
  // ── pair handler 導入済み（利用側移行も完了） ──
  {
    path: 'application/queries/cts/LevelAggregationHandler.ts',
    reason: 'pair 化+利用側移行済み（useCategoryHierarchyData, usePerformanceIndexPlan）',
    category: 'migration',
    removalCondition: '全利用側が PairHandler に移行完了後に isPrevYear 型を除去',
  },
  {
    path: 'application/queries/cts/CategoryHourlyHandler.ts',
    reason: 'pair 化+利用側移行済み（useCategoryHierarchyData, useTimeSlotData）',
    category: 'migration',
    removalCondition: '全利用側が PairHandler に移行完了後に isPrevYear 型を除去',
  },
  {
    path: 'application/queries/cts/HourDowMatrixHandler.ts',
    reason: 'pair 化+利用側移行済み（HeatmapChart）',
    category: 'migration',
    removalCondition: '全利用側が PairHandler に移行完了後に isPrevYear 型を除去',
  },
  {
    path: 'application/queries/cts/CategoryDiscountHandler.ts',
    reason: 'pair 化+利用側移行済み（CategoryDiscountChart）',
    category: 'migration',
    removalCondition: '全利用側が PairHandler に移行完了後に isPrevYear 型を除去',
  },
  {
    path: 'application/queries/cts/CategoryDailyTrendHandler.ts',
    reason:
      'pair 化+利用側移行済み（CategoryBarChart）。useCategoryTrendChartData は topN 非対称のため不適合',
    category: 'migration',
    removalCondition: 'useCategoryTrendChartData の専用 handler 設計時に判断',
  },
  {
    path: 'application/queries/cts/StoreCategoryPIHandler.ts',
    reason: 'pair 化+利用側移行済み（usePerformanceIndexPlan）',
    category: 'migration',
    removalCondition: '全利用側が PairHandler に移行完了後に isPrevYear 型を除去',
  },
  {
    path: 'application/queries/summary/StoreDaySummaryHandler.ts',
    reason:
      'pair 化+利用側移行済み（FactorDecompositionPanel）。useDayDetailData は fallback パターンのため不適合',
    category: 'migration',
    removalCondition: 'useDayDetailData の専用 handler 設計時に判断',
  },
  {
    path: 'application/queries/cts/HourlyAggregationHandler.ts',
    reason:
      'pair 化+利用側移行済み（useDeptHourlyChartData）。useTimeSlotData は WoW 比較で isPrevYear=false のため不適合',
    category: 'migration',
    removalCondition: 'useTimeSlotData の WoW 比較対応設計時に判断',
  },
  // ── pair handler 導入済み（利用側に単一呼び出しのみ — pair 化不要） ──
  {
    path: 'application/queries/summary/DailyCumulativeHandler.ts',
    reason: 'pair 化済み。CumulativeChart は単一呼び出し（比較なし）のため pair 不要',
    category: 'migration',
    removalCondition: 'CumulativeChart に比較機能が追加された場合に pair handler 移行',
  },
  {
    path: 'application/queries/summary/AggregatedRatesHandler.ts',
    reason: 'pair 化済み。利用側未特定',
    category: 'migration',
    removalCondition: '利用側移行時に判断',
  },
  {
    path: 'application/queries/cts/DistinctDayCountHandler.ts',
    reason: 'pair 化済み。useTimeSlotData は WoW 比較で isPrevYear=false のため不適合',
    category: 'migration',
    removalCondition: 'useTimeSlotData の WoW 比較対応設計時に判断',
  },
  {
    path: 'application/queries/advanced/CategoryMixWeeklyHandler.ts',
    reason: 'pair 化済み。CategoryMixChart は単一呼び出し（比較なし）のため pair 不要',
    category: 'migration',
    removalCondition: 'CategoryMixChart に比較機能が追加された場合に pair handler 移行',
  },
  // ── pair handler 導入済み（利用側が複雑パターン） ──
  {
    path: 'application/queries/cts/CategoryTimeRecordsHandler.ts',
    reason: 'pair 化済み。YoYWaterfallChart/useDayDetailData は fallback パターンのため不適合',
    category: 'migration',
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
    reason: 'DailyQuantityPairHandler に置換済みだが isPrevYear が型に残る',
    category: 'migration',
    removalCondition: 'DailyQuantityPairHandler への完全移行',
  },
]

/**
 * pair handler に移行できない消費側の分類。
 * Gate 4 enforcement guard が例外として認識する。
 *
 * @invariant INV-RUN-02 — これらは比較意味論が createPairedHandler と合致しないため、
 * 専用 handler または別のアプローチが必要。
 */
export const nonPairableConsumers: readonly AllowlistEntry[] = [
  {
    path: 'presentation/components/charts/useCategoryTrendChartData.ts',
    reason: 'cur topN（ユーザー選択）≠ prev topN（100固定）— 非対称入力',
    category: 'structural',
    removalCondition: '専用 pair handler（topN 分離型）の設計時に移行',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    reason: '3本のクエリ + isPrevYear fallback パターン',
    category: 'structural',
    removalCondition: 'fallback 統合型の専用 handler 設計時に移行',
  },
  {
    path: 'application/hooks/useTimeSlotData.ts',
    reason: 'hourlyAgg/distinctDayCount: WoW 比較で isPrevYear=false。categoryHourly は移行済み',
    category: 'structural',
    removalCondition: 'WoW 比較対応の比較 handler 設計時に移行',
  },
  {
    path: 'application/hooks/duckdb/useDayDetailData.ts',
    reason: '14本のクエリ + fallback パターン（CTS 7系統 + Summary 3系統 + Weather 2系統）',
    category: 'structural',
    removalCondition: 'bundled query handler（fallback 統合型）の設計時に移行',
  },
]
