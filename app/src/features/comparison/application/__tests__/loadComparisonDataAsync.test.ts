import { describe, it, expect } from 'vitest'
import {
  comparisonResultToMonthlyData,
  getAdjacentFlowersRecords,
  type ComparisonLoadResult,
} from '../loadComparisonDataAsync'
import type {
  ClassifiedSalesRecord,
  CategoryTimeSalesRecord,
  SpecialSalesDayEntry,
} from '@/domain/models/record'

const csRow = (storeId: string, day: number): ClassifiedSalesRecord =>
  ({ storeId, day }) as unknown as ClassifiedSalesRecord

const ctsRow = (storeId: string, day: number): CategoryTimeSalesRecord =>
  ({ storeId, day }) as unknown as CategoryTimeSalesRecord

const flowerRow = (storeId: string, day: number): SpecialSalesDayEntry =>
  ({ storeId, day }) as unknown as SpecialSalesDayEntry

const makeResult = (overrides: Partial<ComparisonLoadResult> = {}): ComparisonLoadResult => ({
  prevYearClassifiedSales: { records: [] },
  prevYearCategoryTimeSales: { records: [] },
  prevYearFlowers: { records: [] },
  prevYearPurchase: { records: [] },
  prevYearDirectProduce: { records: [] },
  prevYearInterStoreIn: { records: [] },
  prevYearInterStoreOut: { records: [] },
  adjacentFlowersRecords: [],
  ...overrides,
})

describe('comparisonResultToMonthlyData', () => {
  it('returns MonthlyData with classifiedSales / categoryTimeSales / flowers wired from result', () => {
    const result = makeResult({
      prevYearClassifiedSales: { records: [csRow('S1', 1), csRow('S1', 2)] },
      prevYearCategoryTimeSales: { records: [ctsRow('S1', 1)] },
      prevYearFlowers: { records: [flowerRow('S1', 3)] },
    })
    const monthly = comparisonResultToMonthlyData(result, 2025, 3)
    expect(monthly.classifiedSales.records).toHaveLength(2)
    expect(monthly.categoryTimeSales.records).toHaveLength(1)
    expect(monthly.flowers.records).toHaveLength(1)
  })

  it('preserves the same record arrays (reference equality)', () => {
    const cs = { records: [csRow('S1', 1)] }
    const cts = { records: [ctsRow('S1', 1)] }
    const flowers = { records: [flowerRow('S1', 1)] }
    const result = makeResult({
      prevYearClassifiedSales: cs,
      prevYearCategoryTimeSales: cts,
      prevYearFlowers: flowers,
    })
    const monthly = comparisonResultToMonthlyData(result, 2025, 3)
    expect(monthly.classifiedSales).toBe(cs)
    expect(monthly.categoryTimeSales).toBe(cts)
    expect(monthly.flowers).toBe(flowers)
  })

  it('initializes other slices as empty (purchase / interStoreIn etc.)', () => {
    const monthly = comparisonResultToMonthlyData(makeResult(), 2025, 3)
    expect(monthly.purchase.records).toEqual([])
    expect(monthly.interStoreIn.records).toEqual([])
    expect(monthly.interStoreOut.records).toEqual([])
    expect(monthly.directProduce.records).toEqual([])
    expect(monthly.consumables.records).toEqual([])
    expect(monthly.departmentKpi.records).toEqual([])
    expect(monthly.stores.size).toBe(0)
    expect(monthly.suppliers.size).toBe(0)
    expect(monthly.budget.size).toBe(0)
    expect(monthly.settings.size).toBe(0)
  })

  it('produces an origin marker derived from the supplied year/month', () => {
    const monthly = comparisonResultToMonthlyData(makeResult(), 2025, 12)
    expect(monthly.origin.year).toBe(2025)
    expect(monthly.origin.month).toBe(12)
  })
})

describe('getAdjacentFlowersRecords', () => {
  it('returns the adjacentFlowersRecords from the result', () => {
    const adj = [flowerRow('S1', 28), flowerRow('S2', 1)]
    const result = makeResult({ adjacentFlowersRecords: adj })
    expect(getAdjacentFlowersRecords(result)).toBe(adj)
  })

  it('returns an empty array when no adjacent records are present', () => {
    expect(getAdjacentFlowersRecords(makeResult())).toEqual([])
  })
})
