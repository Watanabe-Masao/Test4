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
  queryCategoryHierarchy,
  type CategoryMixWeeklyRow,
  type CategoryBenchmarkRow,
  type CategoryBenchmarkTrendRow,
  type CategoryHierarchyItem,
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
function classifyProductType(index: number, cv: number): ProductType {
  const highIndex = index >= 50
  const lowVariance = cv < 0.5
  if (highIndex && lowVariance) return 'flagship' // 主力: 高構成比 × 安定
  if (highIndex && !lowVariance) return 'regional' // 地域特化: 高構成比 × 偏り
  if (!highIndex && lowVariance) return 'standard' // 普通: 低構成比 × 安定
  return 'unstable' // 不安定: 低構成比 × 偏り
}

/** PI値を算出: value / customers × 1000（客数0の場合は0） */
function computePi(value: number, customers: number): number {
  return customers > 0 ? (value / customers) * 1000 : 0
}

/**
 * カテゴリスコア算出（構成比 or PI値ベース）
 *
 * @param rows - SQL 結果行（カテゴリ×店舗のデータ）
 * @param minStores - 最低取扱店舗数フィルタ（デフォルト: 1 = フィルタなし）
 * @param totalStoreCount - 選択された全店舗数。販売0の店舗も 0 として含めて計算する。
 *                          0 の場合は SQL の store_count をそのまま使う（全店舗モード）。
 * @param metric - 指標: 'share'=構成比, 'salesPi'=金額PI値, 'quantityPi'=数量PI値
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
        metricValues = cat.salesPerStore.map((s, i) => computePi(s, cat.customersPerStore[i]))
        break
      case 'quantityPi':
        metricValues = cat.quantityPerStore.map((q, i) => computePi(q, cat.customersPerStore[i]))
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

    // 1. Index: 平均値を 0-100 に正規化（データセット内最大 = 100）
    const index = maxAvgMetric > 0 ? (avgMetric / maxAvgMetric) * 100 : 0

    // 2. バラツキ: 変動係数 (CV = σ / μ)
    const stddev = Math.sqrt(
      metricValues.reduce((s, v) => s + (v - avgMetric) ** 2, 0) / Math.max(n - 1, 1),
    )
    const cv = avgMetric > 0 ? stddev / avgMetric : 0

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

// ── 箱ひげ図（Box Plot）データ ──

/** 箱ひげ図の統計量 */
export interface BoxPlotStats {
  readonly code: string
  readonly name: string
  readonly min: number
  readonly q1: number
  readonly median: number
  readonly q3: number
  readonly max: number
  readonly mean: number
  readonly count: number
}

/** 四分位数を算出 */
function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  const frac = pos - lo
  return sorted[lo] * (1 - frac) + sorted[hi] * frac
}

/**
 * カテゴリベンチマーク行から箱ひげ図データを構築する
 *
 * @param rows - SQL 結果行
 * @param metric - 'sales' = 販売金額, 'quantity' = 販売数量
 * @param topN - 上位N件のカテゴリ（Index×安定度順）
 * @param minStores - 最低取扱店舗数フィルタ
 * @param totalStoreCount - 選択された全店舗数
 */
export function buildBoxPlotData(
  rows: readonly CategoryBenchmarkRow[],
  metric: 'sales' | 'quantity',
  topN = 20,
  minStores = 1,
  totalStoreCount = 0,
): readonly BoxPlotStats[] {
  // まずスコアを計算して上位Nカテゴリを決定
  const scores = buildCategoryBenchmarkScores(rows, minStores, totalStoreCount)
  const topCodes = new Set(scores.slice(0, topN).map((s) => s.code))

  // カテゴリ別に店舗値を収集
  const catValues = new Map<string, { name: string; values: number[] }>()
  for (const row of rows) {
    if (!topCodes.has(row.code)) continue
    let entry = catValues.get(row.code)
    if (!entry) {
      entry = { name: row.name, values: [] }
      catValues.set(row.code, entry)
    }
    entry.values.push(metric === 'sales' ? row.totalSales : row.totalQuantity)
  }

  // 販売0の店舗を補完
  if (totalStoreCount > 0) {
    for (const entry of catValues.values()) {
      const missing = totalStoreCount - entry.values.length
      for (let i = 0; i < missing; i++) entry.values.push(0)
    }
  }

  // scores の順序（Index×安定度降順）で結果を生成
  const results: BoxPlotStats[] = []
  for (const s of scores) {
    if (!topCodes.has(s.code)) continue
    const entry = catValues.get(s.code)
    if (!entry || entry.values.length === 0) continue

    const sorted = [...entry.values].sort((a, b) => a - b)
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length

    results.push({
      code: s.code,
      name: entry.name,
      min: sorted[0],
      q1: quantile(sorted, 0.25),
      median: quantile(sorted, 0.5),
      q3: quantile(sorted, 0.75),
      max: sorted[sorted.length - 1],
      mean,
      count: sorted.length,
    })
  }

  return results
}

/** 店舗別の値（ドリルダウン用） */
export interface StoreBreakdownItem {
  readonly storeId: string
  readonly value: number
}

/**
 * 指定カテゴリの店舗別値を抽出する（箱ひげ図ドリルダウン用）
 *
 * @param rows - SQL 結果行
 * @param categoryCode - 対象カテゴリコード
 * @param metric - 'sales' = 販売金額, 'quantity' = 販売数量
 * @returns 値降順でソートされた店舗別データ
 */
export function buildStoreBreakdown(
  rows: readonly CategoryBenchmarkRow[],
  categoryCode: string,
  metric: 'sales' | 'quantity',
): readonly StoreBreakdownItem[] {
  const items: StoreBreakdownItem[] = []
  for (const row of rows) {
    if (row.code !== categoryCode) continue
    items.push({
      storeId: row.storeId,
      value: metric === 'sales' ? row.totalSales : row.totalQuantity,
    })
  }
  items.sort((a, b) => b.value - a.value)
  return items
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
