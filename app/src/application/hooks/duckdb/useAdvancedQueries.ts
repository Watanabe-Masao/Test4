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
 * カテゴリベンチマーク — 指数加重ランキングによる商品力分析
 *
 * 基本指数: s(r) = e^{-k(r-1)}
 * k = ln(5) / (N-1)
 *
 * 分析指標:
 * 1. 総合人気指数 (index): (ΣS / N) × 100
 * 2. 店舗バラツキ (variance): スコアの標準偏差（低=全店で売れる、高=店舗差大）
 * 3. 1位支配力 (dominance): 1位店舗数 / 全店舗数
 * 4. 安定度 (stability): 1 - 順位分散/最大分散
 * 5. 商品力タイプ: 指数とバラツキから4タイプに分類
 */
export interface CategoryBenchmarkScore {
  readonly code: string
  readonly name: string
  readonly totalSales: number
  readonly scoreSum: number
  readonly storeCount: number
  /** 総合人気指数 (0-100) */
  readonly index: number
  /** 店舗バラツキ指数: スコアの標準偏差 (低=均一、高=偏り) */
  readonly variance: number
  /** 1位支配力: 1位取得率 (0-1) */
  readonly dominance: number
  /** 安定度指数: 1 - 順位分散/最大分散 (0-1) */
  readonly stability: number
  /** 平均順位 */
  readonly avgRank: number
  /** 商品力タイプ */
  readonly productType: ProductType
}

/** 商品力4タイプ分類 */
export type ProductType = 'flagship' | 'regional' | 'standard' | 'unstable'

function classifyProductType(index: number, variance: number): ProductType {
  const highIndex = index >= 50
  const lowVariance = variance < 0.25
  if (highIndex && lowVariance) return 'flagship' // 主力商品
  if (highIndex && !lowVariance) return 'regional' // 地域特化商品
  if (!highIndex && lowVariance) return 'standard' // 普通商品
  return 'unstable' // 不安定商品
}

export function buildCategoryBenchmarkScores(
  rows: readonly CategoryBenchmarkRow[],
): readonly CategoryBenchmarkScore[] {
  // カテゴリ別にグループ化
  const categoryMap = new Map<
    string,
    {
      name: string
      totalSales: number
      storeCount: number
      scores: number[]
      ranks: number[]
      rank1Count: number
    }
  >()

  for (const row of rows) {
    let cat = categoryMap.get(row.code)
    if (!cat) {
      cat = {
        name: row.name,
        totalSales: 0,
        storeCount: row.storeCount,
        scores: [],
        ranks: [],
        rank1Count: 0,
      }
      categoryMap.set(row.code, cat)
    }
    cat.totalSales += row.totalSales

    // s(r) = e^{-k(r-1)}
    const n = row.storeCount
    const k = n > 1 ? Math.log(5) / (n - 1) : 0
    const score = Math.exp(-k * (row.salesRank - 1))
    cat.scores.push(score)
    cat.ranks.push(row.salesRank)
    if (row.salesRank === 1) cat.rank1Count++
  }

  const results: CategoryBenchmarkScore[] = []
  for (const [code, cat] of categoryMap) {
    const n = cat.storeCount
    const scoreSum = cat.scores.reduce((a, b) => a + b, 0)

    // 1. 総合人気指数
    const index = n > 0 ? (scoreSum / n) * 100 : 0

    // 2. 店舗バラツキ: スコアの標準偏差
    const meanScore = n > 0 ? scoreSum / n : 0
    const varianceSum = cat.scores.reduce((s, v) => s + (v - meanScore) ** 2, 0)
    const variance = n > 1 ? Math.sqrt(varianceSum / (n - 1)) : 0

    // 3. 1位支配力
    const dominance = n > 0 ? cat.rank1Count / n : 0

    // 4. 安定度: 1 - 順位分散/最大分散
    const avgRank = n > 0 ? cat.ranks.reduce((a, b) => a + b, 0) / n : 0
    const rankVariance = cat.ranks.reduce((s, r) => s + (r - avgRank) ** 2, 0) / Math.max(n, 1)
    // 最大分散 = 均等分布の分散 ≈ (N²-1)/12
    const maxVariance = n > 1 ? (n * n - 1) / 12 : 1
    const stability = 1 - rankVariance / maxVariance

    // 5. タイプ分類
    const productType = classifyProductType(index, variance)

    results.push({
      code,
      name: cat.name,
      totalSales: cat.totalSales,
      scoreSum,
      storeCount: n,
      index,
      variance,
      dominance,
      stability,
      avgRank,
      productType,
    })
  }

  // Sort by index descending
  results.sort((a, b) => b.index - a.index)
  return results
}

export type { CategoryMixWeeklyRow, CategoryBenchmarkRow }
