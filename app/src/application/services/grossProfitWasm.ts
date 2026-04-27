/**
 * grossProfit WASM wrapper
 *
 * WASM の Float64Array 戻り値を既存の型に変換する薄い adapter。
 * ロジック判断・比較・モード判断・フォールバックは一切含めない（bridge の責務）。
 *
 * Rust 実装 (wasm/gross-profit/) の wasm-bindgen export を呼び出す。
 *
 * @responsibility R:unclassified
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
import { getGrossProfitWasmExports } from './wasmEngine'

/* ── WASM export 取得 ──────────────────────────── */

function getGrossProfitWasm() {
  return getGrossProfitWasmExports()!
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

export function calculateDiscountRateWasm(salesAmount: number, discountAmount: number): number {
  const wasm = getGrossProfitWasm()
  return wasm.calculate_discount_rate(salesAmount, discountAmount)
}

export function calculateDiscountImpactWasm(input: DiscountImpactInput): DiscountImpactResult {
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

export function calculateTransferTotalsWasm(input: TransferTotalsInput): TransferTotalsResult {
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

export function calculateInventoryCostWasm(totalCost: number, deliverySalesCost: number): number {
  const wasm = getGrossProfitWasm()
  return wasm.calculate_inventory_cost(totalCost, deliverySalesCost)
}
