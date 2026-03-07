/**
 * DuckDB クエリフック群 — バレルエクスポート
 *
 * 責務別に分割されたフックモジュールを再エクスポートする。
 * 外部からは `@/application/hooks/duckdb` または
 * 後方互換の `@/application/hooks/useDuckDBQuery` でインポート可能。
 */

// 汎用非同期クエリフック + ヘルパー
export { useAsyncQuery, toDateKeys, storeIdsToArray } from './useAsyncQuery'
export type { AsyncQueryResult } from './useAsyncQuery'

// CTS（分類別時間帯売上）
export {
  useDuckDBHourlyAggregation,
  useDuckDBLevelAggregation,
  useDuckDBStoreAggregation,
  useDuckDBHourDowMatrix,
  useDuckDBDistinctDayCount,
  useDuckDBDowDivisorMap,
  useDuckDBCategoryDailyTrend,
  useDuckDBCategoryHourly,
  useDuckDBCategoryTimeRecords,
  fetchCategoryTimeRecords,
} from './useCtsQueries'
export type {
  HourlyAggregationRow,
  LevelAggregationRow,
  StoreAggregationRow,
  HourDowMatrixRow,
  CategoryDailyTrendRow,
  CategoryHourlyRow,
} from './useCtsQueries'

// 部門KPI
export { useDuckDBDeptKpi, useDuckDBDeptKpiTrend } from './useDeptKpiQueries'
export type {
  DuckDBDeptKpiResult,
  DeptKpiRankedRow,
  DeptKpiSummaryRow,
  DeptKpiMonthlyTrendRow,
} from './useDeptKpiQueries'

// StoreDaySummary（日次集計・指標）
export { useDuckDBDailyCumulative, useDuckDBAggregatedRates } from './useSummaryQueries'
export type { DailyCumulativeRow, AggregatedRatesRow } from './useSummaryQueries'

// 前年比較（YoY）
export { useDuckDBYoyDaily, useDuckDBYoyCategory } from './useYoyQueries'
export type { YoyDailyRow, YoyCategoryRow } from './useYoyQueries'

// 特徴量
export {
  useDuckDBDailyFeatures,
  useDuckDBHourlyProfile,
  useDuckDBDowPattern,
} from './useFeatureQueries'
export type { DailyFeatureRow, HourlyProfileRow, DowPatternRow } from './useFeatureQueries'

// 高度分析
export {
  useDuckDBCategoryMixWeekly,
  useDuckDBCategoryBenchmark,
  useDuckDBCategoryBenchmarkTrend,
  buildCategoryBenchmarkScores,
  buildCategoryTrendData,
} from './useAdvancedQueries'
export type {
  CategoryMixWeeklyRow,
  CategoryBenchmarkRow,
  CategoryBenchmarkTrendRow,
  CategoryBenchmarkScore,
  CategoryTrendPoint,
  ProductType,
} from './useAdvancedQueries'

// 店舗期間メトリクス + 予算分析
export {
  useDuckDBStorePeriodMetrics,
  useDuckDBDailyCumulativeBudget,
  useDuckDBBudgetAnalysisSummary,
} from './useMetricsQueries'
export type {
  PeriodMetrics,
  DailyCumulativeBudgetRow,
  BudgetAnalysisSummaryRow,
} from './useMetricsQueries'

// 日別明細
export {
  useDuckDBDailyRecords,
  useDuckDBPrevYearDailyRecords,
  useDuckDBAggregatedDailyRecords,
} from './useDailyRecordQueries'
export type { DailyRecordRow } from './useDailyRecordQueries'

// 比較コンテキスト
export { useComparisonContextQuery } from './useComparisonContextQuery'

// コンディションマトリクス
export { useDuckDBConditionMatrix, buildConditionMatrix } from './useConditionMatrix'
export type {
  ConditionMatrixRow,
  MatrixCell,
  MatrixRowData,
  ConditionMatrixResult,
  TrendDirection,
  TrendDirectionCell,
  TrendDirectionRow,
} from './useConditionMatrix'
