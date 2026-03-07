/**
 * 高度分析クエリフック群
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  queryCategoryMixWeekly,
  queryCategoryBenchmark,
  type CategoryMixWeeklyRow,
  type CategoryBenchmarkRow,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'

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
      })
  }, [dateRange, storeIds, level])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/**
 * 指数加重スコアを計算する
 *
 * s(r) = e^{-k(r-1)}
 * k = ln(5) / (N-1) で N店舗中の5位がスコア0.2程度になるよう調整
 * Index = (S / N) × 100 で正規化（100 = 全店舗1位、0 = 最下位）
 */
export interface CategoryBenchmarkScore {
  readonly code: string
  readonly name: string
  readonly totalSales: number
  readonly scoreSum: number
  readonly storeCount: number
  readonly index: number
}

export function buildCategoryBenchmarkScores(
  rows: readonly CategoryBenchmarkRow[],
): readonly CategoryBenchmarkScore[] {
  // カテゴリ別にグループ化
  const categoryMap = new Map<
    string,
    { name: string; totalSales: number; storeCount: number; scores: number[] }
  >()

  for (const row of rows) {
    let cat = categoryMap.get(row.code)
    if (!cat) {
      cat = { name: row.name, totalSales: 0, storeCount: row.storeCount, scores: [] }
      categoryMap.set(row.code, cat)
    }
    cat.totalSales += row.totalSales

    // s(r) = e^{-k(r-1)}
    const n = row.storeCount
    const k = n > 1 ? Math.log(5) / (n - 1) : 0
    const score = Math.exp(-k * (row.salesRank - 1))
    cat.scores.push(score)
  }

  const results: CategoryBenchmarkScore[] = []
  for (const [code, cat] of categoryMap) {
    const scoreSum = cat.scores.reduce((a, b) => a + b, 0)
    // Index = (S / N) × 100
    const index = cat.storeCount > 0 ? (scoreSum / cat.storeCount) * 100 : 0
    results.push({
      code,
      name: cat.name,
      totalSales: cat.totalSales,
      scoreSum,
      storeCount: cat.storeCount,
      index,
    })
  }

  // Sort by index descending
  results.sort((a, b) => b.index - a.index)
  return results
}

export type { CategoryMixWeeklyRow, CategoryBenchmarkRow }
