/**
 * 箱ひげ図（Box Plot）データ構築ロジック（純粋関数）
 *
 * useAdvancedQueries から抽出した純粋関数群。
 * カテゴリベンチマークデータから箱ひげ図統計量と店舗/日別ブレイクダウンを構築する。
 */
import type {
  CategoryBenchmarkRow,
  CategoryBenchmarkTrendRow,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'
import { buildCategoryBenchmarkScores } from './categoryBenchmarkLogic'

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
export function quantile(sorted: readonly number[], q: number): number {
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
 */
export function buildBoxPlotData(
  rows: readonly CategoryBenchmarkRow[],
  metric: 'sales' | 'quantity',
  topN = 20,
  minStores = 1,
  totalStoreCount = 0,
): readonly BoxPlotStats[] {
  const scores = buildCategoryBenchmarkScores(rows, minStores, totalStoreCount)
  const topCodes = new Set(scores.slice(0, topN).map((s) => s.code))

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

  if (totalStoreCount > 0) {
    for (const entry of catValues.values()) {
      const missing = totalStoreCount - entry.values.length
      for (let i = 0; i < missing; i++) entry.values.push(0)
    }
  }

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

/**
 * 日別の箱ひげ図データを構築する（期間内の日別変動を分析）
 */
export function buildBoxPlotDataByDate(
  trendRows: readonly CategoryBenchmarkTrendRow[],
  benchmarkRows: readonly CategoryBenchmarkRow[],
  _metric: 'sales' | 'quantity',
  topN = 20,
  minStores = 1,
  totalStoreCount = 0,
): readonly BoxPlotStats[] {
  const scores = buildCategoryBenchmarkScores(benchmarkRows, minStores, totalStoreCount)
  const topCodes = new Set(scores.slice(0, topN).map((s) => s.code))

  const catDateValues = new Map<string, { name: string; dailyValues: Map<string, number> }>()

  for (const row of trendRows) {
    if (!topCodes.has(row.code)) continue
    let entry = catDateValues.get(row.code)
    if (!entry) {
      entry = { name: row.name, dailyValues: new Map() }
      catDateValues.set(row.code, entry)
    }
    const val = row.totalSales
    const prev = entry.dailyValues.get(row.dateKey) ?? 0
    entry.dailyValues.set(row.dateKey, prev + val)
  }

  const results: BoxPlotStats[] = []
  for (const s of scores) {
    if (!topCodes.has(s.code)) continue
    const entry = catDateValues.get(s.code)
    if (!entry || entry.dailyValues.size === 0) continue

    const values = Array.from(entry.dailyValues.values())
    const sorted = [...values].sort((a, b) => a - b)
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

/** 日別の値（ドリルダウン用） */
export interface DateBreakdownItem {
  readonly dateKey: string
  readonly value: number
}

/**
 * 指定カテゴリの日別合計値を抽出する（箱ひげ図ドリルダウン用）
 */
export function buildDateBreakdown(
  trendRows: readonly CategoryBenchmarkTrendRow[],
  categoryCode: string,
): readonly DateBreakdownItem[] {
  const dateMap = new Map<string, number>()
  for (const row of trendRows) {
    if (row.code !== categoryCode) continue
    const prev = dateMap.get(row.dateKey) ?? 0
    dateMap.set(row.dateKey, prev + row.totalSales)
  }
  const items: DateBreakdownItem[] = []
  for (const [dateKey, value] of dateMap) {
    items.push({ dateKey, value })
  }
  items.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  return items
}
