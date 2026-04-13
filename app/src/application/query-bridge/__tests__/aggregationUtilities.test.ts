import { describe, it, expect } from 'vitest'
import {
  hourlyAggregate,
  aggregatePeriodRates,
  rankBy,
  yoyMerge,
  categoryShare,
} from '@/application/query-bridge/aggregationUtilities'

describe('aggregationUtilities', () => {
  describe('hourlyAggregate', () => {
    it('sums amounts and quantities per hour', () => {
      const records = [
        {
          timeSlots: [
            { hour: 10, amount: 1000, quantity: 5 },
            { hour: 11, amount: 2000, quantity: 10 },
          ],
        },
        {
          timeSlots: [
            { hour: 10, amount: 500, quantity: 3 },
            { hour: 12, amount: 3000, quantity: 15 },
          ],
        },
      ]
      const result = hourlyAggregate(records)
      expect(result).toHaveLength(3)
      const h10 = result.find((r) => r.hour === 10)!
      expect(h10.totalAmount).toBe(1500)
      expect(h10.totalQuantity).toBe(8)
      const h11 = result.find((r) => r.hour === 11)!
      expect(h11.totalAmount).toBe(2000)
    })

    it('returns result sorted by hour', () => {
      const records = [
        {
          timeSlots: [
            { hour: 15, amount: 100, quantity: 1 },
            { hour: 9, amount: 200, quantity: 2 },
            { hour: 12, amount: 300, quantity: 3 },
          ],
        },
      ]
      const result = hourlyAggregate(records)
      expect(result.map((r) => r.hour)).toEqual([9, 12, 15])
    })

    it('returns empty array for empty input', () => {
      expect(hourlyAggregate([])).toEqual([])
    })
  })

  describe('aggregatePeriodRates', () => {
    it('sums all numeric fields and computes discount rate', () => {
      const records = [
        {
          sales: 1000,
          purchaseCost: 500,
          discountAbsolute: 50,
          flowersCost: 20,
          directProduceCost: 15,
          costInclusionCost: 10,
          customers: 50,
        },
        {
          sales: 2000,
          purchaseCost: 1000,
          discountAbsolute: 100,
          flowersCost: 40,
          directProduceCost: 30,
          costInclusionCost: 20,
          customers: 100,
        },
      ]
      const result = aggregatePeriodRates(records)
      expect(result.totalSales).toBe(3000)
      expect(result.totalPurchaseCost).toBe(1500)
      expect(result.totalDiscountAbsolute).toBe(150)
      expect(result.totalCustomers).toBe(150)
      // 150 / 3000
      expect(result.discountRate).toBeCloseTo(0.05, 5)
    })

    it('returns zero rate when totalSales is zero', () => {
      const result = aggregatePeriodRates([
        {
          sales: 0,
          purchaseCost: 0,
          discountAbsolute: 50,
          flowersCost: 0,
          directProduceCost: 0,
          costInclusionCost: 0,
          customers: 0,
        },
      ])
      expect(result.discountRate).toBe(0)
    })
  })

  describe('rankBy', () => {
    it('ranks items in descending order by value', () => {
      const items = [
        { name: 'a', score: 10 },
        { name: 'b', score: 30 },
        { name: 'c', score: 20 },
      ]
      const ranked = rankBy(items, (i) => i.score)
      expect(ranked.map((r) => r.name)).toEqual(['b', 'c', 'a'])
      expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3])
    })

    it('assigns same rank to ties (1,1,3 style)', () => {
      const items = [
        { name: 'a', score: 10 },
        { name: 'b', score: 10 },
        { name: 'c', score: 5 },
      ]
      const ranked = rankBy(items, (i) => i.score)
      expect(ranked[0].rank).toBe(1)
      expect(ranked[1].rank).toBe(1)
      expect(ranked[2].rank).toBe(3)
    })

    it('handles empty array', () => {
      expect(rankBy([], () => 0)).toEqual([])
    })
  })

  describe('yoyMerge', () => {
    it('merges by key with current/previous pairs', () => {
      const current = [
        { code: 'A', sales: 100 },
        { code: 'B', sales: 200 },
      ]
      const previous = [
        { code: 'A', sales: 90 },
        { code: 'C', sales: 150 },
      ]
      const result = yoyMerge(current, previous, (i) => i.code)
      expect(result).toHaveLength(3)
      const a = result.find((r) => r.key === 'A')!
      expect(a.current?.sales).toBe(100)
      expect(a.previous?.sales).toBe(90)
      const b = result.find((r) => r.key === 'B')!
      expect(b.current?.sales).toBe(200)
      expect(b.previous).toBeNull()
      const c = result.find((r) => r.key === 'C')!
      expect(c.current).toBeNull()
      expect(c.previous?.sales).toBe(150)
    })

    it('returns empty array when both inputs empty', () => {
      expect(yoyMerge([], [], (i) => String(i))).toEqual([])
    })

    it('sorts result by key alphabetically', () => {
      const result = yoyMerge([{ k: 'z' }, { k: 'a' }, { k: 'm' }], [], (i) => i.k)
      expect(result.map((r) => r.key)).toEqual(['a', 'm', 'z'])
    })
  })

  describe('categoryShare', () => {
    it('computes share as amount divided by total', () => {
      const records = [
        { code: 'A', name: 'Alpha', amount: 250 },
        { code: 'B', name: 'Beta', amount: 750 },
      ]
      const result = categoryShare(records)
      expect(result[0].share).toBeCloseTo(0.25, 5)
      expect(result[1].share).toBeCloseTo(0.75, 5)
      expect(result[0].name).toBe('Alpha')
    })

    it('returns zero share when total is zero', () => {
      const records = [
        { code: 'A', name: 'Alpha', amount: 0 },
        { code: 'B', name: 'Beta', amount: 0 },
      ]
      const result = categoryShare(records)
      expect(result[0].share).toBe(0)
      expect(result[1].share).toBe(0)
    })
  })
})
