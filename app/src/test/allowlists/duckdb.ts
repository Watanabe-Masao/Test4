/**
 * ガードテスト許可リスト — DuckDB hook 直接使用（移行カウントダウン）
 */
import type { AllowlistEntry } from './types'

/** presentation/ での DuckDB hook 直接使用（移行カウントダウン） */
export const presentationDuckdbHook: readonly AllowlistEntry[] = [
  {
    path: 'hooks/useUnifiedWidgetContext.ts',
    reason: 'ウィジェット統合コンテキスト',
    category: 'bridge',
    removalCondition: 'QueryHandler 移行',
  },
  // CategoryHierarchyExplorer.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + levelAggregationHandler + categoryHourlyHandler
  // CategoryPerformanceChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + levelAggregationHandler
  // CategoryHourlyChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + categoryHourlyHandler
  // DeptHourlyChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + categoryHourlyHandler
  // DowPatternChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + dowPatternHandler
  // FeatureChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + dailyFeaturesHandler
  // YoYChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + yoyDailyHandler
  {
    path: 'pages/Admin/StorageManagementTab.tsx',
    reason: 'DuckDB 管理',
    category: 'structural',
    removalCondition: 'QueryHandler 移行',
  },
  // DayDetailModal.tsx — re-export 経路整理完了（2026-03-23）: application/hooks/analytics 経由
  // YoYWaterfallChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + categoryTimeRecordsHandler ×3
  // PurchaseAnalysisPage.tsx — usePurchaseComparisonQuery は re-export 済みだが、useDuckDB（conn取得）がガードに引っかかる
  {
    path: 'pages/PurchaseAnalysis/PurchaseAnalysisPage.tsx',
    reason: 'useDuckDB conn 取得（queryExecutor 移行で解消予定）',
    category: 'bridge',
    removalCondition: 'queryExecutor 移行',
  },
  // FactorDecompositionPanel.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + storeDaySummaryHandler
  // WeatherAnalysisPanel.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + storeDaySummaryHandler
  // HeatmapChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + hourDowMatrixHandler + levelAggregationHandler
  // CategoryBenchmarkChart.vm.ts — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + categoryBenchmarkHandler + categoryBenchmarkTrendHandler + categoryHierarchyHandler
  // CategoryBoxPlotChart.vm.ts — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + 同上
  // CategoryMixChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + categoryMixWeeklyHandler
  // CategoryTrendChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + categoryDailyTrendHandler
  // CumulativeChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + dailyCumulativeHandler
  // CvTimeSeriesChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + categoryBenchmarkHandler + categoryBenchmarkTrendHandler
  // DeptTrendChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + deptKpiTrendHandler
  // PiCvBubbleChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + categoryBenchmarkHandler
  // StoreHourlyChart.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + storeAggregationHandler
  // useDuckDBTimeSlotData.ts — application/hooks/useTimeSlotData.ts へ移設完了（2026-03-23）: バレル re-export 化
  // ConditionMatrixTable.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + conditionMatrixHandler
  // ConditionSummaryBudgetDrill.tsx — QueryHandler 移行完了（2026-03-23）: useQueryWithHandler + storeDailyMarkupRateHandler
] as const
