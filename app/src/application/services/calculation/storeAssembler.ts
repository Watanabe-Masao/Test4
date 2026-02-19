import type {
  AppSettings,
  CostPricePair,
  CategoryType,
  StoreResult,
  TransferDetails,
  ImportedData,
} from '@/domain/models'
import { ZERO_COST_PRICE_PAIR, addCostPricePairs } from '@/domain/models'
import { calculateInvMethod } from '@/domain/calculations/invMethod'
import {
  calculateEstMethod,
  calculateCoreSales,
  calculateDiscountRate,
} from '@/domain/calculations/estMethod'
import { calculateDiscountImpact } from '@/domain/calculations/discountImpact'
import { calculateBudgetAnalysis } from '@/domain/calculations/budgetAnalysis'
import { safeDivide } from '@/domain/calculations/utils'
import type { MonthlyAccumulator } from './types'

function addToCategory(
  map: Map<CategoryType, CostPricePair>,
  category: CategoryType,
  pair: CostPricePair,
): void {
  const existing = map.get(category) ?? ZERO_COST_PRICE_PAIR
  map.set(category, addCostPricePairs(existing, pair))
}

/**
 * 月間集計から最終的な StoreResult を組み立てる
 */
export function assembleStoreResult(
  storeId: string,
  acc: MonthlyAccumulator,
  data: ImportedData,
  settings: AppSettings,
  daysInMonth: number,
): StoreResult {
  const invConfig = data.settings.get(storeId)
  const budgetData = data.budget.get(storeId)

  // 売上納品
  const deliverySalesPrice = acc.totalFlowerPrice + acc.totalDirectProducePrice
  const deliverySalesCost = acc.totalFlowerCost + acc.totalDirectProduceCost

  // コア売上（月間）
  const { coreSales: totalCoreSales } = calculateCoreSales(
    acc.totalSales,
    acc.totalFlowerPrice,
    acc.totalDirectProducePrice,
  )

  // 在庫仕入原価 = 総仕入原価 - 売上納品原価
  const inventoryCost = acc.totalCost - deliverySalesCost

  // 粗売上（月間）
  const grossSales = acc.totalSales + acc.totalDiscount

  // 売変率
  const discountRate = calculateDiscountRate(acc.totalSales, acc.totalDiscount)

  // 値入率（店間・部門間移動も仕入として算入）
  const transferPrice =
    acc.transferTotals.interStoreIn.price +
    acc.transferTotals.interStoreOut.price +
    acc.transferTotals.interDepartmentIn.price +
    acc.transferTotals.interDepartmentOut.price
  const transferCost =
    acc.transferTotals.interStoreIn.cost +
    acc.transferTotals.interStoreOut.cost +
    acc.transferTotals.interDepartmentIn.cost +
    acc.transferTotals.interDepartmentOut.cost

  const allPurchasePrice = acc.totalPurchasePrice + acc.totalFlowerPrice + acc.totalDirectProducePrice + transferPrice
  const allPurchaseCost = acc.totalPurchaseCost + acc.totalFlowerCost + acc.totalDirectProduceCost + transferCost
  const averageMarkupRate = safeDivide(allPurchasePrice - allPurchaseCost, allPurchasePrice, 0)
  const coreMarkupRate = safeDivide(
    (acc.totalPurchasePrice + transferPrice) - (acc.totalPurchaseCost + transferCost),
    acc.totalPurchasePrice + transferPrice,
    settings.defaultMarkupRate,
  )

  // 【在庫法】
  const invResult = calculateInvMethod({
    openingInventory: invConfig?.openingInventory ?? null,
    closingInventory: invConfig?.closingInventory ?? null,
    totalPurchaseCost: acc.totalCost,
    totalSales: acc.totalSales,
  })

  // 【推定法】
  const estResult = calculateEstMethod({
    coreSales: totalCoreSales,
    discountRate,
    markupRate: coreMarkupRate,
    consumableCost: acc.totalConsumable,
    openingInventory: invConfig?.openingInventory ?? null,
    inventoryPurchaseCost: inventoryCost,
  })

  // 売変ロス原価
  const { discountLossCost } = calculateDiscountImpact({
    coreSales: totalCoreSales,
    markupRate: coreMarkupRate,
    discountRate,
  })

  // 消耗品率
  const consumableRate = safeDivide(acc.totalConsumable, acc.totalSales, 0)

  // カテゴリ集計
  addToCategory(acc.categoryTotals, 'flowers', { cost: acc.totalFlowerCost, price: acc.totalFlowerPrice })
  addToCategory(acc.categoryTotals, 'directProduce', { cost: acc.totalDirectProduceCost, price: acc.totalDirectProducePrice })
  addToCategory(acc.categoryTotals, 'consumables', { cost: acc.totalConsumable, price: 0 })
  addToCategory(acc.categoryTotals, 'interStore', addCostPricePairs(acc.transferTotals.interStoreIn, acc.transferTotals.interStoreOut))
  addToCategory(acc.categoryTotals, 'interDepartment', addCostPricePairs(acc.transferTotals.interDepartmentIn, acc.transferTotals.interDepartmentOut))

  // 移動詳細
  const transferDetails: TransferDetails = {
    ...acc.transferTotals,
    netTransfer: {
      cost:
        acc.transferTotals.interStoreIn.cost +
        acc.transferTotals.interStoreOut.cost +
        acc.transferTotals.interDepartmentIn.cost +
        acc.transferTotals.interDepartmentOut.cost,
      price:
        acc.transferTotals.interStoreIn.price +
        acc.transferTotals.interStoreOut.price +
        acc.transferTotals.interDepartmentIn.price +
        acc.transferTotals.interDepartmentOut.price,
    },
  }

  // 取引先値入率の後計算
  for (const [code, st] of acc.supplierTotals) {
    acc.supplierTotals.set(code, {
      ...st,
      markupRate: safeDivide(st.price - st.cost, st.price, 0),
    })
  }

  // 予算
  const budget = budgetData?.total ?? settings.defaultBudget
  const budgetDaily = budgetData?.daily ?? new Map<number, number>()
  const gpBudget = invConfig?.grossProfitBudget ?? 0

  // 予算分析
  const salesDaily = new Map<number, number>()
  for (const [d, rec] of acc.daily) {
    salesDaily.set(d, rec.sales)
  }
  const budgetAnalysis = calculateBudgetAnalysis({
    totalSales: acc.totalSales,
    budget,
    budgetDaily,
    salesDaily,
    elapsedDays: acc.elapsedDays,
    salesDays: acc.salesDays,
    daysInMonth,
  })

  return {
    storeId,
    openingInventory: invConfig?.openingInventory ?? null,
    closingInventory: invConfig?.closingInventory ?? null,
    totalSales: acc.totalSales,
    totalCoreSales,
    deliverySalesPrice,
    flowerSalesPrice: acc.totalFlowerPrice,
    directProduceSalesPrice: acc.totalDirectProducePrice,
    grossSales,
    totalCost: acc.totalCost,
    inventoryCost,
    deliverySalesCost,
    invMethodCogs: invResult.cogs,
    invMethodGrossProfit: invResult.grossProfit,
    invMethodGrossProfitRate: invResult.grossProfitRate,
    estMethodCogs: estResult.cogs,
    estMethodMargin: estResult.margin,
    estMethodMarginRate: estResult.marginRate,
    estMethodClosingInventory: estResult.closingInventory,
    totalCustomers: acc.totalCustomers,
    averageCustomersPerDay: safeDivide(acc.totalCustomers, acc.salesDays, 0),
    totalDiscount: acc.totalDiscount,
    discountRate,
    discountLossCost,
    averageMarkupRate,
    coreMarkupRate,
    totalConsumable: acc.totalConsumable,
    consumableRate,
    budget,
    grossProfitBudget: gpBudget,
    grossProfitRateBudget: safeDivide(gpBudget, budget, 0),
    budgetDaily,
    daily: acc.daily,
    categoryTotals: acc.categoryTotals,
    supplierTotals: acc.supplierTotals,
    transferDetails,
    elapsedDays: acc.elapsedDays,
    salesDays: acc.salesDays,
    averageDailySales: budgetAnalysis.averageDailySales,
    projectedSales: budgetAnalysis.projectedSales,
    projectedAchievement: budgetAnalysis.projectedAchievement,
    budgetAchievementRate: budgetAnalysis.budgetAchievementRate,
    budgetProgressRate: budgetAnalysis.budgetProgressRate,
    remainingBudget: budgetAnalysis.remainingBudget,
    dailyCumulative: budgetAnalysis.dailyCumulative,
  }
}
