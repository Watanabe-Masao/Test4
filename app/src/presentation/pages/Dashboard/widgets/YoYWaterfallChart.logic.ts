/**
 * YoYWaterfallChart — 期間集計ロジック
 *
 * useMemo の純粋計算部分を抽出（C1: 1ファイル = 1変更理由）。
 *
 * unify-period-analysis Phase 2: 比較先 DateRange 計算は
 * `domain/models/comparisonRangeResolver.ts` に集約された。本ファイルからは
 * `calculatePrevCtsDateRange` を削除し、builders 側で resolver を直接呼ぶ。
 *
 * Phase 6.5-5b: 未使用だった `_periodCTS` / `_periodPrevCTS` dummy 引数を
 * 削除し、CTS raw 型 import を廃止 (売上の正本は daily /
 * prevDaily であり CTS は使用していなかった)。
 *
 * @responsibility R:unclassified
 */
import type { DailyRecord } from '@/domain/models/record'
import type { ComparisonMode } from './types'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'

/**
 * daily（StoreResult 由来）から当期の売上・客数合計を算出する。
 *
 * 売上の正本は daily レコード（classified_sales ベース）。
 * CTS はカテゴリ別内訳専用であり、売上合計には使用しない。
 */
export function aggregatePeriodCurSales(
  daily: ReadonlyMap<number, DailyRecord>,
  dayStart: number,
  dayEnd: number,
): { sales: number; customers: number } {
  let sales = 0
  let customers = 0
  for (const [day, rec] of daily) {
    if (day >= dayStart && day <= dayEnd) {
      sales += rec.sales ?? 0
      customers += rec.customers ?? 0
    }
  }
  return { sales, customers }
}

/**
 * daily/prevDaily から比較期の売上・客数合計を算出する。
 *
 * 売上の正本は daily/prevDaily レコード。
 * CTS はカテゴリ別内訳専用であり、売上合計には使用しない。
 */
export function aggregatePeriodPrevSales(
  activeCompMode: ComparisonMode,
  daily: ReadonlyMap<number, DailyRecord>,
  prevDaily: ReadonlyMap<string, { sales: number; discount: number; customers: number }>,
  dayStart: number,
  dayEnd: number,
  wowPrevStart: number,
  wowPrevEnd: number,
  year: number,
  month: number,
): { sales: number; customers: number } {
  let sales = 0
  let customers = 0
  if (activeCompMode === 'wow') {
    for (const [day, rec] of daily) {
      if (day >= wowPrevStart && day <= wowPrevEnd) {
        sales += rec.sales ?? 0
        customers += rec.customers ?? 0
      }
    }
  } else {
    for (let d = dayStart; d <= dayEnd; d++) {
      const entry = prevDaily.get(toDateKeyFromParts(year, month, d))
      if (entry) {
        sales += entry.sales
        customers += entry.customers
      }
    }
  }
  return { sales, customers }
}

/**
 * PI値・点単価サマリを算出する。
 */
export function calculatePISummary(
  activeLevel: number,
  hasQuantity: boolean,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
  prevSales: number,
  curSales: number,
  calculateItemsPerCustomer: (qty: number, cust: number) => number,
  calculateAveragePricePerItem: (sales: number, qty: number) => number,
): { prevPI: number; curPI: number; prevPPI: number; curPPI: number } | null {
  if (activeLevel < 3 || !hasQuantity || prevCust <= 0 || curCust <= 0) return null
  return {
    prevPI: calculateItemsPerCustomer(prevTotalQty, prevCust),
    curPI: calculateItemsPerCustomer(curTotalQty, curCust),
    prevPPI: calculateAveragePricePerItem(prevSales, prevTotalQty),
    curPPI: calculateAveragePricePerItem(curSales, curTotalQty),
  }
}
