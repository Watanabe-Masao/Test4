/**
 * monthlyHistoryLogic.ts — 純粋変換関数の単体テスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  currentResultToMonthlyPoint,
  aggregateSummaryRates,
} from '@/application/hooks/monthlyHistoryLogic'
import type { StoreDaySummaryIndex, StoreDaySummary } from '@/domain/models/record'

const makeResult = (
  overrides: Partial<Parameters<typeof currentResultToMonthlyPoint>[2]> = {},
): Parameters<typeof currentResultToMonthlyPoint>[2] => ({
  totalSales: 1_000_000,
  totalCustomers: 5_000,
  invMethodGrossProfit: 300_000,
  invMethodGrossProfitRate: 0.3,
  estMethodMargin: 250_000,
  estMethodMarginRate: 0.25,
  budget: 900_000,
  budgetAchievementRate: 1.11,
  discountRate: 0.05,
  inventoryCost: 400_000,
  deliverySalesCost: 100_000,
  grossSales: 1_000_000,
  costInclusionRate: 0.02,
  averageMarkupRate: 0.35,
  ...overrides,
})

describe('currentResultToMonthlyPoint', () => {
  it('prefers invMethodGrossProfit / invMethodGrossProfitRate when present', () => {
    const result = makeResult()
    const point = currentResultToMonthlyPoint(2025, 3, result, 2)
    expect(point.year).toBe(2025)
    expect(point.month).toBe(3)
    expect(point.storeCount).toBe(2)
    expect(point.grossProfit).toBe(300_000)
    expect(point.grossProfitRate).toBe(0.3)
  })

  it('falls back to estMethodMargin when invMethodGrossProfit is null', () => {
    const result = makeResult({
      invMethodGrossProfit: null,
      invMethodGrossProfitRate: null,
    })
    const point = currentResultToMonthlyPoint(2025, 4, result, 1)
    expect(point.grossProfit).toBe(250_000)
    expect(point.grossProfitRate).toBe(0.25)
  })

  it('computes costRate from (inventoryCost + deliverySalesCost) / grossSales', () => {
    const result = makeResult({
      inventoryCost: 400_000,
      deliverySalesCost: 100_000,
      grossSales: 1_000_000,
    })
    const point = currentResultToMonthlyPoint(2025, 1, result, 3)
    expect(point.costRate).toBeCloseTo(0.5, 10)
  })

  it('returns null costRate when grossSales is 0', () => {
    const result = makeResult({ grossSales: 0 })
    const point = currentResultToMonthlyPoint(2025, 1, result, 1)
    expect(point.costRate).toBeNull()
  })

  it('returns null budget when budget is not positive', () => {
    const point0 = currentResultToMonthlyPoint(2025, 1, makeResult({ budget: 0 }), 1)
    const pointNeg = currentResultToMonthlyPoint(2025, 1, makeResult({ budget: -1 }), 1)
    expect(point0.budget).toBeNull()
    expect(pointNeg.budget).toBeNull()
  })

  it('passes through scalar fields directly', () => {
    const result = makeResult({
      totalSales: 555,
      totalCustomers: 10,
      discountRate: 0.07,
      costInclusionRate: 0.03,
      averageMarkupRate: 0.4,
      budgetAchievementRate: 0.9,
    })
    const point = currentResultToMonthlyPoint(2024, 12, result, 5)
    expect(point.totalSales).toBe(555)
    expect(point.totalCustomers).toBe(10)
    expect(point.discountRate).toBe(0.07)
    expect(point.costInclusionRate).toBe(0.03)
    expect(point.averageMarkupRate).toBe(0.4)
    expect(point.budgetAchievement).toBe(0.9)
  })
})

const makeSummary = (overrides: Partial<StoreDaySummary> = {}): StoreDaySummary => ({
  day: 1,
  sales: 0,
  coreSales: 0,
  grossSales: 0,
  discountAmount: 0,
  discountAbsolute: 0,
  discountEntries: [],
  purchaseCost: 0,
  purchasePrice: 0,
  interStoreInCost: 0,
  interStoreInPrice: 0,
  interStoreOutCost: 0,
  interStoreOutPrice: 0,
  interDeptInCost: 0,
  interDeptInPrice: 0,
  interDeptOutCost: 0,
  interDeptOutPrice: 0,
  flowersCost: 0,
  flowersPrice: 0,
  directProduceCost: 0,
  directProducePrice: 0,
  costInclusionCost: 0,
  customers: 0,
  ...overrides,
})

describe('aggregateSummaryRates', () => {
  it('returns null when totalSales is 0', () => {
    const index: StoreDaySummaryIndex = { A: { 1: makeSummary() } }
    expect(aggregateSummaryRates(index)).toBeNull()
  })

  it('returns null for an empty index', () => {
    expect(aggregateSummaryRates({})).toBeNull()
  })

  it('aggregates sales, customers, and computes grossProfit', () => {
    const index: StoreDaySummaryIndex = {
      A: {
        1: makeSummary({
          sales: 1000,
          grossSales: 1200,
          purchaseCost: 600,
          purchasePrice: 900,
          flowersCost: 100,
          directProduceCost: 50,
          costInclusionCost: 20,
          discountAmount: 30,
          customers: 10,
        }),
      },
    }
    const result = aggregateSummaryRates(index)
    expect(result).not.toBeNull()
    if (!result) return
    // inventoryCost = 600 - 100 - 50 = 450
    // deliverySalesCost = 100 + 50 = 150
    // allCost = 600
    // grossProfit = 1000 - 600 = 400
    expect(result.grossProfit).toBe(400)
    expect(result.totalCustomers).toBe(10)
    // discountRate = 30 / 1000 = 0.03
    expect(result.discountRate).toBeCloseTo(0.03, 10)
    // costRate = 600 / 1200 = 0.5
    expect(result.costRate).toBeCloseTo(0.5, 10)
    // costInclusionRate = 20 / 1000 = 0.02
    expect(result.costInclusionRate).toBeCloseTo(0.02, 10)
    // averageMarkupRate = (900 - 600) / 900 = 0.333...
    expect(result.averageMarkupRate).toBeCloseTo(300 / 900, 10)
    // grossProfitRate = 400 / 1000 = 0.4
    expect(result.grossProfitRate).toBeCloseTo(0.4, 10)
  })

  it('accumulates across multiple stores and days', () => {
    const index: StoreDaySummaryIndex = {
      A: {
        1: makeSummary({ sales: 500, grossSales: 500, customers: 5 }),
        2: makeSummary({ sales: 500, grossSales: 500, customers: 5 }),
      },
      B: {
        1: makeSummary({ sales: 1000, grossSales: 1000, customers: 10 }),
      },
    }
    const result = aggregateSummaryRates(index)
    expect(result).not.toBeNull()
    if (!result) return
    expect(result.totalCustomers).toBe(20)
    // totalSales = 2000, no costs → grossProfit = 2000
    expect(result.grossProfit).toBe(2000)
  })
})
