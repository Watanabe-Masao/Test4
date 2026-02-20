import type { DailyRecord } from '@/domain/models'
import { getDailyTotalCost } from '@/domain/models'

export interface InventoryPoint {
  readonly day: number
  readonly estimated: number
  readonly actual: number | null
}

/**
 * 1店舗分の日別推定在庫推移を計算する。
 *
 * 【推定法】在庫推定指標（§3.2.2 / §3.2.4）と同一のロジック:
 *
 *   在庫仕入原価(日) = getDailyTotalCost(rec) − deliverySales.cost
 *                    = 仕入 + 店間入 + 店間出 + 部門間入 + 部門間出
 *
 *   粗売上(日)       = コア売上 / (1 − 売変率)
 *   推定原価(日)     = 粗売上 × (1 − 値入率) + 消耗品費
 *
 *   推定在庫[d]      = 期首在庫 + Σ在庫仕入原価[1..d] − Σ推定原価[1..d]
 *
 * ※ getDailyTotalCost を唯一の原価算出元とすることで
 *   storeAssembler (totalCost → inventoryCost) との整合性を保証する。
 */
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

  let cumInventoryCost = 0 // 累計在庫仕入原価
  let cumEstCogs = 0 // 累計推定原価

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)

    if (rec) {
      // 在庫仕入原価 = 総仕入原価 − 売上納品原価
      // (storeAssembler: inventoryCost = totalCost - deliverySalesCost と同一)
      cumInventoryCost += getDailyTotalCost(rec) - rec.deliverySales.cost

      // 粗売上 = コア売上 / (1 − 売変率)
      const dayGrossSales = divisor > 0 ? rec.coreSales / divisor : rec.coreSales

      // 推定原価 = 粗売上 × (1 − 値入率) + 消耗品費
      cumEstCogs += dayGrossSales * (1 - markupRate) + rec.consumable.cost
    }

    // 推定在庫 = 期首在庫 + 累計在庫仕入原価 − 累計推定原価
    const estimated = openingInventory + cumInventoryCost - cumEstCogs
    const actual = (d === daysInMonth && closingInventory != null) ? closingInventory : null

    result.push({ day: d, estimated, actual })
  }

  return result
}
