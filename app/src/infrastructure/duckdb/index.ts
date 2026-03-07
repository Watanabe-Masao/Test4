/**
 * DuckDB-WASM インフラ層 Barrel Export
 */

// エンジン
export { getDuckDBEngine, resetDuckDBEngine } from './engine'
export type { DuckDBEngineState } from './engine'

// スキーマ
export { TABLE_NAMES, ALL_TABLE_DDLS, STORE_DAY_SUMMARY_VIEW_DDL } from './schemas'
export type { TableName } from './schemas'

// データローダー
export { resetTables, loadMonth } from './dataLoader'
export type { LoadResult } from './dataLoader'

// OPFS 永続化
export {
  determineReloadStrategy,
  scheduleParquetExport,
  clearParquetCache,
} from './opfsPersistence'
export type { OpfsReloadStrategy, OpfsCheckResult } from './opfsPersistence'

// クエリランナー
export { queryToObjects, queryScalar, buildWhereClause, storeIdFilter } from './queryRunner'

// クエリモジュール
export {
  queryHourlyAggregation,
  queryLevelAggregation,
  queryStoreAggregation,
  queryHourDowMatrix,
  queryDistinctDayCount,
  queryDowDivisorMap,
  queryCategoryDailyTrend,
  queryCategoryHourly,
} from './queries/categoryTimeSales'
export type {
  CtsFilterParams,
  HourlyAggregationRow,
  LevelAggregationRow,
  StoreAggregationRow,
  HourDowMatrixRow,
  CategoryDailyTrendRow,
  CategoryHourlyRow,
} from './queries/categoryTimeSales'

export {
  queryStoreDaySummary,
  queryAggregatedRates,
  queryDailyCumulative,
  materializeSummary,
} from './queries/storeDaySummary'
export type {
  StoreDaySummaryRow,
  AggregatedRatesRow,
  DailyCumulativeRow,
} from './queries/storeDaySummary'

export {
  queryDeptKpiRanked,
  queryDeptKpiSummary,
  queryDeptKpiMonthlyTrend,
} from './queries/departmentKpi'
export type {
  DeptKpiRankedRow,
  DeptKpiSummaryRow,
  DeptKpiMonthlyTrendRow,
} from './queries/departmentKpi'

export { queryYoyDailyComparison, queryYoyCategoryComparison } from './queries/yoyComparison'
export type { YoyDailyRow, YoyCategoryRow } from './queries/yoyComparison'

export {
  queryDailyFeatures,
  queryHourlyProfile,
  queryDowPattern,
  queryDeptDailyTrend,
} from './queries/features'
export type {
  DailyFeatureRow,
  HourlyProfileRow,
  DowPatternRow,
  DeptDailyTrendRow,
} from './queries/features'

export { queryCategoryMixWeekly, queryCategoryBenchmark } from './queries/advancedAnalytics'
export type {
  CategoryMixWeeklyRow,
  CategoryMixParams,
  CategoryBenchmarkRow,
  CategoryBenchmarkParams,
} from './queries/advancedAnalytics'

export { queryConditionMatrix } from './queries/conditionMatrix'
export type { ConditionMatrixRow, PeriodMetrics } from './queries/conditionMatrix'

export {
  queryDailyRecords,
  queryPrevYearDailyRecords,
  queryAggregatedDailyRecords,
  dailyRecordTotalCost,
} from './queries/dailyRecords'
export type { DailyRecordRow } from './queries/dailyRecords'
