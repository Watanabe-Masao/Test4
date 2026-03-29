/**
 * YoYWaterfallChart — 期間集計ロジック
 *
 * useMemo の純粋計算部分を抽出（C1: 1ファイル = 1変更理由）。
 */
import type { DateRange } from '@/domain/models/calendar'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import type { DailyRecord } from '@/domain/models/record'
import type { ComparisonMode } from './types'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'

/**
 * 比較期間の CTS 日付範囲を算出する。
 *
 * - 前年比: year-1 + dowOffset で前年同曜日の日付を算出
 * - 前週比: dayStart-7 〜 dayEnd-7
 */
export function calculatePrevCtsDateRange(
  activeCompMode: ComparisonMode,
  canWoW: boolean,
  year: number,
  month: number,
  dayStart: number,
  dayEnd: number,
  dowOffset: number,
  wowPrevStart: number,
  wowPrevEnd: number,
): DateRange | undefined {
  if (activeCompMode === 'wow') {
    if (!canWoW) return undefined
    return {
      from: { year, month, day: wowPrevStart },
      to: { year, month, day: wowPrevEnd },
    }
  }
  const fromDate = new Date(year - 1, month - 1, dayStart + dowOffset)
  const toDate = new Date(year - 1, month - 1, dayEnd + dowOffset)
  return {
    from: {
      year: fromDate.getFullYear(),
      month: fromDate.getMonth() + 1,
      day: fromDate.getDate(),
    },
    to: {
      year: toDate.getFullYear(),
      month: toDate.getMonth() + 1,
      day: toDate.getDate(),
    },
  }
}

/**
 * daily（StoreResult 由来）から当期の売上・客数合計を算出する。
 *
 * 売上の正本は daily レコード（classified_sales ベース）。
 * CTS はカテゴリ別内訳専用であり、売上合計には使用しない。
 */
export function aggregatePeriodCurSales(
  _periodCTS: readonly CategoryTimeSalesRecord[],
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
  _periodPrevCTS: readonly CategoryTimeSalesRecord[],
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
