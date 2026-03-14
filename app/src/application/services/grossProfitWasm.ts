/**
 * grossProfit WASM wrapper
 *
 * WASM の Float64Array 戻り値を既存の型に変換する薄い adapter。
 * ロジック判断・比較・モード判断・フォールバックは一切含めない（bridge の責務）。
 *
 * 現時点では WASM 実装は存在しないため、getWasmExports() 経由で
 * 将来の WASM export を呼び出す形のスタブとする。
 * WASM モジュールに grossProfit 関数が追加されるまで、これらの関数は
 * bridge の vi.mock でモックされた状態でのみテストから呼ばれる。
 */
import type {
  InvMethodInput,
  InvMethodResult,
  EstMethodInput,
  EstMethodResult,
  DiscountImpactInput,
  DiscountImpactResult,
  MarkupRateInput,
  MarkupRateResult,
  TransferTotalsInput,
  TransferTotalsResult,
} from '@/domain/calculations/grossProfit'
import { getWasmExports } from './wasmEngine'

/* ── 将来の WASM export 型定義 ─────────────────── */

/**
 * grossProfit WASM モジュールが export する関数の型。
 * Rust 実装完了後、wasm-bindgen が生成する型に置き換える。
 */
interface GrossProfitWasmExports {
  calculate_inv_method: (...args: number[]) => Float64Array
  calculate_est_method: (...args: number[]) => Float64Array
  calculate_core_sales: (...args: number[]) => Float64Array
  calculate_discount_rate: (salesAmount: number, discountAmount: number) => number
  calculate_discount_impact: (...args: number[]) => number
  calculate_markup_rates: (...args: number[]) => Float64Array
  calculate_transfer_totals: (...args: number[]) => Float64Array
  calculate_inventory_cost: (totalCost: number, deliverySalesCost: number) => number
}

function getGrossProfitWasm(): GrossProfitWasmExports {
  return getWasmExports()! as unknown as GrossProfitWasmExports
}

/* ── WASM 呼び出し wrapper ────────────────────── */

export function calculateInvMethodWasm(input: InvMethodInput): InvMethodResult {
  const wasm = getGrossProfitWasm()
  const arr = wasm.calculate_inv_method(
    input.openingInventory ?? NaN,
    input.closingInventory ?? NaN,
    input.totalPurchaseCost,
    input.totalSales,
  )
  // arr[0] = null sentinel (1.0 = null)
  if (arr[0] === 1.0) {
    return { cogs: null, grossProfit: null, grossProfitRate: null }
  }
  return {
    cogs: arr[1],
    grossProfit: arr[2],
    grossProfitRate: arr[3],
  }
}

export function calculateEstMethodWasm(input: EstMethodInput): EstMethodResult {
  const wasm = getGrossProfitWasm()
  const arr = wasm.calculate_est_method(
    input.coreSales,
    input.discountRate,
    input.markupRate,
    input.costInclusionCost,
    input.openingInventory ?? NaN,
    input.inventoryPurchaseCost,
  )
  // arr[0] = closingInventory null sentinel (1.0 = null)
  return {
    grossSales: arr[1],
    cogs: arr[2],
    margin: arr[3],
    marginRate: arr[4],
    closingInventory: arr[0] === 1.0 ? null : arr[5],
  }
}

export function calculateCoreSalesWasm(
  totalSales: number,
  flowerSalesPrice: number,
  directProduceSalesPrice: number,
): { coreSales: number; isOverDelivery: boolean; overDeliveryAmount: number } {
  const wasm = getGrossProfitWasm()
  const arr = wasm.calculate_core_sales(totalSales, flowerSalesPrice, directProduceSalesPrice)
  return {
    coreSales: arr[0],
    isOverDelivery: arr[1] === 1.0,
    overDeliveryAmount: arr[2],
  }
}

export function calculateDiscountRateWasm(
  salesAmount: number,
  discountAmount: number,
): number {
  const wasm = getGrossProfitWasm()
  return wasm.calculate_discount_rate(salesAmount, discountAmount)
}

export function calculateDiscountImpactWasm(
  input: DiscountImpactInput,
): DiscountImpactResult {
  const wasm = getGrossProfitWasm()
  const value = wasm.calculate_discount_impact(
    input.coreSales,
    input.markupRate,
    input.discountRate,
  )
  return { discountLossCost: value }
}

export function calculateMarkupRatesWasm(input: MarkupRateInput): MarkupRateResult {
  const wasm = getGrossProfitWasm()
  const arr = wasm.calculate_markup_rates(
    input.purchasePrice,
    input.purchaseCost,
    input.deliveryPrice,
    input.deliveryCost,
    input.transferPrice,
    input.transferCost,
    input.defaultMarkupRate,
  )
  return {
    averageMarkupRate: arr[0],
    coreMarkupRate: arr[1],
  }
}

export function calculateTransferTotalsWasm(
  input: TransferTotalsInput,
): TransferTotalsResult {
  const wasm = getGrossProfitWasm()
  const arr = wasm.calculate_transfer_totals(
    input.interStoreInPrice,
    input.interStoreInCost,
    input.interStoreOutPrice,
    input.interStoreOutCost,
    input.interDepartmentInPrice,
    input.interDepartmentInCost,
    input.interDepartmentOutPrice,
    input.interDepartmentOutCost,
  )
  return {
    transferPrice: arr[0],
    transferCost: arr[1],
  }
}

export function calculateInventoryCostWasm(
  totalCost: number,
  deliverySalesCost: number,
): number {
  const wasm = getGrossProfitWasm()
  return wasm.calculate_inventory_cost(totalCost, deliverySalesCost)
}
