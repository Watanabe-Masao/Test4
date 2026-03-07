/**
 * 高度分析クエリフック群
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  queryCategoryMixWeekly,
  queryCategoryBenchmark,
  queryCategoryBenchmarkTrend,
  type CategoryMixWeeklyRow,
  type CategoryBenchmarkRow,
  type CategoryBenchmarkTrendRow,
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
 * カテゴリベンチマーク — 構成比実数値ベースの商品力分析
 *
 * 各カテゴリについて、全店舗の構成比（カテゴリ売上/店舗全体売上）を収集し、
 * その平均値・変動係数(CV)から総合的なカテゴリ評価を算出する。
 *
 * 分析指標:
 * 1. 総合指数 (index): 平均構成比を 0-100 に正規化（データセット内最大 = 100）
 * 2. バラツキ (variance): 構成比の CV（変動係数 = σ/μ）。低=全店で均一、高=店舗差大
 * 3. カバー率 (dominance): 実販売店舗数 / 全店舗数
 * 4. 安定度 (stability): 1 - CV/2（CV が小さいほど安定）
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
  /** 総合指数 (0-100): 平均構成比の正規化値 */
  readonly index: number
  /** バラツキ: 構成比の変動係数 CV (低=均一、高=偏り) */
  readonly variance: number
  /** カバー率: 実販売店舗数 / 全店舗数 (0-1) */
  readonly dominance: number
  /** 安定度: 1 - CV/2 (0-1, 高=安定) */
  readonly stability: number
  /** 平均構成比: 全店舗の売上構成比の平均 (0-1) */
  readonly avgShare: number
  /** 商品力タイプ */
  readonly productType: ProductType
}

/** 商品力4タイプ分類 */
export type ProductType = 'flagship' | 'regional' | 'standard' | 'unstable'

/**
 * CV ベースのタイプ分類
 * - highIndex (>=50): データセット内で相対的に高い構成比
 * - lowVariance (CV < 0.5): 店舗間で安定した構成比
 */
function classifyProductType(index: number, cv: number): ProductType {
  const highIndex = index >= 50
  const lowVariance = cv < 0.5
  if (highIndex && lowVariance) return 'flagship' // 主力: 高構成比 × 安定
  if (highIndex && !lowVariance) return 'regional' // 地域特化: 高構成比 × 偏り
  if (!highIndex && lowVariance) return 'standard' // 普通: 低構成比 × 安定
  return 'unstable' // 不安定: 低構成比 × 偏り
}

/**
 * 構成比実数値ベースのカテゴリスコア算出
 *
 * @param rows - SQL 結果行（カテゴリ×店舗の構成比データ）
 * @param minStores - 最低取扱店舗数フィルタ（デフォルト: 1 = フィルタなし）
 * @param totalStoreCount - 選択された全店舗数。販売0の店舗も share=0 として含めて計算する。
 *                          0 の場合は SQL の store_count をそのまま使う（全店舗モード）。
 */
export function buildCategoryBenchmarkScores(
  rows: readonly CategoryBenchmarkRow[],
  minStores = 1,
  totalStoreCount = 0,
): readonly CategoryBenchmarkScore[] {
  // カテゴリ別にグループ化（各店舗の構成比を個別に保持）
  const categoryMap = new Map<
    string,
    {
      name: string
      totalSales: number
      sqlStoreCount: number
      shares: number[]
    }
  >()

  for (const row of rows) {
    let cat = categoryMap.get(row.code)
    if (!cat) {
      cat = {
        name: row.name,
        totalSales: 0,
        sqlStoreCount: row.storeCount,
        shares: [],
      }
      categoryMap.set(row.code, cat)
    }
    cat.totalSales += row.totalSales
    cat.shares.push(row.share)
  }

  // Phase 1: 各カテゴリの平均構成比を算出し、正規化用の最大値を求める
  interface CatEntry {
    code: string
    name: string
    totalSales: number
    sqlStoreCount: number
    n: number
    allShares: number[]
    avgShare: number
  }
  const entries: CatEntry[] = []
  let maxAvgShare = 0

  for (const [code, cat] of categoryMap) {
    const n = totalStoreCount > 0 ? Math.max(totalStoreCount, cat.sqlStoreCount) : cat.sqlStoreCount
    if (cat.sqlStoreCount < minStores) continue

    // 販売0店舗を share=0 として補完
    const allShares = [...cat.shares]
    const missingStores = n - cat.sqlStoreCount
    for (let i = 0; i < missingStores; i++) allShares.push(0)

    const avgShare = allShares.reduce((a, b) => a + b, 0) / n
    if (avgShare > maxAvgShare) maxAvgShare = avgShare

    entries.push({
      code,
      name: cat.name,
      totalSales: cat.totalSales,
      sqlStoreCount: cat.sqlStoreCount,
      n,
      allShares,
      avgShare,
    })
  }

  // Phase 2: スコア算出
  const results: CategoryBenchmarkScore[] = []
  for (const entry of entries) {
    const { code, name, totalSales, sqlStoreCount, n, allShares, avgShare } = entry

    // 1. Index: 平均構成比を 0-100 に正規化（最大の平均構成比 = 100）
    const index = maxAvgShare > 0 ? (avgShare / maxAvgShare) * 100 : 0

    // 2. バラツキ: 構成比の変動係数 (CV = σ / μ)
    const stddev = Math.sqrt(
      allShares.reduce((s, v) => s + (v - avgShare) ** 2, 0) / Math.max(n - 1, 1),
    )
    const cv = avgShare > 0 ? stddev / avgShare : 0

    // 3. カバー率: 実販売店舗数 / 全店舗数
    const dominance = n > 0 ? sqlStoreCount / n : 0

    // 4. 安定度: CV の逆数を 0-1 に正規化（CV=0 → 1.0, CV≥2 → 0.0）
    const stability = Math.max(0, 1 - cv / 2)

    // 5. タイプ分類
    const productType = classifyProductType(index, cv)

    results.push({
      code,
      name,
      totalSales,
      scoreSum: avgShare * n,
      storeCount: n,
      activeStoreCount: sqlStoreCount,
      index,
      variance: cv,
      dominance,
      stability,
      avgShare,
      productType,
    })
  }

  // Sort by index × stability descending（高構成比 × 安定 が上位）
  results.sort((a, b) => b.index * b.stability - a.index * a.stability)
  return results
}

// ── カテゴリベンチマーク 日別トレンド ──

/** カテゴリベンチマーク日別トレンドフック */
export function useDuckDBCategoryBenchmarkTrend(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
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
      })
  }, [dateRange, storeIds, level])

  return useAsyncQuery(conn, dataVersion, queryFn)
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
 *
 * SQL の日別構成比データから、各日×各カテゴリの
 * avgShare / CV / stability / compositeScore を算出する。
 *
 * @param rows - 日別カテゴリ×店舗の構成比データ
 * @param topCodes - 表示するカテゴリコードのリスト（上位N件など）
 * @param totalStoreCount - 選択全店舗数（0=全店舗モード）
 */
export function buildCategoryTrendData(
  rows: readonly CategoryBenchmarkTrendRow[],
  topCodes: readonly string[],
  totalStoreCount = 0,
): readonly CategoryTrendPoint[] {
  const topSet = new Set(topCodes)

  // date × code でグループ化
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
      compositeScore: avgShare * stability * 10000, // スケール調整（%表示しやすく）
    })
  }

  results.sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.code.localeCompare(b.code))
  return results
}

export type { CategoryMixWeeklyRow, CategoryBenchmarkRow, CategoryBenchmarkTrendRow }
