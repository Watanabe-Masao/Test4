/**
 * CategoryHourlyChart — 純粋ロジック層
 *
 * DuckDB の CategoryHourlyRow[] を受け取り、カテゴリ×時間帯ヒートマップデータに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - カテゴリ別×時間帯別の集計
 *   - 上位Nカテゴリの抽出
 *   - ピーク時間帯の判定
 *   - 色スケーリング用の最大値算出
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 *
 * @responsibility R:unclassified
 */
import type { CategoryHourlyRow } from '@/application/hooks/duckdb'
import { findPeak } from '@/application/query-bridge/rawAggregation'

// ─── Types ──────────────────────────────────────────

export interface CategoryHeatmapRow {
  readonly code: string
  readonly name: string
  readonly totalAmount: number
  readonly hourlyAmounts: ReadonlyMap<number, number>
  readonly peakHour: number
  readonly peakAmount: number
  readonly shareOfTotal: number
}

export interface CategoryHeatmapData {
  readonly categories: readonly CategoryHeatmapRow[]
  readonly maxAmount: number
  readonly globalPeakHour: number
}

// ─── Constants ──────────────────────────────────────

/** 上位表示カテゴリ数 */
export const TOP_CATEGORIES = 10

// ─── Logic ──────────────────────────────────────────

/** CategoryHourlyRow[] → カテゴリ×時間帯ヒートマップデータ */
export function buildCategoryHeatmapData(
  rows: readonly CategoryHourlyRow[],
  hourMin: number,
): CategoryHeatmapData {
  const catMap = new Map<
    string,
    { name: string; totalAmount: number; hourly: Map<number, number> }
  >()

  for (const row of rows) {
    const existing = catMap.get(row.code) ?? {
      name: row.name,
      totalAmount: 0,
      hourly: new Map<number, number>(),
    }
    existing.totalAmount += row.amount
    existing.hourly.set(row.hour, (existing.hourly.get(row.hour) ?? 0) + row.amount)
    catMap.set(row.code, existing)
  }

  const sorted = [...catMap.entries()]
    .map(([code, info]) => ({ code, ...info }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, TOP_CATEGORIES)

  const grandTotal = sorted.reduce((sum, cat) => sum + cat.totalAmount, 0)

  let maxAmount = 0
  const globalHourTotals = new Map<number, number>()

  for (const cat of sorted) {
    for (const [hour, amount] of cat.hourly) {
      if (amount > maxAmount) maxAmount = amount
      globalHourTotals.set(hour, (globalHourTotals.get(hour) ?? 0) + amount)
    }
  }

  const globalPeak = findPeak(globalHourTotals)
  const globalPeakHour = globalPeak?.key ?? hourMin

  const categories: CategoryHeatmapRow[] = sorted.map((cat) => {
    const catPeak = findPeak(cat.hourly)

    return {
      code: cat.code,
      name: cat.name,
      totalAmount: Math.round(cat.totalAmount),
      hourlyAmounts: cat.hourly,
      peakHour: catPeak?.key ?? hourMin,
      peakAmount: Math.round(catPeak?.value ?? 0),
      shareOfTotal: grandTotal > 0 ? cat.totalAmount / grandTotal : 0,
    }
  })

  return { categories, maxAmount, globalPeakHour }
}
