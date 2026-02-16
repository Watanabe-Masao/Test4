import { describe, it, expect } from 'vitest'
import {
  sumStoreValues,
  sumNullableValues,
  weightedAverageBySales,
  aggregateStores,
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

describe('aggregateStores', () => {
  it('空配列の場合', () => {
    const result = aggregateStores([])
    expect(result.totalSales).toBe(0)
    expect(result.invMethodGrossProfit).toBeNull()
    expect(result.openingInventory).toBeNull()
  })

  it('複数店舗の集計', () => {
    const stores = [
      makeStoreResult({
        storeId: '0001',
        totalSales: 5_000_000,
        totalCoreSales: 4_500_000,
        totalCost: 3_500_000,
        invMethodGrossProfit: 1_200_000,
        invMethodGrossProfitRate: 0.24,
        estMethodCogs: 3_000_000,
        estMethodMargin: 1_500_000,
        totalDiscount: 100_000,
        discountRate: 0.02,
        budget: 6_000_000,
        openingInventory: 1_000_000,
        closingInventory: 800_000,
        elapsedDays: 15,
        salesDays: 15,
        averageDailySales: 333_333,
        projectedSales: 10_000_000,
      }),
      makeStoreResult({
        storeId: '0002',
        totalSales: 3_000_000,
        totalCoreSales: 2_800_000,
        totalCost: 2_200_000,
        invMethodGrossProfit: 700_000,
        invMethodGrossProfitRate: 0.233,
        estMethodCogs: 2_000_000,
        estMethodMargin: 800_000,
        totalDiscount: 50_000,
        discountRate: 0.016,
        budget: 4_000_000,
        openingInventory: 500_000,
        closingInventory: 400_000,
        elapsedDays: 15,
        salesDays: 14,
        averageDailySales: 214_286,
        projectedSales: 6_000_000,
      }),
    ]

    const result = aggregateStores(stores)

    expect(result.totalSales).toBe(8_000_000)
    expect(result.totalCoreSales).toBe(7_300_000)
    expect(result.totalCost).toBe(5_700_000)
    expect(result.invMethodGrossProfit).toBe(1_900_000)
    expect(result.estMethodCogs).toBe(5_000_000)
    expect(result.budget).toBe(10_000_000)
    expect(result.openingInventory).toBe(1_500_000)
    expect(result.closingInventory).toBe(1_200_000)
    expect(result.elapsedDays).toBe(15)
    expect(result.salesDays).toBe(15)

    // 売変率は加重平均
    // (0.02 × 5M + 0.016 × 3M) / 8M = (100K + 48K) / 8M = 0.0185
    expect(result.discountRate).toBeCloseTo(0.0185, 4)
  })
})
