import { describe, it, expect } from 'vitest'
import {
  sumStoreValues,
  sumNullableValues,
  weightedAverageBySales,
} from './aggregation'
import type { StoreResult } from '../models'

function makeStoreResult(overrides: Partial<StoreResult>): StoreResult {
  return {
    storeId: 'test',
    openingInventory: null,
    closingInventory: null,
    totalSales: 0,
    totalCoreSales: 0,
    deliverySalesPrice: 0,
    flowerSalesPrice: 0,
    directProduceSalesPrice: 0,
    grossSales: 0,
    totalCost: 0,
    inventoryCost: 0,
    deliverySalesCost: 0,
    invMethodCogs: null,
    invMethodGrossProfit: null,
    invMethodGrossProfitRate: null,
    estMethodCogs: 0,
    estMethodMargin: 0,
    estMethodMarginRate: 0,
    estMethodClosingInventory: null,
    totalDiscount: 0,
    discountRate: 0,
    discountLossCost: 0,
    averageMarkupRate: 0,
    coreMarkupRate: 0,
    totalCustomers: 0,
    averageCustomersPerDay: 0,
    totalConsumable: 0,
    consumableRate: 0,
    budget: 0,
    grossProfitBudget: 0,
    grossProfitRateBudget: 0,
    budgetDaily: new Map(),
    daily: new Map(),
    categoryTotals: new Map(),
    supplierTotals: new Map(),
    transferDetails: {
      interStoreIn: { cost: 0, price: 0 },
      interStoreOut: { cost: 0, price: 0 },
      interDepartmentIn: { cost: 0, price: 0 },
      interDepartmentOut: { cost: 0, price: 0 },
      netTransfer: { cost: 0, price: 0 },
    },
    elapsedDays: 0,
    salesDays: 0,
    averageDailySales: 0,
    projectedSales: 0,
    projectedAchievement: 0,
    budgetAchievementRate: 0,
    budgetProgressRate: 0,
    budgetElapsedRate: 0,
    remainingBudget: 0,
    dailyCumulative: new Map(),
    ...overrides,
  }
}

describe('sumStoreValues', () => {
  it('複数店舗の売上合計', () => {
    const stores = [
      makeStoreResult({ totalSales: 1_000_000 }),
      makeStoreResult({ totalSales: 2_000_000 }),
      makeStoreResult({ totalSales: 3_000_000 }),
    ]
    expect(sumStoreValues(stores, (s) => s.totalSales)).toBe(6_000_000)
  })

  it('空配列の場合', () => {
    expect(sumStoreValues([], (s) => s.totalSales)).toBe(0)
  })
})

describe('sumNullableValues', () => {
  it('全てnullの場合はnull', () => {
    const stores = [
      makeStoreResult({ invMethodGrossProfit: null }),
      makeStoreResult({ invMethodGrossProfit: null }),
    ]
    expect(sumNullableValues(stores, (s) => s.invMethodGrossProfit)).toBeNull()
  })

  it('一部nullの場合はnull以外を合計', () => {
    const stores = [
      makeStoreResult({ invMethodGrossProfit: 100_000 }),
      makeStoreResult({ invMethodGrossProfit: null }),
      makeStoreResult({ invMethodGrossProfit: 200_000 }),
    ]
    expect(sumNullableValues(stores, (s) => s.invMethodGrossProfit)).toBe(300_000)
  })
})

describe('weightedAverageBySales', () => {
  it('売上高加重平均', () => {
    const stores = [
      makeStoreResult({ discountRate: 0.02, totalSales: 3_000_000 }),
      makeStoreResult({ discountRate: 0.04, totalSales: 1_000_000 }),
    ]
    // 加重平均 = (0.02 × 3M + 0.04 × 1M) / (3M + 1M) = (60K + 40K) / 4M = 0.025
    const avg = weightedAverageBySales(
      stores,
      (s) => s.discountRate,
      (s) => s.totalSales,
    )
    expect(avg).toBeCloseTo(0.025, 6)
  })

  it('売上0の店舗は除外', () => {
    const stores = [
      makeStoreResult({ discountRate: 0.1, totalSales: 0 }),
      makeStoreResult({ discountRate: 0.02, totalSales: 1_000_000 }),
    ]
    const avg = weightedAverageBySales(
      stores,
      (s) => s.discountRate,
      (s) => s.totalSales,
    )
    expect(avg).toBe(0.02)
  })

  it('全て売上0の場合は0', () => {
    const stores = [
      makeStoreResult({ discountRate: 0.1, totalSales: 0 }),
      makeStoreResult({ discountRate: 0.2, totalSales: 0 }),
    ]
    const avg = weightedAverageBySales(
      stores,
      (s) => s.discountRate,
      (s) => s.totalSales,
    )
    expect(avg).toBe(0)
  })
})
