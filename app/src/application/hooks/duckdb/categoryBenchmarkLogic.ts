/**
 * カテゴリベンチマーク算出ロジック（純粋関数）
 *
 * useAdvancedQueries から抽出した純粋関数群。
 * 構成比ベースのスコア算出、タイプ分類、日別トレンド構築を担う。
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 */
import type {
  CategoryBenchmarkRow,
  CategoryBenchmarkTrendRow,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'
import { calculateAmountPI, calculateQuantityPI } from '@/domain/calculations/piValue'

/** ベンチマーク指標の種類 */
export type BenchmarkMetric = 'share' | 'salesPi' | 'quantityPi'

export interface CategoryBenchmarkScore {
  readonly code: string
  readonly name: string
  readonly totalSales: number
  readonly scoreSum: number
  /** 実効店舗数（選択全店舗数。販売0店舗を含む） */
  readonly storeCount: number
  /** 実販売店舗数（実際に売上がある店舗数） */
  readonly activeStoreCount: number
  /** 総合指数 (0-100): 平均値の正規化値 */
  readonly index: number
  /** バラツキ: 変動係数 CV (低=均一、高=偏り) */
  readonly variance: number
  /** カバー率: 実販売店舗数 / 全店舗数 (0-1) */
  readonly dominance: number
  /** 安定度: 1 - CV/2 (0-1, 高=安定) */
  readonly stability: number
  /** 平均値: 使用メトリックの全店舗平均（構成比の場合は0-1、PIの場合は実数） */
  readonly avgShare: number
  /** 商品力タイプ */
  readonly productType: ProductType
  /** 使用されたメトリック */
  readonly metric: BenchmarkMetric
}

/** 商品力4タイプ分類 */
export type ProductType = 'flagship' | 'regional' | 'standard' | 'unstable'

/**
 * CV ベースのタイプ分類
 * - highIndex (>=50): データセット内で相対的に高い構成比
 * - lowVariance (CV < 0.5): 店舗間で安定した構成比
 */
export function classifyProductType(index: number, cv: number): ProductType {
  const highIndex = index >= 50
  const lowVariance = cv < 0.5
  if (highIndex && lowVariance) return 'flagship'
  if (highIndex && !lowVariance) return 'regional'
  if (!highIndex && lowVariance) return 'standard'
  return 'unstable'
}

/**
 * カテゴリスコア算出（構成比 or PI値ベース）
 */
export function buildCategoryBenchmarkScores(
  rows: readonly CategoryBenchmarkRow[],
  minStores = 1,
  totalStoreCount = 0,
  metric: BenchmarkMetric = 'share',
): readonly CategoryBenchmarkScore[] {
  // カテゴリ別にグループ化
  const categoryMap = new Map<
    string,
    {
      name: string
      totalSales: number
      totalQuantity: number
      sqlStoreCount: number
      shares: number[]
      salesPerStore: number[]
      quantityPerStore: number[]
      customersPerStore: number[]
    }
  >()

  for (const row of rows) {
    let cat = categoryMap.get(row.code)
    if (!cat) {
      cat = {
        name: row.name,
        totalSales: 0,
        totalQuantity: 0,
        sqlStoreCount: row.storeCount,
        shares: [],
        salesPerStore: [],
        quantityPerStore: [],
        customersPerStore: [],
      }
      categoryMap.set(row.code, cat)
    }
    cat.totalSales += row.totalSales
    cat.totalQuantity += row.totalQuantity
    cat.shares.push(row.share)
    cat.salesPerStore.push(row.totalSales)
    cat.quantityPerStore.push(row.totalQuantity)
    cat.customersPerStore.push(row.storeCustomers)
  }

  // Phase 1: メトリック値を算出し、正規化用の最大値を求める
  interface CatEntry {
    code: string
    name: string
    totalSales: number
    totalQuantity: number
    sqlStoreCount: number
    n: number
    metricValues: number[]
    salesPerStore: number[]
    quantityPerStore: number[]
    avgMetric: number
  }
  const entries: CatEntry[] = []
  let maxAvgMetric = 0

  for (const [code, cat] of categoryMap) {
    const n = totalStoreCount > 0 ? Math.max(totalStoreCount, cat.sqlStoreCount) : cat.sqlStoreCount
    if (cat.sqlStoreCount < minStores) continue

    // メトリック値を選択
    let metricValues: number[]
    switch (metric) {
      case 'salesPi':
        metricValues = cat.salesPerStore.map((s, i) =>
          calculateAmountPI(s, cat.customersPerStore[i]),
        )
        break
      case 'quantityPi':
        metricValues = cat.quantityPerStore.map((q, i) =>
          calculateQuantityPI(q, cat.customersPerStore[i]),
        )
        break
      default:
        metricValues = [...cat.shares]
        break
    }

    // 販売0店舗を 0 として補完
    const salesPerStore = [...cat.salesPerStore]
    const quantityPerStore = [...cat.quantityPerStore]
    const missingStores = n - cat.sqlStoreCount
    for (let i = 0; i < missingStores; i++) {
      metricValues.push(0)
      salesPerStore.push(0)
      quantityPerStore.push(0)
    }

    const avgMetric = metricValues.reduce((a, b) => a + b, 0) / n
    if (avgMetric > maxAvgMetric) maxAvgMetric = avgMetric

    entries.push({
      code,
      name: cat.name,
      totalSales: cat.totalSales,
      totalQuantity: cat.totalQuantity,
      sqlStoreCount: cat.sqlStoreCount,
      n,
      metricValues,
      salesPerStore,
      quantityPerStore,
      avgMetric,
    })
  }

  // Phase 2: スコア算出
  const results: CategoryBenchmarkScore[] = []
  for (const entry of entries) {
    const { code, name, totalSales, sqlStoreCount, n, metricValues, avgMetric } = entry

    const index = maxAvgMetric > 0 ? (avgMetric / maxAvgMetric) * 100 : 0
    const stddev = Math.sqrt(
      metricValues.reduce((s, v) => s + (v - avgMetric) ** 2, 0) / Math.max(n - 1, 1),
    )
    const cv = avgMetric > 0 ? stddev / avgMetric : 0
    const dominance = n > 0 ? sqlStoreCount / n : 0
    const stability = Math.max(0, 1 - cv / 2)
    const productType = classifyProductType(index, cv)

    results.push({
      code,
      name,
      totalSales,
      scoreSum: avgMetric * n,
      storeCount: n,
      activeStoreCount: sqlStoreCount,
      index,
      variance: cv,
      dominance,
      stability,
      avgShare: avgMetric,
      productType,
      metric,
    })
  }

  results.sort((a, b) => b.index * b.stability - a.index * a.stability)
  return results
}

/** 日別トレンドデータのポイント */
export interface CategoryTrendPoint {
  readonly dateKey: string
  readonly code: string
  readonly name: string
  readonly avgShare: number
  readonly cv: number
  readonly stability: number
  /** 複合スコア: avgShare × stability（ソート・プロット用の絶対値） */
  readonly compositeScore: number
}

/**
 * 日別トレンドデータ構築
 */
export function buildCategoryTrendData(
  rows: readonly CategoryBenchmarkTrendRow[],
  topCodes: readonly string[],
  totalStoreCount = 0,
): readonly CategoryTrendPoint[] {
  const topSet = new Set(topCodes)

  const grouped = new Map<string, { name: string; shares: number[]; sqlStoreCount: number }>()
  for (const row of rows) {
    if (!topSet.has(row.code)) continue
    const key = `${row.dateKey}|${row.code}`
    let entry = grouped.get(key)
    if (!entry) {
      entry = { name: row.name, shares: [], sqlStoreCount: 0 }
      grouped.set(key, entry)
    }
    entry.shares.push(row.share)
    entry.sqlStoreCount = entry.shares.length
  }

  const results: CategoryTrendPoint[] = []
  for (const [key, entry] of grouped) {
    const [dateKey, code] = key.split('|')
    const n =
      totalStoreCount > 0 ? Math.max(totalStoreCount, entry.sqlStoreCount) : entry.sqlStoreCount
    const allShares = [...entry.shares]
    const missingStores = n - entry.sqlStoreCount
    for (let i = 0; i < missingStores; i++) allShares.push(0)

    const avgShare = allShares.reduce((a, b) => a + b, 0) / n
    const stddev = Math.sqrt(
      allShares.reduce((s, v) => s + (v - avgShare) ** 2, 0) / Math.max(n - 1, 1),
    )
    const cv = avgShare > 0 ? stddev / avgShare : 0
    const stability = Math.max(0, 1 - cv / 2)

    results.push({
      dateKey,
      code,
      name: entry.name,
      avgShare,
      cv,
      stability,
      compositeScore: avgShare * stability * 10000,
    })
  }

  results.sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.code.localeCompare(b.code))
  return results
}

// 日別データポイントベースの算出は categoryBenchmarkByDate.ts に分離
export { buildCategoryBenchmarkScoresByDate } from './categoryBenchmarkByDate'
