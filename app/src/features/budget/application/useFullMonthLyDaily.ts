/**
 * useFullMonthLyDaily — 前年 full-month 日別売上を `prevYearMonthlyKpi` から射影
 *
 * `PrevYearBudgetDetailPanel` と同じデータ源:
 *   `prevYearMonthlyKpi.{sameDate|sameDow}.dailyMapping` (`DayMappingRow[]`)
 * は elapsedDays / スライダー cap の影響を受けず、前年の full-month 分を
 * 常に保持する。`currentDay → prevSales` の対応が入っているため、
 * 当年 day をキーに前年日別売上を直接取得できる。
 *
 * header コンテキスト (同日 / 同曜日) は `comparisonScope.alignmentMode` から
 * 取得する。null の場合は `sameDate` を既定とする。
 *
 * @responsibility R:transform
 */
import { useMemo } from 'react'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { PrevYearMonthlyKpi } from '@/application/comparison/comparisonTypes'

export interface UseFullMonthLyDailyResult {
  readonly daily: ReadonlyMap<number, number> | null
  readonly monthlyTotal: number | null
}

/**
 * 前年 full-month 日別売上 + 月合計を取得する。
 *
 * - 当期の取り込み期間 / elapsedDays に影響されない
 * - alignmentMode に応じて sameDate / sameDow の dailyMapping を採用
 * - monthlyTotal は `monthlyTotal.sales` (alignment 非経由の前年全日合計) を返す
 */
export function useFullMonthLyDaily(
  prevYearMonthlyKpi: PrevYearMonthlyKpi | undefined,
  comparisonScope: ComparisonScope | null | undefined,
): UseFullMonthLyDailyResult {
  return useMemo<UseFullMonthLyDailyResult>(() => {
    if (!prevYearMonthlyKpi || !prevYearMonthlyKpi.hasPrevYear) {
      return { daily: null, monthlyTotal: null }
    }
    const mode = comparisonScope?.alignmentMode ?? 'sameDate'
    const entry =
      mode === 'sameDayOfWeek' ? prevYearMonthlyKpi.sameDow : prevYearMonthlyKpi.sameDate
    const map = new Map<number, number>()
    for (const row of entry.dailyMapping) {
      // 同じ currentDay に複数 row はない前提だが、防御的に加算。
      map.set(row.currentDay, (map.get(row.currentDay) ?? 0) + row.prevSales)
    }
    // 月間 前年合計 — 取り込み期間キャップなし。
    // sameDate: monthlyTotal.sales (alignment 非経由の全日合計)
    // sameDow : sameDow.sales (同曜日 alignment 経由、fullMonthPeriod1 で月全体)
    // ConditionSummary の selectMonthlyPrevYearSales と同一セマンティクス
    // (features 間の直接 import は禁止のため各側でローカル実装)
    const rawMonthly =
      mode === 'sameDayOfWeek'
        ? prevYearMonthlyKpi.sameDow.sales
        : prevYearMonthlyKpi.monthlyTotal.sales
    const monthlyTotal = rawMonthly > 0 ? rawMonthly : null
    return { daily: map.size > 0 ? map : null, monthlyTotal }
  }, [prevYearMonthlyKpi, comparisonScope])
}
