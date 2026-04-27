/**
 * コレクション集約ロジック（純粋関数）
 *
 * aggregateResults から抽出。日別・カテゴリ・取引先・予算・移動の集約と
 * 値入率・在庫法・推定法・予算分析の計算を担う。
 *
 * @responsibility R:unclassified
 */
import type {
  CostPricePair,
  CategoryType,
  SupplierTotal,
  DailyRecord,
  TransferDetails,
} from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import { ZERO_COST_PRICE_PAIR, addCostPricePairs } from '@/domain/models/record'

const zeroPair = ZERO_COST_PRICE_PAIR

import {
  safeDivide,
  calculateMarkupRate,
  calculateGrossProfitRate,
  calculateAchievementRate,
} from '@/domain/calculations/utils'
// bridge 経由: 将来の dual-run compare を観測可能にする
import { calculateMarkupRates as calcMarkupRatesDomain } from '@/application/services/grossProfitBridge'
import { calculateTransferTotals as calcTransferTotalsDomain } from '@/application/services/grossProfitBridge'
import { addToCategory, mergeDailyRecord } from './scalarAccumulator'

/** 日別・カテゴリ・取引先・予算・移動を集約する */
export function aggregateCollections(results: readonly StoreResult[]) {
  const aggDaily = new Map<number, DailyRecord>()
  const aggCategory = new Map<CategoryType, CostPricePair>()
  const aggSupplier = new Map<string, SupplierTotal>()
  const aggBudgetDaily = new Map<number, number>()
  const aggTransfer = {
    interStoreIn: { ...zeroPair },
    interStoreOut: { ...zeroPair },
    interDepartmentIn: { ...zeroPair },
    interDepartmentOut: { ...zeroPair },
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
          markupRate: calculateMarkupRate(
            ex.price + st.price - ex.cost - st.cost,
            ex.price + st.price,
          ),
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
export function calculateMarkupRates(
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
  const { transferPrice, transferCost } = calcTransferTotalsDomain({
    interStoreInPrice: aggTransfer.interStoreIn.price,
    interStoreInCost: aggTransfer.interStoreIn.cost,
    interStoreOutPrice: aggTransfer.interStoreOut.price,
    interStoreOutCost: aggTransfer.interStoreOut.cost,
    interDepartmentInPrice: aggTransfer.interDepartmentIn.price,
    interDepartmentInCost: aggTransfer.interDepartmentIn.cost,
    interDepartmentOutPrice: aggTransfer.interDepartmentOut.price,
    interDepartmentOutCost: aggTransfer.interDepartmentOut.cost,
  })
  const flowerCat = aggCategory.get('flowers') ?? zeroPair
  const directProduceCat = aggCategory.get('directProduce') ?? zeroPair

  return calcMarkupRatesDomain({
    purchasePrice: totalPurchasePrice,
    purchaseCost: totalPurchaseCost,
    deliveryPrice: flowerCat.price + directProduceCat.price,
    deliveryCost: flowerCat.cost + directProduceCat.cost,
    transferPrice,
    transferCost,
    defaultMarkupRate: 0,
  })
}

/** 在庫法の集約結果を計算する */
export function calculateAggregateInventory(
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
    invMethodGrossProfitRate = calculateGrossProfitRate(invMethodGrossProfit, totalSales)
  }
  return { invMethodCogs, invMethodGrossProfit, invMethodGrossProfitRate }
}

/** 推定法の集約結果を計算する */
export function calculateAggregateEstMethod(
  results: readonly StoreResult[],
  totalCoreSales: number,
) {
  const estMethodCogs = results.reduce((s, r) => s + r.estMethodCogs, 0)
  const estMethodMargin = results.reduce((s, r) => s + r.estMethodMargin, 0)
  const estMethodMarginRate = calculateGrossProfitRate(estMethodMargin, totalCoreSales)
  const hasEstClosing = results.some((r) => r.estMethodClosingInventory != null)
  const estMethodClosingInventory = hasEstClosing
    ? results.reduce((s, r) => s + (r.estMethodClosingInventory ?? 0), 0)
    : null
  return { estMethodCogs, estMethodMargin, estMethodMarginRate, estMethodClosingInventory }
}

/** 予算分析の集約結果を計算する */
export function calculateAggregateBudget(
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
  const projectedAchievement = calculateAchievementRate(projectedSales, budget)
  const budgetAchievementRate = calculateAchievementRate(totalSales, budget)

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
export function buildTransferDetails(aggTransfer: {
  interStoreIn: CostPricePair
  interStoreOut: CostPricePair
  interDepartmentIn: CostPricePair
  interDepartmentOut: CostPricePair
}): TransferDetails {
  const { transferPrice, transferCost } = calcTransferTotalsDomain({
    interStoreInPrice: aggTransfer.interStoreIn.price,
    interStoreInCost: aggTransfer.interStoreIn.cost,
    interStoreOutPrice: aggTransfer.interStoreOut.price,
    interStoreOutCost: aggTransfer.interStoreOut.cost,
    interDepartmentInPrice: aggTransfer.interDepartmentIn.price,
    interDepartmentInCost: aggTransfer.interDepartmentIn.cost,
    interDepartmentOutPrice: aggTransfer.interDepartmentOut.price,
    interDepartmentOutCost: aggTransfer.interDepartmentOut.cost,
  })
  return {
    ...aggTransfer,
    netTransfer: { cost: transferCost, price: transferPrice },
  }
}
