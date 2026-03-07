/**
 * DuckDB クエリフック — 後方互換バレル
 *
 * 実装は duckdb/ ディレクトリに責務別に分割された。
 * このファイルは既存の import パスを維持するための re-export バレル。
 */
export {
  // 汎用
  useAsyncQuery,
  toDateKeys,
  storeIdsToArray,
  // CTS
  useDuckDBHourlyAggregation,
  useDuckDBLevelAggregation,
  useDuckDBStoreAggregation,
  useDuckDBHourDowMatrix,
  useDuckDBDistinctDayCount,
  useDuckDBDowDivisorMap,
  useDuckDBCategoryDailyTrend,
  useDuckDBCategoryHourly,
  // 部門KPI
  useDuckDBDeptKpi,
  useDuckDBDeptKpiTrend,
  // StoreDaySummary
  useDuckDBDailyCumulative,
  useDuckDBAggregatedRates,
  // YoY
  useDuckDBYoyDaily,
  useDuckDBYoyCategory,
  // 特徴量
  useDuckDBDailyFeatures,
  useDuckDBHourlyProfile,
  useDuckDBDowPattern,
  // 高度分析
  useDuckDBCategoryMixWeekly,
  useDuckDBCategoryBenchmark,
  useDuckDBCategoryBenchmarkTrend,
  useDuckDBCategoryHierarchy,
  buildCategoryBenchmarkScores,
  buildCategoryTrendData,
  buildBoxPlotData,
  buildStoreBreakdown,
  // 店舗期間メトリクス + 予算分析
  useDuckDBStorePeriodMetrics,
  useDuckDBDailyCumulativeBudget,
  useDuckDBBudgetAnalysisSummary,
  // 日別明細
  useDuckDBDailyRecords,
  useDuckDBPrevYearDailyRecords,
  useDuckDBAggregatedDailyRecords,
} from './duckdb'

export type {
  AsyncQueryResult,
  DuckDBDeptKpiResult,
  HourlyAggregationRow,
  LevelAggregationRow,
  StoreAggregationRow,
  HourDowMatrixRow,
  CategoryDailyTrendRow,
  CategoryHourlyRow,
  DeptKpiRankedRow,
  DeptKpiSummaryRow,
  DeptKpiMonthlyTrendRow,
  DailyCumulativeRow,
  AggregatedRatesRow,
  YoyDailyRow,
  YoyCategoryRow,
  DailyFeatureRow,
  HourlyProfileRow,
  DowPatternRow,
  CategoryMixWeeklyRow,
  CategoryBenchmarkRow,
  CategoryBenchmarkTrendRow,
  CategoryBenchmarkScore,
  CategoryTrendPoint,
  CategoryHierarchyItem,
  BoxPlotStats,
  StoreBreakdownItem,
  BenchmarkMetric,
  ProductType,
  PeriodMetrics,
  DailyCumulativeBudgetRow,
  BudgetAnalysisSummaryRow,
  DailyRecordRow,
} from './duckdb'
