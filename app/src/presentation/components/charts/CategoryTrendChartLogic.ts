/**
 * CategoryTrendChart — 純粋ロジック層
 *
 * DuckDB の CategoryDailyTrendRow[] を受け取り、カテゴリ別日次推移データに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - カテゴリ別合計額ランキング
 *   - 日別×カテゴリのクロス集計
 *   - 除外コードのフィルタリング
 *   - 前年データの当年日付軸へのマッピング
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 */
import type { CategoryDailyTrendRow } from '@/application/hooks/duckdb'

// ─── Types ──────────────────────────────────────────

export interface CategoryTrendDataPoint {
  readonly date: string
  readonly [categoryKey: string]: string | number | null
}

export interface CategoryInfo {
  readonly code: string
  readonly name: string
  readonly totalAmount: number
}

export interface CategoryTrendResult {
  readonly chartData: readonly CategoryTrendDataPoint[]
  readonly categories: readonly CategoryInfo[]
}

// ─── Logic ──────────────────────────────────────────

/** CategoryDailyTrendRow[] → カテゴリ別日次チャートデータ */
export function buildCategoryTrendData(
  rows: readonly CategoryDailyTrendRow[],
  excludedCodes: ReadonlySet<string>,
): CategoryTrendResult {
  const categoryTotals = new Map<string, { name: string; total: number }>()
  for (const row of rows) {
    const existing = categoryTotals.get(row.code) ?? { name: row.name, total: 0 }
    existing.total += row.amount
    categoryTotals.set(row.code, existing)
  }

  const categories: CategoryInfo[] = [...categoryTotals.entries()]
    .map(([code, info]) => ({
      code,
      name: info.name,
      totalAmount: Math.round(info.total),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const dateMap = new Map<string, Record<string, number>>()
  for (const row of rows) {
    if (excludedCodes.has(row.code)) continue
    const dateKey = row.dateKey.slice(5)
    const existing = dateMap.get(dateKey) ?? {}
    existing[row.code] = (existing[row.code] ?? 0) + Math.round(row.amount)
    dateMap.set(dateKey, existing)
  }

  const sortedDates = [...dateMap.keys()].sort()
  const chartData: CategoryTrendDataPoint[] = sortedDates.map((date) => ({
    date,
    ...dateMap.get(date)!,
  }))

  return { chartData, categories }
}

/**
 * 前年データを当年の日付軸にマッピングする。
 *
 * 前年と当年の dateRange を日数で1:1対応させ、
 * 前年の各日を当年の対応する日に割り当てる。
 *
 * @param prevRows 前年の CategoryDailyTrendRow[]
 * @param currentDates 当年チャートの日付配列 (MM-DD 形式)
 * @param currentCategories 当年のカテゴリ（前年データをこのカテゴリに絞る）
 */
export function buildPrevYearTrendData(
  prevRows: readonly CategoryDailyTrendRow[],
  currentDates: readonly string[],
  currentCategories: readonly CategoryInfo[],
): ReadonlyMap<string, Record<string, number>> {
  if (prevRows.length === 0 || currentDates.length === 0) return new Map()

  // 前年の全日付を収集してソート
  const prevDateKeys = new Set<string>()
  for (const row of prevRows) {
    prevDateKeys.add(row.dateKey)
  }
  const sortedPrevDates = [...prevDateKeys].sort()

  // 前年日付 → 当年表示日付の1:1マッピング（日数順）
  const prevToCurrentDate = new Map<string, string>()
  for (let i = 0; i < sortedPrevDates.length && i < currentDates.length; i++) {
    prevToCurrentDate.set(sortedPrevDates[i], currentDates[i])
  }

  // 当年カテゴリのコードセット
  const categoryCodes = new Set(currentCategories.map((c) => c.code))

  // 前年データを当年日付軸にマッピング
  const result = new Map<string, Record<string, number>>()
  for (const row of prevRows) {
    if (!categoryCodes.has(row.code)) continue
    const currentDate = prevToCurrentDate.get(row.dateKey)
    if (!currentDate) continue
    const existing = result.get(currentDate) ?? {}
    existing[row.code] = (existing[row.code] ?? 0) + Math.round(row.amount)
    result.set(currentDate, existing)
  }

  return result
}
