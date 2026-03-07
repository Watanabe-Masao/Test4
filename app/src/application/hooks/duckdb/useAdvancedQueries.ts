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
  /** 実効店舗数（選択全店舗数。販売0店舗を含む） */
  readonly storeCount: number
  /** 実販売店舗数（実際に売上がある店舗数） */
  readonly activeStoreCount: number
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
  /** 平均構成比: 全店舗の売上構成比の平均 (0-1) */
  readonly avgShare: number
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

/**
 * @param rows - SQL 結果行（構成比ベースランキング）
 * @param minStores - 最低取扱店舗数フィルタ（デフォルト: 1 = フィルタなし）
 * @param totalStoreCount - 選択された全店舗数。販売0の店舗も rank=最下位として含めて計算する。
 *                          0 の場合は SQL の store_count をそのまま使う（全店舗モード）。
 */
export function buildCategoryBenchmarkScores(
  rows: readonly CategoryBenchmarkRow[],
  minStores = 1,
  totalStoreCount = 0,
): readonly CategoryBenchmarkScore[] {
  // カテゴリ別にグループ化
  const categoryMap = new Map<
    string,
    {
      name: string
      totalSales: number
      /** SQL が返した実販売店舗数 */
      sqlStoreCount: number
      scores: number[]
      ranks: number[]
      rank1Count: number
      shareSum: number
    }
  >()

  for (const row of rows) {
    let cat = categoryMap.get(row.code)
    if (!cat) {
      cat = {
        name: row.name,
        totalSales: 0,
        sqlStoreCount: row.storeCount,
        scores: [],
        ranks: [],
        rank1Count: 0,
        shareSum: 0,
      }
      categoryMap.set(row.code, cat)
    }
    cat.totalSales += row.totalSales
    cat.shareSum += row.share
    cat.ranks.push(row.salesRank)
    if (row.salesRank === 1) cat.rank1Count++
    // スコアは後で n 確定後に再計算するため、ここでは rank だけ保持
  }

  const results: CategoryBenchmarkScore[] = []
  for (const [code, cat] of categoryMap) {
    // 実効店舗数: totalStoreCount が指定されていればそちらを使う（販売0店舗を含む）
    const n = totalStoreCount > 0 ? Math.max(totalStoreCount, cat.sqlStoreCount) : cat.sqlStoreCount
    // 最低取扱店舗数フィルタは「実際に販売がある店舗数」で判定
    if (cat.sqlStoreCount < minStores) continue

    // 販売0の店舗を補完: rank=n（最下位）として追加
    const missingStores = n - cat.sqlStoreCount
    const allRanks = [...cat.ranks]
    for (let i = 0; i < missingStores; i++) {
      allRanks.push(n) // 販売0 → 最下位
    }

    // s(r) = e^{-k(r-1)}  ※ランキングは構成比ベース
    const k = n > 1 ? Math.log(5) / (n - 1) : 0
    const allScores = allRanks.map((r) => Math.exp(-k * (r - 1)))
    const scoreSum = allScores.reduce((a, b) => a + b, 0)

    // 1. 総合人気指数
    const index = n > 0 ? (scoreSum / n) * 100 : 0

    // 2. 店舗バラツキ: スコアの標準偏差
    const meanScore = n > 0 ? scoreSum / n : 0
    const varianceSum = allScores.reduce((s, v) => s + (v - meanScore) ** 2, 0)
    const variance = n > 1 ? Math.sqrt(varianceSum / (n - 1)) : 0

    // 3. 1位支配力（販売0店舗も母数に含む）
    const dominance = n > 0 ? cat.rank1Count / n : 0

    // 4. 安定度: 1 - 順位分散/最大分散
    const avgRank = n > 0 ? allRanks.reduce((a, b) => a + b, 0) / n : 0
    const rankVariance = allRanks.reduce((s, r) => s + (r - avgRank) ** 2, 0) / Math.max(n, 1)
    // 最大分散 = 均等分布の分散 ≈ (N²-1)/12
    const maxVariance = n > 1 ? (n * n - 1) / 12 : 1
    const stability = 1 - rankVariance / maxVariance

    // 5. タイプ分類
    const productType = classifyProductType(index, variance)

    // 平均構成比（販売0店舗は share=0 として母数に含む）
    const avgShare = n > 0 ? cat.shareSum / n : 0

    results.push({
      code,
      name: cat.name,
      totalSales: cat.totalSales,
      scoreSum,
      storeCount: n,
      activeStoreCount: cat.sqlStoreCount,
      index,
      variance,
      dominance,
      stability,
      avgRank,
      avgShare,
      productType,
    })
  }

  // Sort by index descending
  results.sort((a, b) => b.index - a.index)
  return results
}

export type { CategoryMixWeeklyRow, CategoryBenchmarkRow }
