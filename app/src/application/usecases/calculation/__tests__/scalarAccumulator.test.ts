/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  addToCategory,
  mergeDailyRecord,
  accumulateScalars,
} from '@/application/usecases/calculation/scalarAccumulator'
import type { CostPricePair, DailyRecord, CategoryType } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'

function dr(partial: Partial<DailyRecord>): DailyRecord {
  return {
    day: 1,
    sales: 0,
    coreSales: 0,
    grossSales: 0,
    totalCost: 0,
    purchase: { cost: 0, price: 0 },
    deliverySales: { cost: 0, price: 0 },
    interStoreIn: { cost: 0, price: 0 },
    interStoreOut: { cost: 0, price: 0 },
    interDepartmentIn: { cost: 0, price: 0 },
    interDepartmentOut: { cost: 0, price: 0 },
    flowers: { cost: 0, price: 0 },
    directProduce: { cost: 0, price: 0 },
    costInclusion: { cost: 0, items: [] },
    customers: 0,
    discountAmount: 0,
    discountAbsolute: 0,
    discountEntries: [],
    supplierBreakdown: new Map(),
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
    ...partial,
  } as unknown as DailyRecord
}

function sr(partial: Partial<StoreResult>): StoreResult {
  return {
    totalSales: 0,
    totalCoreSales: 0,
    deliverySalesPrice: 0,
    flowerSalesPrice: 0,
    directProduceSalesPrice: 0,
    grossSales: 0,
    totalCost: 0,
    inventoryCost: 0,
    deliverySalesCost: 0,
    totalDiscount: 0,
    discountEntries: [],
    totalCostInclusion: 0,
    totalCustomers: 0,
    budget: 0,
    grossProfitBudget: 0,
    elapsedDays: 0,
    salesDays: 0,
    purchaseMaxDay: 0,
    hasDiscountData: false,
    openingInventory: null,
    closingInventory: null,
    estMethodCogs: 0,
    estMethodMargin: 0,
    estMethodClosingInventory: null,
    ...partial,
  } as unknown as StoreResult
}

describe('scalarAccumulator', () => {
  describe('addToCategory', () => {
    it('adds a new category entry', () => {
      const map = new Map<CategoryType, CostPricePair>()
      addToCategory(map, 'flowers' as CategoryType, { cost: 10, price: 20 })
      expect(map.get('flowers' as CategoryType)).toEqual({ cost: 10, price: 20 })
    })

    it('accumulates into existing entry', () => {
      const map = new Map<CategoryType, CostPricePair>()
      addToCategory(map, 'flowers' as CategoryType, { cost: 10, price: 20 })
      addToCategory(map, 'flowers' as CategoryType, { cost: 5, price: 8 })
      expect(map.get('flowers' as CategoryType)).toEqual({ cost: 15, price: 28 })
    })
  })

  describe('mergeDailyRecord', () => {
    it('sums scalar fields and cost/price pairs', () => {
      const a = dr({
        day: 3,
        sales: 100,
        coreSales: 90,
        grossSales: 110,
        totalCost: 50,
        purchase: { cost: 30, price: 40 },
        customers: 5,
        discountAmount: 10,
        discountAbsolute: 12,
      })
      const b = dr({
        day: 3,
        sales: 200,
        coreSales: 180,
        grossSales: 220,
        totalCost: 100,
        purchase: { cost: 60, price: 80 },
        customers: 10,
        discountAmount: 20,
        discountAbsolute: 22,
      })
      const merged = mergeDailyRecord(a, b)
      expect(merged.day).toBe(3)
      expect(merged.sales).toBe(300)
      expect(merged.coreSales).toBe(270)
      expect(merged.grossSales).toBe(330)
      expect(merged.totalCost).toBe(150)
      expect(merged.purchase).toEqual({ cost: 90, price: 120 })
      expect(merged.customers).toBe(15)
      expect(merged.discountAmount).toBe(30)
      expect(merged.discountAbsolute).toBe(34)
    })

    it('merges supplier breakdowns by code', () => {
      const a = dr({
        supplierBreakdown: new Map([['S1', { cost: 100, price: 150 }]]),
      })
      const b = dr({
        supplierBreakdown: new Map([
          ['S1', { cost: 50, price: 80 }],
          ['S2', { cost: 25, price: 40 }],
        ]),
      })
      const merged = mergeDailyRecord(a, b)
      expect(merged.supplierBreakdown.get('S1')).toEqual({ cost: 150, price: 230 })
      expect(merged.supplierBreakdown.get('S2')).toEqual({ cost: 25, price: 40 })
    })

    it('treats null customers as zero', () => {
      const a = dr({ customers: null as unknown as number })
      const b = dr({ customers: 5 })
      const merged = mergeDailyRecord(a, b)
      expect(merged.customers).toBe(5)
    })
  })

  describe('accumulateScalars', () => {
    it('returns zero accumulator for empty input', () => {
      const acc = accumulateScalars([])
      expect(acc.totalSales).toBe(0)
      expect(acc.totalCustomers).toBe(0)
      expect(acc.hasOpening).toBe(false)
      expect(acc.hasClosing).toBe(false)
      expect(acc.hasDiscountData).toBe(false)
    })

    it('sums scalar fields across stores', () => {
      const results = [
        sr({ totalSales: 1000, totalCost: 500, totalCustomers: 100, budget: 1200 }),
        sr({ totalSales: 2000, totalCost: 1000, totalCustomers: 200, budget: 2500 }),
      ]
      const acc = accumulateScalars(results)
      expect(acc.totalSales).toBe(3000)
      expect(acc.totalCost).toBe(1500)
      expect(acc.totalCustomers).toBe(300)
      expect(acc.budget).toBe(3700)
    })

    it('uses max (not sum) for elapsed/sales/purchaseMax days', () => {
      const results = [
        sr({ elapsedDays: 5, salesDays: 5, purchaseMaxDay: 10 }),
        sr({ elapsedDays: 10, salesDays: 8, purchaseMaxDay: 15 }),
        sr({ elapsedDays: 7, salesDays: 12, purchaseMaxDay: 12 }),
      ]
      const acc = accumulateScalars(results)
      expect(acc.elapsedDays).toBe(10)
      expect(acc.salesDays).toBe(12)
      expect(acc.purchaseMaxDay).toBe(15)
    })

    it('tracks opening/closing inventory when provided', () => {
      const results = [
        sr({ openingInventory: 500, closingInventory: 600 }),
        sr({ openingInventory: 300, closingInventory: 400 }),
      ]
      const acc = accumulateScalars(results)
      expect(acc.openInv).toBe(800)
      expect(acc.closeInv).toBe(1000)
      expect(acc.hasOpening).toBe(true)
      expect(acc.hasClosing).toBe(true)
    })

    it('does not flag hasOpening when inventory is null', () => {
      const results = [sr({ openingInventory: null, closingInventory: null })]
      const acc = accumulateScalars(results)
      expect(acc.hasOpening).toBe(false)
      expect(acc.hasClosing).toBe(false)
      expect(acc.openInv).toBe(0)
    })

    it('flags hasDiscountData if any store has it', () => {
      const results = [sr({ hasDiscountData: false }), sr({ hasDiscountData: true })]
      const acc = accumulateScalars(results)
      expect(acc.hasDiscountData).toBe(true)
    })
  })
})
