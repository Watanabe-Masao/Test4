import type {
  AppSettings,
  CostPricePair,
  CategoryType,
  StoreResult,
  TransferDetails,
  ImportedData,
  InventoryConfig,
  BudgetData,
} from '@/domain/models'
import { ZERO_COST_PRICE_PAIR, addCostPricePairs } from '@/domain/models'
// bridge 経由: 将来の dual-run compare を観測可能にする
import {
  calculateInvMethod,
  calculateCoreSales,
  calculateDiscountRate,
  calculateEstMethodWithStatus,
  calculateDiscountImpactWithStatus,
  calculateMarkupRates,
  calculateTransferTotals as calcTransferTotals,
  calculateInventoryCost,
} from '@/application/services/grossProfitBridge'
import {
  calculateBudgetAnalysis,
  calculateGrossProfitBudget,
} from '@/application/services/budgetAnalysisBridge'
import {
  safeDivide,
  isSettingsForTargetMonth,
  calculateMarkupRate,
  calculateTransactionValue,
  calculateGrossProfitRate,
} from '@/domain/calculations/utils'
import type { MonthlyAccumulator } from './types'

function addToCategory(
  map: Map<CategoryType, CostPricePair>,
  category: CategoryType,
  pair: CostPricePair,
): void {
  const existing = map.get(category) ?? ZERO_COST_PRICE_PAIR
  map.set(category, addCostPricePairs(existing, pair))
}

/** MonthlyAccumulator の transferTotals → TransferTotalsInput に変換して domain 関数を呼ぶ */
function computeTransferTotals(transferTotals: MonthlyAccumulator['transferTotals']) {
  return calcTransferTotals({
    interStoreInPrice: transferTotals.interStoreIn.price,
    interStoreInCost: transferTotals.interStoreIn.cost,
    interStoreOutPrice: transferTotals.interStoreOut.price,
    interStoreOutCost: transferTotals.interStoreOut.cost,
    interDepartmentInPrice: transferTotals.interDepartmentIn.price,
    interDepartmentInCost: transferTotals.interDepartmentIn.cost,
    interDepartmentOutPrice: transferTotals.interDepartmentOut.price,
    interDepartmentOutCost: transferTotals.interDepartmentOut.cost,
  })
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
  const { transferPrice, transferCost } = computeTransferTotals(transferTotals)
  return {
    ...transferTotals,
    netTransfer: { cost: transferCost, price: transferPrice },
  }
}

/** 予算データを解決する（invConfig は月フィルタ適用済みを前提とする） */
function resolveBudget(
  invConfig: InventoryConfig | undefined,
  budgetData: BudgetData | undefined,
  defaultBudget: number,
  daysInMonth: number,
) {
  const budget = budgetData?.total ?? defaultBudget
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
  const rawInvConfig = data.settings.get(storeId)

  // 設定データの月が対象月と一致するか判定（在庫・粗利予算すべてに適用）
  const settingsMatchesMonth = isSettingsForTargetMonth(
    rawInvConfig?.inventoryDate ?? null,
    settings.targetYear,
    settings.targetMonth,
  )
  // 月不一致の場合、在庫データを無効化（前月の在庫値を当月計算に使わない）
  const invConfig = settingsMatchesMonth ? rawInvConfig : undefined

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
  const inventoryCost = calculateInventoryCost(acc.totalCost, deliverySalesCost)

  // 粗売上（月間）
  const grossSales = acc.totalSales + acc.totalDiscount

  // 売変率
  const discountRate = calculateDiscountRate(acc.totalSales, acc.totalDiscount)

  // 値入率
  const { transferPrice, transferCost } = computeTransferTotals(acc.transferTotals)
  const { averageMarkupRate, coreMarkupRate } = calculateMarkupRates({
    purchasePrice: acc.totalPurchasePrice,
    purchaseCost: acc.totalPurchaseCost,
    deliveryPrice: acc.totalFlowerPrice + acc.totalDirectProducePrice,
    deliveryCost: acc.totalFlowerCost + acc.totalDirectProduceCost,
    transferPrice,
    transferCost,
    defaultMarkupRate: settings.defaultMarkupRate,
  })

  // 【在庫法】
  const invResult = calculateInvMethod({
    openingInventory: invConfig?.openingInventory ?? null,
    closingInventory: invConfig?.closingInventory ?? null,
    totalPurchaseCost: acc.totalCost,
    totalSales: acc.totalSales,
  })

  // 【推定法】（CalculationResult 版 — status/warnings を伝搬）
  const estStatusResult = calculateEstMethodWithStatus({
    coreSales: totalCoreSales,
    discountRate,
    markupRate: coreMarkupRate,
    costInclusionCost: acc.totalCostInclusion,
    openingInventory: invConfig?.openingInventory ?? null,
    inventoryPurchaseCost: inventoryCost,
  })
  const estResult = estStatusResult.value ?? {
    grossSales: 0,
    cogs: 0,
    margin: 0,
    marginRate: 0,
    closingInventory: null,
  }

  // 売変ロス原価（CalculationResult 版）
  const discountImpactStatusResult = calculateDiscountImpactWithStatus({
    coreSales: totalCoreSales,
    markupRate: coreMarkupRate,
    discountRate,
  })
  const discountLossCost = discountImpactStatusResult.value?.discountLossCost ?? 0

  // 計算警告の収集
  const metricWarnings = new Map<string, readonly string[]>()
  if (estStatusResult.warnings.length > 0) {
    metricWarnings.set('estMethodCogs', estStatusResult.warnings)
    metricWarnings.set('estMethodMargin', estStatusResult.warnings)
    metricWarnings.set('estMethodMarginRate', estStatusResult.warnings)
    metricWarnings.set('estMethodClosingInventory', estStatusResult.warnings)
  }
  if (discountImpactStatusResult.warnings.length > 0) {
    metricWarnings.set('discountLossCost', discountImpactStatusResult.warnings)
  }

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
      markupRate: calculateMarkupRate(st.price - st.cost, st.price),
    })
  }

  // 予算
  const { budget, budgetDaily, gpBudget } = resolveBudget(
    invConfig,
    data.budget.get(storeId),
    settings.defaultBudget,
    daysInMonth,
  )

  // 予算分析（domain 関数は Record ベース — Map↔Record 変換）
  const salesDailyRecord: Record<number, number> = {}
  for (const [d, rec] of acc.daily) {
    salesDailyRecord[d] = rec.sales
  }
  const budgetDailyRecord: Record<number, number> = {}
  for (const [d, v] of budgetDaily) {
    budgetDailyRecord[d] = v
  }
  const budgetAnalysis = calculateBudgetAnalysis({
    totalSales: acc.totalSales,
    budget,
    budgetDaily: budgetDailyRecord,
    salesDaily: salesDailyRecord,
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
    inventoryDate: rawInvConfig?.inventoryDate ?? null,
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
    transactionValue: calculateTransactionValue(acc.totalSales, acc.totalCustomers),
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
    grossProfitRateBudget: calculateGrossProfitRate(gpBudget, budget),
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
    dailyCumulative: new Map(
      Object.entries(budgetAnalysis.dailyCumulative).map(([k, v]) => [Number(k), v]),
    ),
    grossProfitBudgetVariance: gpBudgetAnalysis.grossProfitBudgetVariance,
    grossProfitProgressGap: gpBudgetAnalysis.grossProfitProgressGap,
    requiredDailyGrossProfit: gpBudgetAnalysis.requiredDailyGrossProfit,
    projectedGrossProfit: gpBudgetAnalysis.projectedGrossProfit,
    projectedGPAchievement: gpBudgetAnalysis.projectedGPAchievement,
    metricWarnings,
  }
}
