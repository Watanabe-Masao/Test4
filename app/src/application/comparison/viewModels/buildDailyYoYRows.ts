/**
 * 日別 YoY 比較行ビルダー
 *
 * StoreResult の日別売上 + 前年日別 comparison points から
 * DailyYoYRow[] を構築する。
 *
 * conditionPanelYoY.vm.ts / SalesAnalysis 等で共通利用。
 */
import type { DailyYoYRow, ComparisonPoint } from './ComparisonViewTypes'

/**
 * 比較ポイント + 当年日別データから日別 YoY 行を構築する。
 *
 * @param currentDailyMap 当年の日別売上/客数マップ（day → { sales, customers }）
 * @param comparisonPoints 前年比較ポイント配列（sorted by currentDay）
 */
export function buildDailyYoYRows(
  currentDailyMap: ReadonlyMap<number, { sales: number; customers: number }>,
  comparisonPoints: readonly ComparisonPoint[],
): readonly DailyYoYRow[] {
  const allDays = new Set<number>()
  for (const [day] of currentDailyMap) allDays.add(day)
  for (const pt of comparisonPoints) allDays.add(pt.currentDay)

  return [...allDays]
    .sort((a, b) => a - b)
    .map((day) => {
      const current = currentDailyMap.get(day)
      const prev = comparisonPoints.find((p) => p.currentDay === day)
      return {
        day,
        currentSales: current?.sales ?? 0,
        prevSales: prev?.sales ?? 0,
        currentCustomers: current?.customers ?? 0,
        prevCustomers: prev?.customers ?? 0,
      }
    })
}
