import type { CostPricePair } from './CostPricePair'
import type { ConsumableDailyRecord } from './ConsumableItem'

/** 日別レコード */
export interface DailyRecord {
  readonly day: number // 1-31
  readonly sales: number // 売上高（総売上）
  readonly coreSales: number // コア売上（花・産直・売上納品除外）
  readonly grossSales: number // 粗売上（売変前売価）
  readonly purchase: CostPricePair // 仕入（原価/売価）
  readonly deliverySales: CostPricePair // 売上納品（原価/売価）
  readonly interStoreIn: CostPricePair // 店間入
  readonly interStoreOut: CostPricePair // 店間出
  readonly interDepartmentIn: CostPricePair // 部門間入
  readonly interDepartmentOut: CostPricePair // 部門間出
  readonly flowers: CostPricePair // 花
  readonly directProduce: CostPricePair // 産直
  readonly consumable: ConsumableDailyRecord // 消耗品
  readonly discountAmount: number // 売変額
  readonly discountAbsolute: number // 売変絶対値
  readonly supplierBreakdown: ReadonlyMap<string, CostPricePair>
}

/**
 * 日別レコードの総仕入原価を算出する
 * = 仕入原価 + 店間入 + 店間出 + 部門間入 + 部門間出 + 売上納品原価
 *
 * CalculationOrchestrator の在庫法計算 (totalCost = inventoryCost + deliverySalesCost) と同一。
 * この関数を唯一の計算元とすることで、コスト計算の不整合を防ぐ。
 */
export function getDailyTotalCost(rec: DailyRecord): number {
  return (
    rec.purchase.cost +
    rec.interStoreIn.cost +
    rec.interStoreOut.cost +
    rec.interDepartmentIn.cost +
    rec.interDepartmentOut.cost +
    rec.deliverySales.cost
  )
}
