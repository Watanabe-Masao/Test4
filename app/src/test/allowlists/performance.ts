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
  {
    path: 'application/queries/cts/LevelAggregationHandler.ts',
    reason: 'LevelAggregationPairHandler 導入済み。利用側移行後に isPrevYear を除去',
    category: 'migration',
    removalCondition: 'CategoryPerformanceChart が PairHandler に移行完了',
  },
  {
    path: 'application/queries/cts/HourlyAggregationHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/cts/HourDowMatrixHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/cts/CategoryTimeRecordsHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/cts/CategoryHourlyHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/cts/CategoryDailyTrendHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/cts/StoreCategoryPIHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/cts/CategoryDiscountHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/summary/DailyQuantityHandler.ts',
    reason: 'DailyQuantityPairHandler に置換済みだが isPrevYear が型に残る',
    category: 'migration',
    removalCondition: 'DailyQuantityPairHandler への完全移行',
  },
  {
    path: 'application/queries/summary/DailyCumulativeHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/summary/StoreDaySummaryHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/summary/AggregatedRatesHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/cts/DistinctDayCountHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/temporal/MovingAverageHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/advanced/CategoryMixWeeklyHandler.ts',
    reason: 'pair 化対象（Gate 3）',
    category: 'migration',
    removalCondition: 'createPairedHandler で pair 化完了',
  },
  {
    path: 'application/queries/comparison/YoyDailyHandler.ts',
    reason: '比較専用 handler。pair 化はこの handler の責務と重複するため要検討',
    category: 'migration',
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
]
