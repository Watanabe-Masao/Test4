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
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 */
import type { CategoryDailyTrendRow } from '@/application/hooks/useDuckDBQuery'

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
