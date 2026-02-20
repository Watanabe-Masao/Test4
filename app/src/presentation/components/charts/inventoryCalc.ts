import type { DailyRecord } from '@/domain/models'
import { getDailyTotalCost } from '@/domain/models'

export interface InventoryPoint {
  readonly day: number
  readonly estimated: number
  readonly actual: number | null
}

/** 日別推定在庫の中間計算値を含む詳細行 */
export interface InventoryDetailRow {
  readonly day: number
  readonly sales: number // 総売上
  readonly coreSales: number // コア売上
  readonly grossSales: number // 粗売上(売変前)
  readonly inventoryCost: number // 在庫仕入原価(日)
  readonly estCogs: number // 推定原価(日)
  readonly consumableCost: number // 消耗品費(日)
  readonly cumInventoryCost: number // 累計在庫仕入原価
  readonly cumEstCogs: number // 累計推定原価
  readonly estimated: number // 推定在庫
  readonly actual: number | null // 実在庫(末日のみ)
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
  const details = computeEstimatedInventoryDetails(
    daily, daysInMonth, openingInventory, closingInventory, markupRate, discountRate,
  )
  return details.map(({ day, estimated, actual }) => ({ day, estimated, actual }))
}

/**
 * 日別推定在庫の中間計算値を含む詳細データを返す。
 * テーブル表示・検証用。
 */
export function computeEstimatedInventoryDetails(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  openingInventory: number,
  closingInventory: number | null,
  markupRate: number,
  discountRate: number,
): InventoryDetailRow[] {
  const divisor = 1 - discountRate
  const result: InventoryDetailRow[] = []

  let cumInventoryCost = 0 // 累計在庫仕入原価
  let cumEstCogs = 0 // 累計推定原価

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)

    let sales = 0
    let coreSales = 0
    let grossSales = 0
    let inventoryCost = 0
    let estCogs = 0
    let consumableCost = 0

    if (rec) {
      sales = rec.sales
      coreSales = rec.coreSales

      // 粗売上 = コア売上 / (1 − 売変率)
      grossSales = divisor > 0 ? rec.coreSales / divisor : rec.coreSales

      // 在庫仕入原価 = 総仕入原価 − 売上納品原価
      inventoryCost = getDailyTotalCost(rec) - rec.deliverySales.cost

      // 消耗品費
      consumableCost = rec.consumable.cost

      // 推定原価 = 粗売上 × (1 − 値入率) + 消耗品費
      estCogs = grossSales * (1 - markupRate) + consumableCost
    }

    cumInventoryCost += inventoryCost
    cumEstCogs += estCogs

    // 推定在庫 = 期首在庫 + 累計在庫仕入原価 − 累計推定原価
    const estimated = openingInventory + cumInventoryCost - cumEstCogs
    const actual = (d === daysInMonth && closingInventory != null) ? closingInventory : null

    result.push({
      day: d,
      sales,
      coreSales,
      grossSales,
      inventoryCost,
      estCogs,
      consumableCost,
      cumInventoryCost,
      cumEstCogs,
      estimated,
      actual,
    })
  }

  return result
}
