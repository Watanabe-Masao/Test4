/**
 * inventoryCalc WASM wrapper (candidate)
 *
 * 6 列 flat contract → WASM FFI → InventoryDetailRow[] 型変換。
 *
 * @contractId BIZ-009
 * @semanticClass business
 * @authorityKind candidate-authoritative
 */
import type { DailyRecord } from '@/domain/models/record'
import { getDailyTotalCost } from '@/domain/models/record'
import type { InventoryDetailRow } from '@/domain/calculations/inventoryCalc'
import { getInventoryCalcWasmExports } from './wasmEngine'

const FIELDS_PER_ROW = 11

/* ── Adapter: ReadonlyMap → 6 flat arrays ─────── */

export function normalizeInventoryCalcInput(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
): {
  dailySales: Float64Array
  dailyFlowersPrice: Float64Array
  dailyDirectProducePrice: Float64Array
  dailyCostInclusionCost: Float64Array
  dailyTotalCost: Float64Array
  dailyDeliverySalesCost: Float64Array
} {
  const dailySales = new Float64Array(daysInMonth)
  const dailyFlowersPrice = new Float64Array(daysInMonth)
  const dailyDirectProducePrice = new Float64Array(daysInMonth)
  const dailyCostInclusionCost = new Float64Array(daysInMonth)
  const dailyTotalCost = new Float64Array(daysInMonth)
  const dailyDeliverySalesCost = new Float64Array(daysInMonth)

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    if (rec) {
      dailySales[d - 1] = rec.sales
      dailyFlowersPrice[d - 1] = rec.flowers.price
      dailyDirectProducePrice[d - 1] = rec.directProduce.price
      dailyCostInclusionCost[d - 1] = rec.costInclusion.cost
      dailyTotalCost[d - 1] = getDailyTotalCost(rec)
      dailyDeliverySalesCost[d - 1] = rec.deliverySales.cost
    }
  }

  return {
    dailySales,
    dailyFlowersPrice,
    dailyDirectProducePrice,
    dailyCostInclusionCost,
    dailyTotalCost,
    dailyDeliverySalesCost,
  }
}

/* ── WASM 呼び出し ────────────────────────────── */

function getWasm() {
  return getInventoryCalcWasmExports()!
}

export function computeEstimatedInventoryDetailsWasm(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  openingInventory: number,
  closingInventory: number | null,
  markupRate: number,
  discountRate: number,
): InventoryDetailRow[] {
  const wasm = getWasm()
  const flat = normalizeInventoryCalcInput(daily, daysInMonth)

  const arr = wasm.compute_estimated_inventory_details(
    flat.dailySales,
    flat.dailyFlowersPrice,
    flat.dailyDirectProducePrice,
    flat.dailyCostInclusionCost,
    flat.dailyTotalCost,
    flat.dailyDeliverySalesCost,
    openingInventory,
    closingInventory ?? NaN, // contract null → FFI NaN
    markupRate,
    discountRate,
    daysInMonth,
  )

  const rows: InventoryDetailRow[] = []
  for (let i = 0; i < arr.length; i += FIELDS_PER_ROW) {
    rows.push({
      day: arr[i],
      sales: arr[i + 1],
      coreSales: arr[i + 2],
      grossSales: arr[i + 3],
      inventoryCost: arr[i + 4],
      estCogs: arr[i + 5],
      costInclusionCost: arr[i + 6],
      cumInventoryCost: arr[i + 7],
      cumEstCogs: arr[i + 8],
      estimated: arr[i + 9],
      actual: Number.isNaN(arr[i + 10]) ? null : arr[i + 10],
    })
  }
  return rows
}
