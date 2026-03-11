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
import {
  calculateBudgetAnalysis,
  calculateGrossProfitBudget,
} from '@/domain/calculations/budgetAnalysis'
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

/** 移動合計から転送コスト・価格合計を計算する */
function calculateTransferTotals(transferTotals: MonthlyAccumulator['transferTotals']) {
  const transferPrice =
    transferTotals.interStoreIn.price +
    transferTotals.interStoreOut.price +
    transferTotals.interDepartmentIn.price +
    transferTotals.interDepartmentOut.price
  const transferCost =
    transferTotals.interStoreIn.cost +
    transferTotals.interStoreOut.cost +
    transferTotals.interDepartmentIn.cost +
    transferTotals.interDepartmentOut.cost
  return { transferPrice, transferCost }
}

/** 値入率（全カテゴリ・コア）を計算する */
function calculateMarkupRates(
  acc: MonthlyAccumulator,
  transferPrice: number,
  transferCost: number,
  defaultMarkupRate: number,
) {
  const allPurchasePrice =
    acc.totalPurchasePrice + acc.totalFlowerPrice + acc.totalDirectProducePrice + transferPrice
  const allPurchaseCost =
    acc.totalPurchaseCost + acc.totalFlowerCost + acc.totalDirectProduceCost + transferCost
  const averageMarkupRate = safeDivide(allPurchasePrice - allPurchaseCost, allPurchasePrice, 0)
  const coreMarkupRate = safeDivide(
    acc.totalPurchasePrice + transferPrice - (acc.totalPurchaseCost + transferCost),
    acc.totalPurchasePrice + transferPrice,
    defaultMarkupRate,
  )
  return { averageMarkupRate, coreMarkupRate }
}

/** カテゴリ集計にカテゴリ別の合算を追加する */
function finalizeCategoryTotals(acc: MonthlyAccumulator): void {
  addToCategory(acc.categoryTotals, 'flowers', {
    cost: acc.totalFlowerCost,
    price: acc.totalFlowerPrice,
  })
  addToCategory(acc.categoryTotals, 'directProduce', {
    cost: acc.totalDirectProduceCost,
    price: acc.totalDirectProducePrice,
  })
  addToCategory(acc.categoryTotals, 'consumables', { cost: acc.totalCostInclusion, price: 0 })
  addToCategory(
    acc.categoryTotals,
    'interStore',
    addCostPricePairs(acc.transferTotals.interStoreIn, acc.transferTotals.interStoreOut),
  )
  addToCategory(
    acc.categoryTotals,
    'interDepartment',
    addCostPricePairs(acc.transferTotals.interDepartmentIn, acc.transferTotals.interDepartmentOut),
  )
}

/** 移動詳細を構築する */
function buildTransferDetails(
  transferTotals: MonthlyAccumulator['transferTotals'],
): TransferDetails {
  const { transferPrice, transferCost } = calculateTransferTotals(transferTotals)
  return {
    ...transferTotals,
    netTransfer: { cost: transferCost, price: transferPrice },
  }
}

/** 予算データを解決する */
function resolveBudget(
  storeId: string,
  data: ImportedData,
  settings: AppSettings,
  daysInMonth: number,
) {
  const invConfig = data.settings.get(storeId)
  const budgetData = data.budget.get(storeId)
  const budget = budgetData?.total ?? settings.defaultBudget
  const budgetDaily: ReadonlyMap<number, number> = (() => {
    if (budgetData?.daily && budgetData.daily.size > 0) return budgetData.daily
    if (budget <= 0 || daysInMonth <= 0) return new Map<number, number>()
    const perDay = budget / daysInMonth
    const m = new Map<number, number>()
    for (let d = 1; d <= daysInMonth; d++) m.set(d, perDay)
    return m
  })()
  const gpBudget = invConfig?.grossProfitBudget ?? 0
  return { budget, budgetDaily, gpBudget }
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

  // 値入率
  const { transferPrice, transferCost } = calculateTransferTotals(acc.transferTotals)
  const { averageMarkupRate, coreMarkupRate } = calculateMarkupRates(
    acc,
    transferPrice,
    transferCost,
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
    costInclusionCost: acc.totalCostInclusion,
    openingInventory: invConfig?.openingInventory ?? null,
    inventoryPurchaseCost: inventoryCost,
  })

  // 売変ロス原価
  const { discountLossCost } = calculateDiscountImpact({
    coreSales: totalCoreSales,
    markupRate: coreMarkupRate,
    discountRate,
  })

  // 原価算入率
  const costInclusionRate = safeDivide(acc.totalCostInclusion, acc.totalSales, 0)

  // カテゴリ集計
  finalizeCategoryTotals(acc)

  // 移動詳細
  const transferDetails = buildTransferDetails(acc.transferTotals)

  // 取引先値入率の後計算
  for (const [code, st] of acc.supplierTotals) {
    acc.supplierTotals.set(code, {
      ...st,
      markupRate: safeDivide(st.price - st.cost, st.price, 0),
    })
  }

  // 予算
  const { budget, budgetDaily, gpBudget } = resolveBudget(storeId, data, settings, daysInMonth)

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

  // 粗利予算分析（在庫法粗利 → 推定法マージンの順でフォールバック）
  const effectiveGrossProfit = invResult.grossProfit ?? estResult.margin
  const gpBudgetAnalysis = calculateGrossProfitBudget({
    grossProfit: effectiveGrossProfit,
    grossProfitBudget: gpBudget,
    budgetElapsedRate: budgetAnalysis.budgetElapsedRate,
    elapsedDays: acc.elapsedDays,
    salesDays: acc.salesDays,
    daysInMonth,
  })

  return {
    storeId,
    openingInventory: invConfig?.openingInventory ?? null,
    closingInventory: invConfig?.closingInventory ?? null,
    productInventory: invConfig?.productInventory ?? null,
    costInclusionInventory: invConfig?.costInclusionInventory ?? null,
    inventoryDate: invConfig?.inventoryDate ?? null,
    closingInventoryDay: invConfig?.closingInventoryDay ?? null,
    purchaseMaxDay: acc.purchaseMaxDay,
    hasDiscountData: acc.hasDiscountData,
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
    transactionValue: safeDivide(acc.totalSales, acc.totalCustomers, 0),
    totalDiscount: acc.totalDiscount,
    discountRate,
    discountLossCost,
    discountEntries: acc.totalDiscountEntries,
    averageMarkupRate,
    coreMarkupRate,
    totalCostInclusion: acc.totalCostInclusion,
    costInclusionRate,
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
    budgetElapsedRate: budgetAnalysis.budgetElapsedRate,
    budgetProgressGap: budgetAnalysis.budgetProgressGap,
    budgetVariance: budgetAnalysis.budgetVariance,
    requiredDailySales: budgetAnalysis.requiredDailySales,
    remainingBudget: budgetAnalysis.remainingBudget,
    dailyCumulative: budgetAnalysis.dailyCumulative,
    grossProfitBudgetVariance: gpBudgetAnalysis.grossProfitBudgetVariance,
    grossProfitProgressGap: gpBudgetAnalysis.grossProfitProgressGap,
    requiredDailyGrossProfit: gpBudgetAnalysis.requiredDailyGrossProfit,
    projectedGrossProfit: gpBudgetAnalysis.projectedGrossProfit,
    projectedGPAchievement: gpBudgetAnalysis.projectedGPAchievement,
  }
}
