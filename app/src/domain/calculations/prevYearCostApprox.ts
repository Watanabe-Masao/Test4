/**
 * prevYearCostApprox.ts —
 * 前年の日別近似原価マップを構築する pure function。
 *
 * SP-B ADR-B-004 PR2 で `registryChartWidgets.tsx` 内 inline helper
 * `buildPrevYearCostMap` を本 module に抽出（WID-003 対応）。
 *
 * ## 計算ロジック
 *
 * 前年データは日別仕入原価フィールドを持たない。粗利推移の比較表示のため、
 * `売上 - 売変` で原価を近似する:
 *
 *   approxCost(day) = max(0, sales(day) - discount(day))
 *
 * 正確な値ではないが、粗利推移の **傾向比較** には有用。
 *
 * ## 参照
 *
 * - projects/widget-registry-simplification/plan.md §ADR-B-004
 * - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-B-004
 *
 * @responsibility R:calculation
 */

import { fromDateKey } from '@/domain/models/CalendarDate'
import type { PrevYearData } from '@/features/comparison'

/**
 * 前年データから日別近似原価マップを構築する。
 *
 * @returns prevYear が無効 / totalSales <= 0 の場合は undefined。
 *          有効な場合は day (number) → approxCost (number) の Map。
 */
/** @calc-id CALC-014 */
export function buildPrevYearCostApprox(
  prevYear: PrevYearData,
): ReadonlyMap<number, number> | undefined {
  if (!prevYear.hasPrevYear || prevYear.totalSales <= 0) return undefined
  const costMap = new Map<number, number>()
  for (const [dateKey, entry] of prevYear.daily) {
    const day = fromDateKey(dateKey).day
    costMap.set(day, entry.sales > 0 ? entry.sales - entry.discount : 0)
  }
  return costMap
}
