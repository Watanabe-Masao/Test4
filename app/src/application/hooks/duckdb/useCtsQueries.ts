/**
 * CTS（分類別時間帯売上）クエリフック群 — バレル re-export
 *
 * 分割先:
 * - useCtsHierarchyQueries.ts: カテゴリ階層・日次トレンド・CTS レコード
 * - useCtsAggregationQueries.ts: 時間帯集約・店舗集約・マトリクス・日数
 */
export {
  useDuckDBLevelAggregation,
  useDuckDBCategoryDailyTrend,
  useDuckDBCategoryHourly,
  useDuckDBCategoryTimeRecords,
  fetchCategoryTimeRecords,
} from './useCtsHierarchyQueries'
export type {
  LevelAggregationRow,
  CategoryDailyTrendRow,
  CategoryHourlyRow,
} from './useCtsHierarchyQueries'

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
