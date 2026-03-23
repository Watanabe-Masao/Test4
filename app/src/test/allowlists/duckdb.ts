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
  {
    path: 'components/charts/CategoryHierarchyExplorer.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryPerformanceChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryHourlyChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/DeptHourlyChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/DowPatternChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/FeatureChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/YoYChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Admin/StorageManagementTab.tsx',
    reason: 'DuckDB 管理',
    category: 'structural',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Dashboard/widgets/DayDetailModal.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Dashboard/widgets/MonthlyCalendar.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/PurchaseAnalysis/PurchaseAnalysisPage.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/FactorDecompositionPanel.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/DiscountAnalysisPanel.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/WeatherAnalysisPanel.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryHeatmapPanel.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/HeatmapChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryBenchmarkChart.vm.ts',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryBoxPlotChart.vm.ts',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryMixChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryTrendChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CumulativeChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CvTimeSeriesChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/DeptTrendChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/PiCvBubbleChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/StoreHourlyChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/useDuckDBTimeSlotData.ts',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Dashboard/widgets/ConditionMatrixTable.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Dashboard/widgets/ConditionSummaryBudgetDrill.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
] as const
