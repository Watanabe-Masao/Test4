/**
 * カテゴリベンチマーク算出ロジック（日別データポイントベース）
 *
 * categoryBenchmarkLogic.ts から分離。
 * 日別の売上データポイントから日次構成比の変動を算出し、
 * 安定度・バラツキに基づく商品力スコアを計算する。
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 *
 * @responsibility R:calculation
 */
import type {
  CategoryBenchmarkRow,
  CategoryBenchmarkTrendRow,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'
import type { CategoryBenchmarkScore } from './categoryBenchmarkLogic'
import { classifyProductType } from './categoryBenchmarkLogic'

/**
 * カテゴリスコア算出（日別データポイントベース）
 *
 * 日別の売上構成比の変動から安定度を算出する。
 * buildCategoryBenchmarkScores が店舗間バラツキを見るのに対し、
 * この関数は時系列バラツキ（日次変動）を見る。
 *
 * @responsibility R:calculation
 */
export function buildCategoryBenchmarkScoresByDate(
  trendRows: readonly CategoryBenchmarkTrendRow[],
  benchmarkRows: readonly CategoryBenchmarkRow[],
  minStores = 1,
  totalStoreCount = 0,
): readonly CategoryBenchmarkScore[] {
  const storeCountMap = new Map<string, number>()
  for (const row of benchmarkRows) {
    storeCountMap.set(row.code, row.storeCount)
  }

  const dateCatSales = new Map<string, Map<string, { sales: number; name: string }>>()
  const catTotalSales = new Map<string, { sales: number; name: string }>()

  for (const row of trendRows) {
    let dateMap = dateCatSales.get(row.dateKey)
    if (!dateMap) {
      dateMap = new Map()
      dateCatSales.set(row.dateKey, dateMap)
    }
    const prev = dateMap.get(row.code) ?? { sales: 0, name: row.name }
    dateMap.set(row.code, { sales: prev.sales + row.totalSales, name: row.name })

    const ct = catTotalSales.get(row.code) ?? { sales: 0, name: row.name }
    catTotalSales.set(row.code, { sales: ct.sales + row.totalSales, name: row.name })
  }

  const dateTotals = new Map<string, number>()
  for (const [dateKey, catMap] of dateCatSales) {
    let total = 0
    for (const [, v] of catMap) total += v.sales
    dateTotals.set(dateKey, total)
  }

  const categoryShares = new Map<
    string,
    { name: string; totalSales: number; shares: number[]; sqlStoreCount: number }
  >()

  for (const [code, catInfo] of catTotalSales) {
    const sqlStoreCount = storeCountMap.get(code) ?? 0
    if (sqlStoreCount < minStores) continue

    const shares: number[] = []
    for (const [dateKey, catMap] of dateCatSales) {
      const catSales = catMap.get(code)?.sales ?? 0
      const dateTotal = dateTotals.get(dateKey) ?? 0
      shares.push(dateTotal > 0 ? catSales / dateTotal : 0)
    }

    categoryShares.set(code, {
      name: catInfo.name,
      totalSales: catInfo.sales,
      shares,
      sqlStoreCount,
    })
  }

  let maxAvgShare = 0
  const entries: {
    code: string
    name: string
    totalSales: number
    shares: number[]
    avgShare: number
    n: number
    sqlStoreCount: number
  }[] = []

  for (const [code, cat] of categoryShares) {
    const n = cat.shares.length
    if (n === 0) continue
    const avgShare = cat.shares.reduce((a, b) => a + b, 0) / n
    if (avgShare > maxAvgShare) maxAvgShare = avgShare
    entries.push({
      code,
      name: cat.name,
      totalSales: cat.totalSales,
      shares: cat.shares,
      avgShare,
      n,
      sqlStoreCount: cat.sqlStoreCount,
    })
  }

  const effectiveStoreCount =
    totalStoreCount > 0
      ? totalStoreCount
      : entries.length > 0
        ? Math.max(...entries.map((e) => e.sqlStoreCount))
        : 0
  const results: CategoryBenchmarkScore[] = []
  for (const entry of entries) {
    const { code, name, totalSales, shares, avgShare, n, sqlStoreCount } = entry

    const index = maxAvgShare > 0 ? (avgShare / maxAvgShare) * 100 : 0
    const stddev = Math.sqrt(
      shares.reduce((s, v) => s + (v - avgShare) ** 2, 0) / Math.max(n - 1, 1),
    )
    const cv = avgShare > 0 ? stddev / avgShare : 0
    const dominance =
      effectiveStoreCount > 0 ? sqlStoreCount / effectiveStoreCount : sqlStoreCount > 0 ? 1 : 0
    const stability = Math.max(0, 1 - cv / 2)
    const productType = classifyProductType(index, cv)

    results.push({
      code,
      name,
      totalSales,
      scoreSum: avgShare * n,
      storeCount: n,
      activeStoreCount: n,
      index,
      variance: cv,
      dominance,
      stability,
      avgShare,
      productType,
      metric: 'share',
    })
  }

  results.sort((a, b) => b.index * b.stability - a.index * a.stability)
  return results
}
