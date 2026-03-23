/**
 * ガードテスト許可リスト — DuckDB hook 直接使用（移行カウントダウン）
 *
 * 移行完了履歴（2026-03-23）:
 * - QueryHandler 移行完了: CategoryHierarchyExplorer, CategoryPerformanceChart,
 *   CategoryHourlyChart, DeptHourlyChart, DowPatternChart, FeatureChart, YoYChart,
 *   HeatmapChart, CategoryBenchmarkChart.vm, CategoryBoxPlotChart.vm, CategoryMixChart,
 *   CategoryTrendChart, CumulativeChart, CvTimeSeriesChart, DeptTrendChart, PiCvBubbleChart,
 *   StoreHourlyChart, ConditionMatrixTable, ConditionSummaryBudgetDrill,
 *   FactorDecompositionPanel, WeatherAnalysisPanel, YoYWaterfallChart
 * - facade hook 移行完了: PurchaseAnalysisPage, StorageManagementTab
 * - re-export 整理完了: DayDetailModal, useDuckDBTimeSlotData
 */
import type { AllowlistEntry } from './types'

/** presentation/ での DuckDB hook 直接使用（移行カウントダウン） */
export const presentationDuckdbHook: readonly AllowlistEntry[] = [
  {
    path: 'hooks/useUnifiedWidgetContext.ts',
    reason:
      'ウィジェット統合コンテキスト — MonthlyCalendar/DayDetailModal が duckConn/duckDb を必要とする bridge',
    category: 'bridge',
    removalCondition: 'MonthlyCalendar/DayDetailModal の queryExecutor 完全移行',
  },
] as const
