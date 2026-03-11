import type {
  CostPricePair,
  CategoryType,
  SupplierTotal,
  DailyRecord,
  StoreResult,
  TransferDetails,
} from '@/domain/models'
import {
  ZERO_COST_PRICE_PAIR,
  addCostPricePairs,
  ZERO_DISCOUNT_ENTRIES,
  addDiscountEntries,
} from '@/domain/models'
import { calculateDiscountRate } from '@/domain/calculations/estMethod'
import { safeDivide } from '@/domain/calculations/utils'
import { calculateGrossProfitBudget } from '@/domain/calculations/budgetAnalysis'

function addToCategory(
  map: Map<CategoryType, CostPricePair>,
  category: CategoryType,
  pair: CostPricePair,
): void {
  const existing = map.get(category) ?? ZERO_COST_PRICE_PAIR
  map.set(category, addCostPricePairs(existing, pair))
}

/** 日別レコードをマージする */
function mergeDailyRecord(existing: DailyRecord, rec: DailyRecord): DailyRecord {
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

interface ScalarAccumulation {
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
function accumulateScalars(results: readonly StoreResult[]): ScalarAccumulation {
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

/** 日別・カテゴリ・取引先・予算・移動を集約する */
function aggregateCollections(results: readonly StoreResult[]) {
  const aggDaily = new Map<number, DailyRecord>()
  const aggCategory = new Map<CategoryType, CostPricePair>()
  const aggSupplier = new Map<string, SupplierTotal>()
  const aggBudgetDaily = new Map<number, number>()
  const aggTransfer = {
    interStoreIn: { ...ZERO_COST_PRICE_PAIR },
    interStoreOut: { ...ZERO_COST_PRICE_PAIR },
    interDepartmentIn: { ...ZERO_COST_PRICE_PAIR },
    interDepartmentOut: { ...ZERO_COST_PRICE_PAIR },
  }

  for (const r of results) {
    // 日別集計
    for (const [day, rec] of r.daily) {
      const existing = aggDaily.get(day)
      if (!existing) {
        aggDaily.set(day, {
          ...rec,
          supplierBreakdown: new Map(rec.supplierBreakdown),
          transferBreakdown: {
            interStoreIn: [...rec.transferBreakdown.interStoreIn],
            interStoreOut: [...rec.transferBreakdown.interStoreOut],
            interDepartmentIn: [...rec.transferBreakdown.interDepartmentIn],
            interDepartmentOut: [...rec.transferBreakdown.interDepartmentOut],
          },
        })
      } else {
        aggDaily.set(day, mergeDailyRecord(existing, rec))
      }
    }

    // カテゴリ集計
    for (const [cat, pair] of r.categoryTotals) {
      addToCategory(aggCategory, cat, pair)
    }

    // 取引先集計
    for (const [code, st] of r.supplierTotals) {
      const ex = aggSupplier.get(code)
      if (!ex) {
        aggSupplier.set(code, { ...st })
      } else {
        aggSupplier.set(code, {
          ...ex,
          cost: ex.cost + st.cost,
          price: ex.price + st.price,
          markupRate: safeDivide(ex.price + st.price - ex.cost - st.cost, ex.price + st.price, 0),
        })
      }
    }

    // 予算日別集計
    for (const [day, val] of r.budgetDaily) {
      aggBudgetDaily.set(day, (aggBudgetDaily.get(day) ?? 0) + val)
    }

    // 移動集計
    aggTransfer.interStoreIn = addCostPricePairs(
      aggTransfer.interStoreIn,
      r.transferDetails.interStoreIn,
    )
    aggTransfer.interStoreOut = addCostPricePairs(
      aggTransfer.interStoreOut,
      r.transferDetails.interStoreOut,
    )
    aggTransfer.interDepartmentIn = addCostPricePairs(
      aggTransfer.interDepartmentIn,
      r.transferDetails.interDepartmentIn,
    )
    aggTransfer.interDepartmentOut = addCostPricePairs(
      aggTransfer.interDepartmentOut,
      r.transferDetails.interDepartmentOut,
    )
  }

  return { aggDaily, aggCategory, aggSupplier, aggBudgetDaily, aggTransfer }
}

/** 合算値から値入率を計算する */
function calculateMarkupRates(
  aggSupplier: ReadonlyMap<string, SupplierTotal>,
  aggCategory: ReadonlyMap<CategoryType, CostPricePair>,
  aggTransfer: {
    interStoreIn: CostPricePair
    interStoreOut: CostPricePair
    interDepartmentIn: CostPricePair
    interDepartmentOut: CostPricePair
  },
) {
  let totalPurchaseCost = 0
  let totalPurchasePrice = 0
  for (const [, st] of aggSupplier) {
    totalPurchaseCost += st.cost
    totalPurchasePrice += st.price
  }
  const transferPrice =
    aggTransfer.interStoreIn.price +
    aggTransfer.interStoreOut.price +
    aggTransfer.interDepartmentIn.price +
    aggTransfer.interDepartmentOut.price
  const transferCost =
    aggTransfer.interStoreIn.cost +
    aggTransfer.interStoreOut.cost +
    aggTransfer.interDepartmentIn.cost +
    aggTransfer.interDepartmentOut.cost
  const flowerCat = aggCategory.get('flowers') ?? ZERO_COST_PRICE_PAIR
  const directProduceCat = aggCategory.get('directProduce') ?? ZERO_COST_PRICE_PAIR
  const allPurchasePrice =
    totalPurchasePrice + flowerCat.price + directProduceCat.price + transferPrice
  const allPurchaseCost = totalPurchaseCost + flowerCat.cost + directProduceCat.cost + transferCost
  const averageMarkupRate = safeDivide(allPurchasePrice - allPurchaseCost, allPurchasePrice, 0)
  const coreMarkupRate = safeDivide(
    totalPurchasePrice + transferPrice - (totalPurchaseCost + transferCost),
    totalPurchasePrice + transferPrice,
    0,
  )

  return { averageMarkupRate, coreMarkupRate }
}

/** 在庫法の集約結果を計算する */
function calculateAggregateInventory(
  openingInventory: number | null,
  closingInventory: number | null,
  totalCost: number,
  totalSales: number,
) {
  let invMethodCogs: number | null = null
  let invMethodGrossProfit: number | null = null
  let invMethodGrossProfitRate: number | null = null
  if (openingInventory != null && closingInventory != null) {
    invMethodCogs = openingInventory + totalCost - closingInventory
    invMethodGrossProfit = totalSales - invMethodCogs
    invMethodGrossProfitRate = safeDivide(invMethodGrossProfit, totalSales, 0)
  }
  return { invMethodCogs, invMethodGrossProfit, invMethodGrossProfitRate }
}

/** 推定法の集約結果を計算する */
function calculateAggregateEstMethod(results: readonly StoreResult[], totalCoreSales: number) {
  const estMethodCogs = results.reduce((s, r) => s + r.estMethodCogs, 0)
  const estMethodMargin = results.reduce((s, r) => s + r.estMethodMargin, 0)
  const estMethodMarginRate = safeDivide(estMethodMargin, totalCoreSales, 0)
  const hasEstClosing = results.some((r) => r.estMethodClosingInventory != null)
  const estMethodClosingInventory = hasEstClosing
    ? results.reduce((s, r) => s + (r.estMethodClosingInventory ?? 0), 0)
    : null
  return { estMethodCogs, estMethodMargin, estMethodMarginRate, estMethodClosingInventory }
}

/** 予算分析の集約結果を計算する */
function calculateAggregateBudget(
  totalSales: number,
  budget: number,
  averageDailySales: number,
  elapsedDays: number,
  daysInMonth: number,
  aggBudgetDaily: ReadonlyMap<number, number>,
  aggDaily: ReadonlyMap<number, DailyRecord>,
) {
  const remainingDays = daysInMonth - elapsedDays
  const projectedSales = totalSales + averageDailySales * remainingDays
  const projectedAchievement = safeDivide(projectedSales, budget, 0)
  const budgetAchievementRate = safeDivide(totalSales, budget, 0)

  let aggCumulativeBudget = 0
  for (let d = 1; d <= elapsedDays; d++) {
    aggCumulativeBudget += aggBudgetDaily.get(d) ?? 0
  }
  const budgetProgressRate = safeDivide(totalSales, aggCumulativeBudget, 0)
  const budgetElapsedRate = safeDivide(aggCumulativeBudget, budget, 0)
  const budgetProgressGap = budgetProgressRate - budgetElapsedRate
  const budgetVariance = totalSales - aggCumulativeBudget
  const requiredDailySales =
    remainingDays > 0 ? safeDivide(budget - totalSales, remainingDays, 0) : 0
  const remainingBudget = budget - totalSales

  const dailyCumulative = new Map<number, { sales: number; budget: number }>()
  let cumSales = 0
  let cumBudget = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dayRec = aggDaily.get(d)
    cumSales += dayRec?.sales ?? 0
    cumBudget += aggBudgetDaily.get(d) ?? 0
    dailyCumulative.set(d, { sales: cumSales, budget: cumBudget })
  }

  return {
    projectedSales,
    projectedAchievement,
    budgetAchievementRate,
    budgetProgressRate,
    budgetElapsedRate,
    budgetProgressGap,
    budgetVariance,
    requiredDailySales,
    remainingBudget,
    dailyCumulative,
  }
}

/** TransferDetails を構築する */
function buildTransferDetails(aggTransfer: {
  interStoreIn: CostPricePair
  interStoreOut: CostPricePair
  interDepartmentIn: CostPricePair
  interDepartmentOut: CostPricePair
}): TransferDetails {
  return {
    ...aggTransfer,
    netTransfer: {
      cost:
        aggTransfer.interStoreIn.cost +
        aggTransfer.interStoreOut.cost +
        aggTransfer.interDepartmentIn.cost +
        aggTransfer.interDepartmentOut.cost,
      price:
        aggTransfer.interStoreIn.price +
        aggTransfer.interStoreOut.price +
        aggTransfer.interDepartmentIn.price +
        aggTransfer.interDepartmentOut.price,
    },
  }
}

/**
 * 複数店舗の StoreResult を合算する
 */
export function aggregateStoreResults(
  results: readonly StoreResult[],
  daysInMonth: number,
): StoreResult {
  if (results.length === 0) {
    throw new Error('Cannot aggregate 0 results')
  }

  const scalars = accumulateScalars(results)
  const { aggDaily, aggCategory, aggSupplier, aggBudgetDaily, aggTransfer } =
    aggregateCollections(results)

  const discountRate = calculateDiscountRate(scalars.totalSales, scalars.totalDiscount)
  const { averageMarkupRate, coreMarkupRate } = calculateMarkupRates(
    aggSupplier,
    aggCategory,
    aggTransfer,
  )

  const costInclusionRate = safeDivide(scalars.totalCostInclusion, scalars.totalSales, 0)
  const averageDailySales = safeDivide(scalars.totalSales, scalars.salesDays, 0)

  const openingInventory = scalars.hasOpening ? scalars.openInv : null
  const closingInventory = scalars.hasClosing ? scalars.closeInv : null

  const inv = calculateAggregateInventory(
    openingInventory,
    closingInventory,
    scalars.totalCost,
    scalars.totalSales,
  )
  const est = calculateAggregateEstMethod(results, scalars.totalCoreSales)

  const discountLossCost = results.reduce((s, r) => s + r.discountLossCost, 0)

  const budgetAnalysis = calculateAggregateBudget(
    scalars.totalSales,
    scalars.budget,
    averageDailySales,
    scalars.elapsedDays,
    daysInMonth,
    aggBudgetDaily,
    aggDaily,
  )

  const transferDetails = buildTransferDetails(aggTransfer)

  return {
    storeId: 'aggregate',
    openingInventory,
    closingInventory,
    productInventory: null,
    costInclusionInventory: null,
    inventoryDate: null,
    closingInventoryDay: null,
    purchaseMaxDay: scalars.purchaseMaxDay,
    hasDiscountData: scalars.hasDiscountData,
    totalSales: scalars.totalSales,
    totalCoreSales: scalars.totalCoreSales,
    deliverySalesPrice: scalars.deliverySalesPrice,
    flowerSalesPrice: scalars.flowerSalesPrice,
    directProduceSalesPrice: scalars.directProduceSalesPrice,
    grossSales: scalars.grossSales,
    totalCost: scalars.totalCost,
    inventoryCost: scalars.inventoryCost,
    deliverySalesCost: scalars.deliverySalesCost,
    invMethodCogs: inv.invMethodCogs,
    invMethodGrossProfit: inv.invMethodGrossProfit,
    invMethodGrossProfitRate: inv.invMethodGrossProfitRate,
    estMethodCogs: est.estMethodCogs,
    estMethodMargin: est.estMethodMargin,
    estMethodMarginRate: est.estMethodMarginRate,
    estMethodClosingInventory: est.estMethodClosingInventory,
    totalCustomers: scalars.totalCustomers,
    transactionValue: safeDivide(scalars.totalSales, scalars.totalCustomers, 0),
    averageCustomersPerDay: safeDivide(scalars.totalCustomers, scalars.salesDays, 0),
    totalDiscount: scalars.totalDiscount,
    discountRate,
    discountLossCost,
    discountEntries: scalars.aggDiscountEntries,
    averageMarkupRate,
    coreMarkupRate,
    totalCostInclusion: scalars.totalCostInclusion,
    costInclusionRate,
    budget: scalars.budget,
    grossProfitBudget: scalars.gpBudget,
    grossProfitRateBudget: safeDivide(scalars.gpBudget, scalars.budget, 0),
    budgetDaily: aggBudgetDaily,
    daily: aggDaily,
    categoryTotals: aggCategory,
    supplierTotals: aggSupplier,
    transferDetails,
    elapsedDays: scalars.elapsedDays,
    salesDays: scalars.salesDays,
    averageDailySales,
    ...budgetAnalysis,
    ...calculateGrossProfitBudget({
      grossProfit: inv.invMethodGrossProfit ?? est.estMethodMargin,
      grossProfitBudget: scalars.gpBudget,
      budgetElapsedRate: budgetAnalysis.budgetElapsedRate,
      elapsedDays: scalars.elapsedDays,
      salesDays: scalars.salesDays,
      daysInMonth,
    }),
  }
}
