import type { DailyRecord } from '@/domain/models'
import { getDailyTotalCost } from '@/domain/models'

export interface PinInterval {
  startDay: number
  endDay: number
  openingInventory: number
  closingInventory: number
  totalSales: number
  totalPurchaseCost: number
  cogs: number
  grossProfit: number
  grossProfitRate: number
}

/**
 * ピン止め区間ごとの在庫法粗利率を計算する
 *
 * pins: [day, closingInventory][] を日付昇順で受け取り、
 * 各区間の売上原価(COGS)と粗利率を算出する。
 */
export function calculatePinIntervals(
  daily: ReadonlyMap<number, DailyRecord>,
  openingInventory: number | null,
  pins: [number, number][],
): PinInterval[] {
  if (pins.length === 0) return []
  const intervals: PinInterval[] = []
  let prevDay = 0
  let prevInventory = openingInventory ?? 0

  for (const [day, closingInv] of pins) {
    let totalSales = 0
    let totalPurchaseCost = 0
    for (let d = prevDay + 1; d <= day; d++) {
      const rec = daily.get(d)
      if (rec) {
        totalSales += rec.sales
        totalPurchaseCost += getDailyTotalCost(rec)
      }
    }
    const cogs = prevInventory + totalPurchaseCost - closingInv
    const grossProfit = totalSales - cogs
    const grossProfitRate = totalSales > 0 ? grossProfit / totalSales : 0
    intervals.push({
      startDay: prevDay + 1, endDay: day,
      openingInventory: prevInventory, closingInventory: closingInv,
      totalSales, totalPurchaseCost, cogs, grossProfit, grossProfitRate,
    })
    prevDay = day
    prevInventory = closingInv
  }
  return intervals
}
