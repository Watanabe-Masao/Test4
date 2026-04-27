/**
 * スカラー値の累積集約（純粋関数）
 *
 * aggregateResults から抽出。複数 StoreResult のスカラーフィールドを合算する。
 *
 * @responsibility R:unclassified
 */
import type { CostPricePair, CategoryType, DailyRecord } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import {
  ZERO_COST_PRICE_PAIR,
  addCostPricePairs,
  ZERO_DISCOUNT_ENTRIES,
  addDiscountEntries,
} from '@/domain/models/record'

export function addToCategory(
  map: Map<CategoryType, CostPricePair>,
  category: CategoryType,
  pair: CostPricePair,
): void {
  const existing = map.get(category) ?? ZERO_COST_PRICE_PAIR
  map.set(category, addCostPricePairs(existing, pair))
}

/** 日別レコードをマージする */
export function mergeDailyRecord(existing: DailyRecord, rec: DailyRecord): DailyRecord {
  const mergedSB = new Map(existing.supplierBreakdown)
  for (const [code, pair] of rec.supplierBreakdown) {
    const ex = mergedSB.get(code) ?? ZERO_COST_PRICE_PAIR
    mergedSB.set(code, addCostPricePairs(ex, pair))
  }

  return {
    day: existing.day,
    sales: existing.sales + rec.sales,
    coreSales: existing.coreSales + rec.coreSales,
    grossSales: existing.grossSales + rec.grossSales,
    totalCost: existing.totalCost + rec.totalCost,
    purchase: addCostPricePairs(existing.purchase, rec.purchase),
    deliverySales: addCostPricePairs(existing.deliverySales, rec.deliverySales),
    interStoreIn: addCostPricePairs(existing.interStoreIn, rec.interStoreIn),
    interStoreOut: addCostPricePairs(existing.interStoreOut, rec.interStoreOut),
    interDepartmentIn: addCostPricePairs(existing.interDepartmentIn, rec.interDepartmentIn),
    interDepartmentOut: addCostPricePairs(existing.interDepartmentOut, rec.interDepartmentOut),
    flowers: addCostPricePairs(existing.flowers, rec.flowers),
    directProduce: addCostPricePairs(existing.directProduce, rec.directProduce),
    costInclusion: {
      cost: existing.costInclusion.cost + rec.costInclusion.cost,
      items: [...existing.costInclusion.items, ...rec.costInclusion.items],
    },
    customers: (existing.customers ?? 0) + (rec.customers ?? 0),
    discountAmount: existing.discountAmount + rec.discountAmount,
    discountAbsolute: existing.discountAbsolute + rec.discountAbsolute,
    discountEntries: addDiscountEntries(existing.discountEntries, rec.discountEntries),
    supplierBreakdown: mergedSB,
    transferBreakdown: {
      interStoreIn: [
        ...existing.transferBreakdown.interStoreIn,
        ...rec.transferBreakdown.interStoreIn,
      ],
      interStoreOut: [
        ...existing.transferBreakdown.interStoreOut,
        ...rec.transferBreakdown.interStoreOut,
      ],
      interDepartmentIn: [
        ...existing.transferBreakdown.interDepartmentIn,
        ...rec.transferBreakdown.interDepartmentIn,
      ],
      interDepartmentOut: [
        ...existing.transferBreakdown.interDepartmentOut,
        ...rec.transferBreakdown.interDepartmentOut,
      ],
    },
  }
}

// ── 集約の中間結果型 ──

export interface ScalarAccumulation {
  totalSales: number
  totalCoreSales: number
  deliverySalesPrice: number
  flowerSalesPrice: number
  directProduceSalesPrice: number
  grossSales: number
  totalCost: number
  inventoryCost: number
  deliverySalesCost: number
  totalDiscount: number
  aggDiscountEntries: ReturnType<typeof addDiscountEntries>
  totalCostInclusion: number
  totalCustomers: number
  budget: number
  gpBudget: number
  elapsedDays: number
  salesDays: number
  purchaseMaxDay: number
  hasDiscountData: boolean
  openInv: number
  closeInv: number
  hasOpening: boolean
  hasClosing: boolean
}

/** 全店舗のスカラー値を合算する */
export function accumulateScalars(results: readonly StoreResult[]): ScalarAccumulation {
  let totalSales = 0
  let totalCoreSales = 0
  let deliverySalesPrice = 0
  let flowerSalesPrice = 0
  let directProduceSalesPrice = 0
  let grossSales = 0
  let totalCost = 0
  let inventoryCost = 0
  let deliverySalesCost = 0
  let totalDiscount = 0
  let aggDiscountEntries = ZERO_DISCOUNT_ENTRIES.map((e) => ({ ...e }))
  let totalCostInclusion = 0
  let totalCustomers = 0
  let budget = 0
  let gpBudget = 0
  let elapsedDays = 0
  let salesDays = 0
  let purchaseMaxDay = 0
  let hasDiscountData = false
  let openInv = 0
  let closeInv = 0
  let hasOpening = false
  let hasClosing = false

  for (const r of results) {
    totalSales += r.totalSales
    totalCoreSales += r.totalCoreSales
    deliverySalesPrice += r.deliverySalesPrice
    flowerSalesPrice += r.flowerSalesPrice
    directProduceSalesPrice += r.directProduceSalesPrice
    grossSales += r.grossSales
    totalCost += r.totalCost
    inventoryCost += r.inventoryCost
    deliverySalesCost += r.deliverySalesCost
    totalDiscount += r.totalDiscount
    aggDiscountEntries = addDiscountEntries(
      aggDiscountEntries,
      r.discountEntries,
    ) as typeof aggDiscountEntries
    totalCostInclusion += r.totalCostInclusion
    totalCustomers += r.totalCustomers
    budget += r.budget
    gpBudget += r.grossProfitBudget
    elapsedDays = Math.max(elapsedDays, r.elapsedDays)
    salesDays = Math.max(salesDays, r.salesDays)
    purchaseMaxDay = Math.max(purchaseMaxDay, r.purchaseMaxDay)
    if (r.hasDiscountData) hasDiscountData = true
    if (r.openingInventory != null) {
      openInv += r.openingInventory
      hasOpening = true
    }
    if (r.closingInventory != null) {
      closeInv += r.closingInventory
      hasClosing = true
    }
  }

  return {
    totalSales,
    totalCoreSales,
    deliverySalesPrice,
    flowerSalesPrice,
    directProduceSalesPrice,
    grossSales,
    totalCost,
    inventoryCost,
    deliverySalesCost,
    totalDiscount,
    aggDiscountEntries,
    totalCostInclusion,
    totalCustomers,
    budget,
    gpBudget,
    elapsedDays,
    salesDays,
    purchaseMaxDay,
    hasDiscountData,
    openInv,
    closeInv,
    hasOpening,
    hasClosing,
  }
}
