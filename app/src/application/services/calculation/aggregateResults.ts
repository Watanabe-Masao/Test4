import type {
  CostPricePair,
  CategoryType,
  SupplierTotal,
  DailyRecord,
  StoreResult,
  TransferDetails,
} from '@/domain/models'
import { ZERO_COST_PRICE_PAIR, addCostPricePairs } from '@/domain/models'
import { calculateDiscountRate } from '@/domain/calculations/estMethod'
import { safeDivide } from '@/domain/calculations/utils'

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
    purchase: addCostPricePairs(existing.purchase, rec.purchase),
    deliverySales: addCostPricePairs(existing.deliverySales, rec.deliverySales),
    interStoreIn: addCostPricePairs(existing.interStoreIn, rec.interStoreIn),
    interStoreOut: addCostPricePairs(existing.interStoreOut, rec.interStoreOut),
    interDepartmentIn: addCostPricePairs(existing.interDepartmentIn, rec.interDepartmentIn),
    interDepartmentOut: addCostPricePairs(existing.interDepartmentOut, rec.interDepartmentOut),
    flowers: addCostPricePairs(existing.flowers, rec.flowers),
    directProduce: addCostPricePairs(existing.directProduce, rec.directProduce),
    consumable: {
      cost: existing.consumable.cost + rec.consumable.cost,
      items: [...existing.consumable.items, ...rec.consumable.items],
    },
    discountAmount: existing.discountAmount + rec.discountAmount,
    discountAbsolute: existing.discountAbsolute + rec.discountAbsolute,
    supplierBreakdown: mergedSB,
    transferBreakdown: {
      interStoreIn: [...existing.transferBreakdown.interStoreIn, ...rec.transferBreakdown.interStoreIn],
      interStoreOut: [...existing.transferBreakdown.interStoreOut, ...rec.transferBreakdown.interStoreOut],
      interDepartmentIn: [...existing.transferBreakdown.interDepartmentIn, ...rec.transferBreakdown.interDepartmentIn],
      interDepartmentOut: [...existing.transferBreakdown.interDepartmentOut, ...rec.transferBreakdown.interDepartmentOut],
    },
  }
}

/**
 * 複数店舗の StoreResult を合算する
 */
export function aggregateStoreResults(results: readonly StoreResult[], daysInMonth: number): StoreResult {
  if (results.length === 0) {
    throw new Error('Cannot aggregate 0 results')
  }

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
  let totalConsumable = 0
  let budget = 0
  let gpBudget = 0
  let elapsedDays = 0
  let salesDays = 0

  let openInv = 0
  let closeInv = 0
  let hasOpening = false
  let hasClosing = false

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
    totalConsumable += r.totalConsumable
    budget += r.budget
    gpBudget += r.grossProfitBudget
    elapsedDays = Math.max(elapsedDays, r.elapsedDays)
    salesDays = Math.max(salesDays, r.salesDays)

    if (r.openingInventory != null) { openInv += r.openingInventory; hasOpening = true }
    if (r.closingInventory != null) { closeInv += r.closingInventory; hasClosing = true }

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
    aggTransfer.interStoreIn = addCostPricePairs(aggTransfer.interStoreIn, r.transferDetails.interStoreIn)
    aggTransfer.interStoreOut = addCostPricePairs(aggTransfer.interStoreOut, r.transferDetails.interStoreOut)
    aggTransfer.interDepartmentIn = addCostPricePairs(aggTransfer.interDepartmentIn, r.transferDetails.interDepartmentIn)
    aggTransfer.interDepartmentOut = addCostPricePairs(aggTransfer.interDepartmentOut, r.transferDetails.interDepartmentOut)
  }

  const discountRate = calculateDiscountRate(totalSales, totalDiscount)

  // 値入率
  let totalPurchaseCost = 0
  let totalPurchasePrice = 0
  for (const [, st] of aggSupplier) {
    totalPurchaseCost += st.cost
    totalPurchasePrice += st.price
  }
  const flowerCat = aggCategory.get('flowers') ?? ZERO_COST_PRICE_PAIR
  const directProduceCat = aggCategory.get('directProduce') ?? ZERO_COST_PRICE_PAIR
  const allPurchasePrice = totalPurchasePrice + flowerCat.price + directProduceCat.price
  const allPurchaseCost = totalPurchaseCost + flowerCat.cost + directProduceCat.cost
  const averageMarkupRate = safeDivide(allPurchasePrice - allPurchaseCost, allPurchasePrice, 0)
  const coreMarkupRate = safeDivide(totalPurchasePrice - totalPurchaseCost, totalPurchasePrice, 0)

  const consumableRate = safeDivide(totalConsumable, totalSales, 0)
  const averageDailySales = safeDivide(totalSales, salesDays, 0)

  const openingInventory = hasOpening ? openInv : null
  const closingInventory = hasClosing ? closeInv : null

  // 在庫法集計
  let invMethodCogs: number | null = null
  let invMethodGrossProfit: number | null = null
  let invMethodGrossProfitRate: number | null = null
  if (openingInventory != null && closingInventory != null) {
    invMethodCogs = openingInventory + totalCost - closingInventory
    invMethodGrossProfit = totalSales - invMethodCogs
    invMethodGrossProfitRate = safeDivide(invMethodGrossProfit, totalSales, 0)
  }

  // 推定法集計
  const estMethodCogs = results.reduce((s, r) => s + r.estMethodCogs, 0)
  const estMethodMargin = results.reduce((s, r) => s + r.estMethodMargin, 0)
  const estMethodMarginRate = safeDivide(estMethodMargin, totalCoreSales, 0)
  const hasEstClosing = results.some((r) => r.estMethodClosingInventory != null)
  const estMethodClosingInventory = hasEstClosing
    ? results.reduce((s, r) => s + (r.estMethodClosingInventory ?? 0), 0)
    : null

  const discountLossCost = results.reduce((s, r) => s + r.discountLossCost, 0)
  const remainingDays = daysInMonth - elapsedDays
  const projectedSales = totalSales + averageDailySales * remainingDays
  const projectedAchievement = safeDivide(projectedSales, budget, 0)

  // 集約予算分析
  const budgetAchievementRate = safeDivide(totalSales, budget, 0)
  let aggCumulativeBudget = 0
  for (let d = 1; d <= elapsedDays; d++) {
    aggCumulativeBudget += aggBudgetDaily.get(d) ?? 0
  }
  const budgetProgressRate = safeDivide(totalSales, aggCumulativeBudget, 0)
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

  const transferDetails: TransferDetails = {
    ...aggTransfer,
    netTransfer: {
      cost: aggTransfer.interStoreIn.cost + aggTransfer.interStoreOut.cost +
        aggTransfer.interDepartmentIn.cost + aggTransfer.interDepartmentOut.cost,
      price: aggTransfer.interStoreIn.price + aggTransfer.interStoreOut.price +
        aggTransfer.interDepartmentIn.price + aggTransfer.interDepartmentOut.price,
    },
  }

  return {
    storeId: 'aggregate',
    openingInventory,
    closingInventory,
    totalSales,
    totalCoreSales,
    deliverySalesPrice,
    flowerSalesPrice,
    directProduceSalesPrice,
    grossSales,
    totalCost,
    inventoryCost,
    deliverySalesCost,
    invMethodCogs,
    invMethodGrossProfit,
    invMethodGrossProfitRate,
    estMethodCogs,
    estMethodMargin,
    estMethodMarginRate,
    estMethodClosingInventory,
    totalDiscount,
    discountRate,
    discountLossCost,
    averageMarkupRate,
    coreMarkupRate,
    totalConsumable,
    consumableRate,
    budget,
    grossProfitBudget: gpBudget,
    grossProfitRateBudget: safeDivide(gpBudget, budget, 0),
    budgetDaily: aggBudgetDaily,
    daily: aggDaily,
    categoryTotals: aggCategory,
    supplierTotals: aggSupplier,
    transferDetails,
    elapsedDays,
    salesDays,
    averageDailySales,
    projectedSales,
    projectedAchievement,
    budgetAchievementRate,
    budgetProgressRate,
    remainingBudget,
    dailyCumulative,
  }
}
