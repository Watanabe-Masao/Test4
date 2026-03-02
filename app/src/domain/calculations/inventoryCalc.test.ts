import { describe, it, expect } from 'vitest'
import { computeEstimatedInventory, computeEstimatedInventoryDetails } from './inventoryCalc'
import type { DailyRecord } from '@/domain/models'

/** 最小限の DailyRecord を生成するヘルパー */
function makeDailyRecord(overrides: {
  day: number
  sales?: number
  flowers?: { cost: number; price: number }
  directProduce?: { cost: number; price: number }
  purchase?: { cost: number; price: number }
  consumable?: { cost: number }
  deliverySales?: { cost: number; price: number }
  interStoreIn?: { cost: number; price: number }
  interStoreOut?: { cost: number; price: number }
  interDepartmentIn?: { cost: number; price: number }
  interDepartmentOut?: { cost: number; price: number }
}): DailyRecord {
  const zero = { cost: 0, price: 0 }
  return {
    day: overrides.day,
    sales: overrides.sales ?? 0,
    purchase: overrides.purchase ?? zero,
    interStoreIn: overrides.interStoreIn ?? zero,
    interStoreOut: overrides.interStoreOut ?? zero,
    interDepartmentIn: overrides.interDepartmentIn ?? zero,
    interDepartmentOut: overrides.interDepartmentOut ?? zero,
    flowers: overrides.flowers ?? zero,
    directProduce: overrides.directProduce ?? zero,
    consumable: { cost: overrides.consumable?.cost ?? 0, items: [] },
    customers: 0,
    discountAmount: 0,
    discountEntries: [],
    supplierBreakdown: new Map(),
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
    // Derived
    coreSales:
      (overrides.sales ?? 0) -
      (overrides.flowers?.price ?? 0) -
      (overrides.directProduce?.price ?? 0),
    grossSales: overrides.sales ?? 0,
    totalCost:
      (overrides.purchase?.cost ?? 0) +
      (overrides.interStoreIn?.cost ?? 0) +
      (overrides.interStoreOut?.cost ?? 0) +
      (overrides.interDepartmentIn?.cost ?? 0) +
      (overrides.interDepartmentOut?.cost ?? 0) +
      (overrides.deliverySales?.cost ?? 0),
    deliverySales: overrides.deliverySales ?? zero,
    discountAbsolute: 0,
  } as unknown as DailyRecord
}

describe('inventoryCalc', () => {
  describe('computeEstimatedInventoryDetails', () => {
    it('should return empty array for zero days', () => {
      const result = computeEstimatedInventoryDetails(new Map(), 0, 1000, null, 0.3, 0.05)
      expect(result).toEqual([])
    })

    it('should compute estimated inventory for days without data', () => {
      const result = computeEstimatedInventoryDetails(new Map(), 3, 1000, null, 0.3, 0.05)
      expect(result).toHaveLength(3)
      // No records → no cost/sales → estimated stays at opening inventory
      for (const row of result) {
        expect(row.estimated).toBe(1000)
        expect(row.sales).toBe(0)
        expect(row.inventoryCost).toBe(0)
        expect(row.estCogs).toBe(0)
      }
    })

    it('should compute inventory with purchase and sales data', () => {
      const daily = new Map<number, DailyRecord>()
      daily.set(
        1,
        makeDailyRecord({
          day: 1,
          sales: 10000,
          purchase: { cost: 7000, price: 10000 },
          deliverySales: { cost: 2000, price: 3000 },
        }),
      )

      const result = computeEstimatedInventoryDetails(daily, 1, 50000, null, 0.25, 0.0)

      expect(result).toHaveLength(1)
      const row = result[0]
      expect(row.day).toBe(1)
      expect(row.sales).toBe(10000)
      // inventoryCost = getDailyTotalCost(rec) - deliverySales.cost
      // getDailyTotalCost = purchase.cost + deliverySales.cost = 7000 + 2000 = 9000
      // inventoryCost = 9000 - 2000 = 7000
      expect(row.inventoryCost).toBe(7000)
      // coreSales = sales - flowers.price - directProduce.price = 10000
      expect(row.coreSales).toBe(10000)
      // grossSales = coreSales / (1 - discountRate) = 10000 / 1 = 10000
      expect(row.grossSales).toBe(10000)
      // estCogs = grossSales * (1 - markupRate) + consumable = 10000 * 0.75 = 7500
      expect(row.estCogs).toBe(7500)
      // estimated = opening + cumInventoryCost - cumEstCogs = 50000 + 7000 - 7500 = 49500
      expect(row.estimated).toBe(49500)
    })

    it('should accumulate over multiple days', () => {
      const daily = new Map<number, DailyRecord>()
      daily.set(
        1,
        makeDailyRecord({
          day: 1,
          sales: 5000,
          purchase: { cost: 4000, price: 5000 },
          deliverySales: { cost: 0, price: 0 },
        }),
      )
      daily.set(
        2,
        makeDailyRecord({
          day: 2,
          sales: 3000,
          purchase: { cost: 2000, price: 3000 },
          deliverySales: { cost: 0, price: 0 },
        }),
      )

      const result = computeEstimatedInventoryDetails(daily, 2, 10000, null, 0.2, 0.0)

      expect(result).toHaveLength(2)
      // Day 1: cumInventoryCost=4000, estCogs=5000*0.8=4000, estimated=10000+4000-4000=10000
      expect(result[0].cumInventoryCost).toBe(4000)
      expect(result[0].cumEstCogs).toBe(4000)
      expect(result[0].estimated).toBe(10000)
      // Day 2: cumInventoryCost=6000, estCogs=4000+2400=6400, estimated=10000+6000-6400=9600
      expect(result[1].cumInventoryCost).toBe(6000)
      expect(result[1].cumEstCogs).toBe(6400)
      expect(result[1].estimated).toBe(9600)
    })

    it('should set actual on last day when closingInventory is provided', () => {
      const result = computeEstimatedInventoryDetails(new Map(), 3, 1000, 900, 0.3, 0.05)
      expect(result[0].actual).toBeNull()
      expect(result[1].actual).toBeNull()
      expect(result[2].actual).toBe(900)
    })

    it('should handle discount rate correctly (divisor = 1 - discountRate)', () => {
      const daily = new Map<number, DailyRecord>()
      daily.set(
        1,
        makeDailyRecord({
          day: 1,
          sales: 10000,
          purchase: { cost: 8000, price: 10000 },
          deliverySales: { cost: 0, price: 0 },
        }),
      )

      const result = computeEstimatedInventoryDetails(daily, 1, 50000, null, 0.3, 0.1)

      const row = result[0]
      // coreSales = 10000 (no flowers/directProduce)
      // grossSales = 10000 / (1 - 0.1) = 10000 / 0.9 ≈ 11111.11
      expect(row.grossSales).toBeCloseTo(11111.11, 1)
      // estCogs = grossSales * (1 - 0.3) = 11111.11 * 0.7 ≈ 7777.78
      expect(row.estCogs).toBeCloseTo(7777.78, 1)
    })

    it('should handle consumable costs', () => {
      const daily = new Map<number, DailyRecord>()
      daily.set(
        1,
        makeDailyRecord({
          day: 1,
          sales: 10000,
          purchase: { cost: 8000, price: 10000 },
          deliverySales: { cost: 0, price: 0 },
          consumable: { cost: 500 },
        }),
      )

      const result = computeEstimatedInventoryDetails(daily, 1, 50000, null, 0.3, 0.0)

      const row = result[0]
      expect(row.consumableCost).toBe(500)
      // estCogs = grossSales * (1 - markupRate) + consumableCost = 10000 * 0.7 + 500 = 7500
      expect(row.estCogs).toBe(7500)
    })

    it('should subtract flowers/directProduce from coreSales', () => {
      const daily = new Map<number, DailyRecord>()
      daily.set(
        1,
        makeDailyRecord({
          day: 1,
          sales: 10000,
          flowers: { cost: 500, price: 1000 },
          directProduce: { cost: 300, price: 500 },
          purchase: { cost: 6000, price: 10000 },
          deliverySales: { cost: 800, price: 1500 },
        }),
      )

      const result = computeEstimatedInventoryDetails(daily, 1, 50000, null, 0.3, 0.0)

      const row = result[0]
      // coreSales = sales - flowers.price - directProduce.price = 10000 - 1000 - 500 = 8500
      expect(row.coreSales).toBe(8500)
    })
  })

  describe('computeEstimatedInventory', () => {
    it('should return simplified points (day, estimated, actual)', () => {
      const result = computeEstimatedInventory(new Map(), 3, 1000, 800, 0.3, 0.05)
      expect(result).toHaveLength(3)
      for (const point of result) {
        expect(point).toHaveProperty('day')
        expect(point).toHaveProperty('estimated')
        expect(point).toHaveProperty('actual')
        // Should not have detail fields
        expect(point).not.toHaveProperty('sales')
        expect(point).not.toHaveProperty('inventoryCost')
      }
      expect(result[2].actual).toBe(800)
    })

    it('should match details function output', () => {
      const daily = new Map<number, DailyRecord>()
      daily.set(
        1,
        makeDailyRecord({
          day: 1,
          sales: 5000,
          purchase: { cost: 3000, price: 5000 },
          deliverySales: { cost: 0, price: 0 },
        }),
      )

      const points = computeEstimatedInventory(daily, 2, 10000, null, 0.25, 0.0)
      const details = computeEstimatedInventoryDetails(daily, 2, 10000, null, 0.25, 0.0)

      for (let i = 0; i < points.length; i++) {
        expect(points[i].day).toBe(details[i].day)
        expect(points[i].estimated).toBe(details[i].estimated)
        expect(points[i].actual).toBe(details[i].actual)
      }
    })
  })
})
