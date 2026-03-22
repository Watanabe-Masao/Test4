/**
 * CategoryMixChart — 純粋ロジック層
 *
 * DuckDB の CategoryMixWeeklyRow[] を受け取り、カテゴリ構成比推移データに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - カテゴリ別平均構成比の算出・ランキング
 *   - 週次チャートデータ構築
 *   - 最新週の構成比シフト（上昇/下落）判定
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 */
import type { CategoryMixWeeklyRow } from '@/application/hooks/useDuckDBQuery'

// ─── Types ──────────────────────────────────────────

export interface MixChartDataPoint {
  readonly week: string
  readonly [categoryCode: string]: string | number
}

export interface CategoryMeta {
  readonly code: string
  readonly name: string
  readonly avgShare: number
  readonly latestShift: number | null
}

export interface MixChartData {
  readonly chartData: readonly MixChartDataPoint[]
  readonly categories: readonly CategoryMeta[]
  readonly topGainer: CategoryMeta | null
  readonly topLoser: CategoryMeta | null
}

// ─── Logic ──────────────────────────────────────────

/** CategoryMixWeeklyRow[] → カテゴリ構成比推移データ */
export function buildMixChartData(rows: readonly CategoryMixWeeklyRow[]): MixChartData {
  const categoryShareTotals = new Map<string, { name: string; shareSum: number; count: number }>()

  for (const row of rows) {
    const existing = categoryShareTotals.get(row.code) ?? {
      name: row.name,
      shareSum: 0,
      count: 0,
    }
    existing.shareSum += row.sharePct
    existing.count += 1
    categoryShareTotals.set(row.code, existing)
  }

  const sortedCats = [...categoryShareTotals.entries()]
    .map(([code, info]) => ({
      code,
      name: info.name,
      avgShare: info.count > 0 ? info.shareSum / info.count : 0,
    }))
    .sort((a, b) => b.avgShare - a.avgShare)

  const weekMap = new Map<string, Record<string, number>>()
  const weekOrder: string[] = []

  for (const row of rows) {
    const weekLabel = row.weekStart.slice(5)
    if (!weekMap.has(weekLabel)) {
      weekMap.set(weekLabel, {})
      weekOrder.push(weekLabel)
    }
    const weekData = weekMap.get(weekLabel)!
    weekData[row.code] = row.sharePct
  }

  const chartData: MixChartDataPoint[] = weekOrder.map((week) => {
    const data = weekMap.get(week)!
    const point: Record<string, string | number> = { week }
    for (const cat of sortedCats) {
      point[cat.code] = data[cat.code] ?? 0
    }
    return point as MixChartDataPoint
  })

  const latestShiftMap = new Map<string, number | null>()
  for (const row of rows) {
    const weekLabel = row.weekStart.slice(5)
    if (weekLabel === weekOrder[weekOrder.length - 1]) {
      latestShiftMap.set(row.code, row.shareShift)
    }
  }

  const categories: CategoryMeta[] = sortedCats.map((cat) => ({
    code: cat.code,
    name: cat.name,
    avgShare: cat.avgShare,
    latestShift: latestShiftMap.get(cat.code) ?? null,
  }))

  const withShifts = categories.filter((c) => c.latestShift != null)
  const topGainer = withShifts.reduce<CategoryMeta | null>(
    (best, c) => (!best || (c.latestShift ?? 0) > (best.latestShift ?? 0) ? c : best),
    null,
  )
  const topLoser = withShifts.reduce<CategoryMeta | null>(
    (best, c) => (!best || (c.latestShift ?? 0) < (best.latestShift ?? 0) ? c : best),
    null,
  )

  return { chartData, categories, topGainer, topLoser }
}
