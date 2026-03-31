/**
 * gross-profit-wasm 型付きモック
 *
 * Rust WASM モジュールの API サーフェスを模倣する。
 * 8 関数すべてを TS ドメイン関数へのパススルーで実装。
 */
import {
  calculateInvMethod as calculateInvMethodTS,
  calculateEstMethod as calculateEstMethodTS,
  calculateCoreSales as calculateCoreSalesTS,
  calculateDiscountRate as calculateDiscountRateTS,
  calculateDiscountImpactWithStatus as calculateDiscountImpactWithStatusTS,
  calculateMarkupRates as calculateMarkupRatesTS,
  calculateTransferTotals as calculateTransferTotalsTS,
  calculateInventoryCost as calculateInventoryCostTS,
} from '@/domain/calculations/grossProfit'

export default function init(): Promise<void> {
  return Promise.resolve()
}

/** [isNull(1.0/0.0), cogs, grossProfit, grossProfitRate] */
export function calculate_inv_method(
  openingInventory: number,
  closingInventory: number,
  totalPurchaseCost: number,
  totalSales: number,
): Float64Array {
  const r = calculateInvMethodTS({
    openingInventory: Number.isNaN(openingInventory) ? null : openingInventory,
    closingInventory: Number.isNaN(closingInventory) ? null : closingInventory,
    totalPurchaseCost,
    totalSales,
  })
  if (r.cogs === null) {
    return Float64Array.from([1.0, 0.0, 0.0, 0.0])
  }
  return Float64Array.from([0.0, r.cogs, r.grossProfit!, r.grossProfitRate!])
}

/** [ciIsNull(1.0/0.0), grossSales, cogs, margin, marginRate, closingInventory] */
export function calculate_est_method(
  coreSales: number,
  discountRate: number,
  markupRate: number,
  costInclusionCost: number,
  openingInventory: number,
  inventoryPurchaseCost: number,
): Float64Array {
  const r = calculateEstMethodTS({
    coreSales,
    discountRate,
    markupRate,
    costInclusionCost,
    openingInventory: Number.isNaN(openingInventory) ? null : openingInventory,
    inventoryPurchaseCost,
  })
  return Float64Array.from([
    r.closingInventory === null ? 1.0 : 0.0,
    r.grossSales,
    r.cogs,
    r.margin,
    r.marginRate,
    r.closingInventory ?? 0.0,
  ])
}

/** [coreSales, isOverDelivery(1.0/0.0), overDeliveryAmount] */
export function calculate_core_sales(
  totalSales: number,
  flowerSalesPrice: number,
  directProduceSalesPrice: number,
): Float64Array {
  const r = calculateCoreSalesTS(totalSales, flowerSalesPrice, directProduceSalesPrice)
  return Float64Array.from([r.coreSales, r.isOverDelivery ? 1.0 : 0.0, r.overDeliveryAmount])
}

/** scalar: discountRate */
export function calculate_discount_rate(salesAmount: number, discountAmount: number): number {
  return calculateDiscountRateTS(salesAmount, discountAmount)
}

/** scalar: discountLossCost */
export function calculate_discount_impact(
  coreSales: number,
  markupRate: number,
  discountRate: number,
): number {
  const r = calculateDiscountImpactWithStatusTS({ coreSales, markupRate, discountRate }).value ?? {
    discountLossCost: 0,
  }
  return r.discountLossCost
}

/** [averageMarkupRate, coreMarkupRate] */
export function calculate_markup_rates(
  purchasePrice: number,
  purchaseCost: number,
  deliveryPrice: number,
  deliveryCost: number,
  transferPrice: number,
  transferCost: number,
  defaultMarkupRate: number,
): Float64Array {
  const r = calculateMarkupRatesTS({
    purchasePrice,
    purchaseCost,
    deliveryPrice,
    deliveryCost,
    transferPrice,
    transferCost,
    defaultMarkupRate,
  })
  return Float64Array.from([r.averageMarkupRate, r.coreMarkupRate])
}

/** [transferPrice, transferCost] */
export function calculate_transfer_totals(
  interStoreInPrice: number,
  interStoreInCost: number,
  interStoreOutPrice: number,
  interStoreOutCost: number,
  interDepartmentInPrice: number,
  interDepartmentInCost: number,
  interDepartmentOutPrice: number,
  interDepartmentOutCost: number,
): Float64Array {
  const r = calculateTransferTotalsTS({
    interStoreInPrice,
    interStoreInCost,
    interStoreOutPrice,
    interStoreOutCost,
    interDepartmentInPrice,
    interDepartmentInCost,
    interDepartmentOutPrice,
    interDepartmentOutCost,
  })
  return Float64Array.from([r.transferPrice, r.transferCost])
}

/** scalar: inventoryCost */
export function calculate_inventory_cost(totalCost: number, deliverySalesCost: number): number {
  return calculateInventoryCostTS(totalCost, deliverySalesCost)
}
