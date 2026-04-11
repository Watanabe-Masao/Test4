/**
 * inventory-calc-wasm 型付きモック（candidate: BIZ-009）
 */
import { computeEstimatedInventoryDetails } from '@/domain/calculations/inventoryCalc'
import type { DailyRecord } from '@/domain/models/record'

export default function init(): Promise<void> {
  return Promise.resolve()
}

export function compute_estimated_inventory_details(
  dailySales: Float64Array,
  dailyFlowersPrice: Float64Array,
  dailyDirectProducePrice: Float64Array,
  dailyCostInclusionCost: Float64Array,
  dailyTotalCost: Float64Array,
  dailyDeliverySalesCost: Float64Array,
  openingInventory: number,
  closingInventory: number,
  markupRate: number,
  discountRate: number,
  daysInMonth: number,
): Float64Array {
  const daily = new Map<number, DailyRecord>()
  for (let i = 0; i < daysInMonth; i++) {
    const totalCostVal = dailyTotalCost[i] || 0
    const deliveryCostVal = dailyDeliverySalesCost[i] || 0
    daily.set(i + 1, {
      day: i + 1,
      sales: dailySales[i] || 0,
      purchase: { cost: totalCostVal - deliveryCostVal, price: 0 },
      interStoreIn: { cost: 0, price: 0 },
      interStoreOut: { cost: 0, price: 0 },
      interDepartmentIn: { cost: 0, price: 0 },
      interDepartmentOut: { cost: 0, price: 0 },
      flowers: { cost: 0, price: dailyFlowersPrice[i] || 0 },
      directProduce: { cost: 0, price: dailyDirectProducePrice[i] || 0 },
      costInclusion: { cost: dailyCostInclusionCost[i] || 0 },
      discountAmount: 0,
      discountEntries: [],
      supplierBreakdown: new Map(),
      coreSales: dailySales[i] || 0,
      grossSales: dailySales[i] || 0,
      totalCost: totalCostVal,
      deliverySales: { cost: deliveryCostVal, price: 0 },
      discountAbsolute: 0,
    } as unknown as DailyRecord)
  }

  const closing = Number.isNaN(closingInventory) ? null : closingInventory
  const results = computeEstimatedInventoryDetails(
    daily,
    daysInMonth,
    openingInventory,
    closing,
    markupRate,
    discountRate,
  )

  const arr = new Float64Array(results.length * 11)
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const off = i * 11
    arr[off] = r.day
    arr[off + 1] = r.sales
    arr[off + 2] = r.coreSales
    arr[off + 3] = r.grossSales
    arr[off + 4] = r.inventoryCost
    arr[off + 5] = r.estCogs
    arr[off + 6] = r.costInclusionCost
    arr[off + 7] = r.cumInventoryCost
    arr[off + 8] = r.cumEstCogs
    arr[off + 9] = r.estimated
    arr[off + 10] = r.actual ?? NaN
  }
  return arr
}
