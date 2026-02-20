import type { DailyRecord } from '@/domain/models'

export interface InventoryPoint {
  readonly day: number
  readonly estimated: number
  readonly actual: number | null
}

/** 1店舗分の推定在庫推移を計算 */
export function computeEstimatedInventory(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  openingInventory: number,
  closingInventory: number | null,
  markupRate: number,
  discountRate: number,
): InventoryPoint[] {
  const divisor = 1 - discountRate
  const result: InventoryPoint[] = []
  let cumInvCost = 0
  let cumEstCogs = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    if (rec) {
      cumInvCost += rec.purchase.cost + rec.interStoreIn.cost + rec.interStoreOut.cost
        + rec.interDepartmentIn.cost + rec.interDepartmentOut.cost
      const dayGrossSales = divisor > 0 ? rec.coreSales / divisor : rec.coreSales
      cumEstCogs += dayGrossSales * (1 - markupRate) + rec.consumable.cost
    }
    const actualInv = (d === daysInMonth && closingInventory != null) ? closingInventory : null
    result.push({
      day: d,
      estimated: openingInventory + cumInvCost - cumEstCogs,
      actual: actualInv,
    })
  }
  return result
}
