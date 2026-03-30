import { z } from 'zod'
import type { DailyRecord } from '@/domain/models/record'
import { getDailyTotalCost } from '@/domain/models/record'
import { safeDivide } from './utils'

export interface PinInterval {
  readonly startDay: number
  readonly endDay: number
  readonly openingInventory: number
  readonly closingInventory: number
  readonly totalSales: number
  readonly totalPurchaseCost: number
  readonly cogs: number
  readonly grossProfit: number
  readonly grossProfitRate: number
}

export const PinIntervalSchema = z.object({
  startDay: z.number(),
  endDay: z.number(),
  openingInventory: z.number(),
  closingInventory: z.number(),
  totalSales: z.number(),
  totalPurchaseCost: z.number(),
  cogs: z.number(),
  grossProfit: z.number(),
  grossProfitRate: z.number(),
})

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
    const grossProfitRate = safeDivide(grossProfit, totalSales, 0)
    intervals.push({
      startDay: prevDay + 1,
      endDay: day,
      openingInventory: prevInventory,
      closingInventory: closingInv,
      totalSales,
      totalPurchaseCost,
      cogs,
      grossProfit,
      grossProfitRate,
    })
    prevDay = day
    prevInventory = closingInv
  }
  return intervals
}
