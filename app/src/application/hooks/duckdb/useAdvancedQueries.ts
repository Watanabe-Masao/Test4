/**
 * 高度分析クエリフック群
 *
 * データ構築ロジックは categoryBenchmarkLogic.ts / categoryBoxPlotLogic.ts に分離。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import {
  queryCategoryMixWeekly,
  queryCategoryBenchmark,
  queryCategoryBenchmarkTrend,
  queryCategoryHierarchy,
  type CategoryMixWeeklyRow,
  type CategoryBenchmarkRow,
  type CategoryBenchmarkTrendRow,
  type CategoryHierarchyItem,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'

// ── 純粋関数の re-export（後方互換）──
export {
  buildCategoryBenchmarkScores,
  buildCategoryBenchmarkScoresByDate,
  buildCategoryTrendData,
} from './categoryBenchmarkLogic'
export type {
  CategoryBenchmarkScore,
  CategoryTrendPoint,
  BenchmarkMetric,
  ProductType,
} from './categoryBenchmarkLogic'

export {
  buildBoxPlotData,
  buildBoxPlotDataByDate,
  buildStoreBreakdown,
  buildDateBreakdown,
} from './categoryBoxPlotLogic'
export type { BoxPlotStats, StoreBreakdownItem, DateBreakdownItem } from './categoryBoxPlotLogic'

/** カテゴリ構成比 週次推移 */
export function useDuckDBCategoryMixWeekly(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
): AsyncQueryResult<readonly CategoryMixWeeklyRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryCategoryMixWeekly(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        level,
      })
  }, [dateRange, storeIds, level])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** カテゴリベンチマーク（指数加重ランキング） */
export function useDuckDBCategoryBenchmark(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
  parentDeptCode?: string,
  parentLineCode?: string,
): AsyncQueryResult<readonly CategoryBenchmarkRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryCategoryBenchmark(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        level,
        parentDeptCode: parentDeptCode || undefined,
        parentLineCode: parentLineCode || undefined,
      })
  }, [dateRange, storeIds, level, parentDeptCode, parentLineCode])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** カテゴリベンチマーク日別トレンドフック */
export function useDuckDBCategoryBenchmarkTrend(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
  parentDeptCode?: string,
  parentLineCode?: string,
): AsyncQueryResult<readonly CategoryBenchmarkTrendRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryCategoryBenchmarkTrend(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        level,
        parentDeptCode: parentDeptCode || undefined,
        parentLineCode: parentLineCode || undefined,
      })
  }, [dateRange, storeIds, level, parentDeptCode, parentLineCode])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** カテゴリ階層一覧フック（フィルタ用ドロップダウン） */
export function useDuckDBCategoryHierarchy(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
  parentDeptCode?: string,
): AsyncQueryResult<readonly CategoryHierarchyItem[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryCategoryHierarchy(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        level,
        parentDeptCode: parentDeptCode || undefined,
      })
  }, [dateRange, storeIds, level, parentDeptCode])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type {
  CategoryMixWeeklyRow,
  CategoryBenchmarkRow,
  CategoryBenchmarkTrendRow,
  CategoryHierarchyItem,
}
