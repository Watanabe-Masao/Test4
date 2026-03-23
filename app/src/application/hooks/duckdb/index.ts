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

// CTS — 階層クエリ（カテゴリ集約・日次トレンド・CTS レコード）
export {
  useDuckDBLevelAggregation,
  useDuckDBCategoryDailyTrend,
  useDuckDBCategoryHourly,
  useDuckDBCategoryDowMatrix,
  useDuckDBCategoryTimeRecords,
  fetchCategoryTimeRecords,
} from './useCtsHierarchyQueries'
export type {
  LevelAggregationRow,
  CategoryDailyTrendRow,
  CategoryHourlyRow,
  CategoryDowMatrixRow,
} from './useCtsHierarchyQueries'

// CTS — 時間帯集約クエリ（時間帯・店舗・マトリクス・日数）
export {
  useDuckDBHourlyAggregation,
  useDuckDBStoreAggregation,
  useDuckDBHourDowMatrix,
  useDuckDBDistinctDayCount,
  useDuckDBDowDivisorMap,
} from './useCtsAggregationQueries'
export type {
  HourlyAggregationRow,
  StoreAggregationRow,
  HourDowMatrixRow,
} from './useCtsAggregationQueries'

// 部門KPI
export { useDuckDBDeptKpi, useDuckDBDeptKpiTrend } from './useDeptKpiQueries'
export type {
  DuckDBDeptKpiResult,
  DeptKpiSummaryResolved,
  DeptKpiRankedRow,
  DeptKpiSummaryRow,
  DeptKpiMonthlyTrendRow,
} from './useDeptKpiQueries'

// StoreDaySummary（日次集計・指標）
export {
  useDuckDBDailyCumulative,
  useDuckDBAggregatedRates,
  useDuckDBStoreDaySummary,
} from './useSummaryQueries'
export type {
  DailyCumulativeRow,
  AggregatedRatesRow,
  StoreDaySummaryRow,
} from './useSummaryQueries'

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
  useDuckDBCategoryHierarchy,
  buildCategoryBenchmarkScores,
  buildCategoryBenchmarkScoresByDate,
  buildCategoryTrendData,
  buildBoxPlotData,
  buildBoxPlotDataByDate,
  buildStoreBreakdown,
  buildDateBreakdown,
} from './useAdvancedQueries'
export type {
  CategoryMixWeeklyRow,
  CategoryBenchmarkRow,
  CategoryBenchmarkTrendRow,
  CategoryHierarchyItem,
  CategoryBenchmarkScore,
  CategoryTrendPoint,
  BoxPlotStats,
  StoreBreakdownItem,
  DateBreakdownItem,
  BenchmarkMetric,
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

// 前年店舗別仕入額
export { useStoreCostPriceQuery } from './useStoreCostPriceQuery'
export type { StoreCostPriceMap, StoreCostPriceQueryResult } from './useStoreCostPriceQuery'

// 店舗日別仕入額
export { useStoreDailyMarkupRateQuery } from './useStoreDailyMarkupRateQuery'
export type {
  DailyMarkupCostPriceMap,
  StoreDailyMarkupRateQueryResult,
} from './useStoreDailyMarkupRateQuery'

// 天気時間帯
export { useDuckDBWeatherHourly, useDuckDBWeatherHourlyAvg } from './useWeatherHourlyQuery'
export type { HourlyWeatherAvgRow } from '@/application/queries/weather'

// 日別詳細（カレンダーモーダル用一括取得）
export { useDayDetailData } from './useDayDetailData'
export type { DayDetailData, DayDetailDataParams, WeatherCandidate } from './useDayDetailData'

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
