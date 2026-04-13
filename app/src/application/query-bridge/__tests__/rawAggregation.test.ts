import { describe, it, expect } from 'vitest'
import {
  aggregateByDay,
  cumulativeSum,
  movingAverage,
  dowAggregate,
  stddevPop,
  zScore,
  coefficientOfVariation,
} from '@/application/query-bridge/rawAggregation'

describe('rawAggregation', () => {
  describe('aggregateByDay', () => {
    it('sums sales per dateKey and counts unique stores', () => {
      const records = [
        { dateKey: '2024-01-01', day: 1, storeId: 's1', sales: 100 },
        { dateKey: '2024-01-01', day: 1, storeId: 's2', sales: 200 },
        { dateKey: '2024-01-02', day: 2, storeId: 's1', sales: 150 },
      ]
      const result = aggregateByDay(records)
      expect(result).toHaveLength(2)
      expect(result[0].dateKey).toBe('2024-01-01')
      expect(result[0].totalSales).toBe(300)
      expect(result[0].storeCount).toBe(2)
      expect(result[1].totalSales).toBe(150)
      expect(result[1].storeCount).toBe(1)
    })

    it('dedupes same-store same-day store counts', () => {
      const records = [
        { dateKey: '2024-01-01', day: 1, storeId: 's1', sales: 100 },
        { dateKey: '2024-01-01', day: 1, storeId: 's1', sales: 50 },
      ]
      const result = aggregateByDay(records)
      expect(result[0].totalSales).toBe(150)
      expect(result[0].storeCount).toBe(1)
    })

    it('returns empty array for empty input', () => {
      expect(aggregateByDay([])).toEqual([])
    })
  })

  describe('cumulativeSum', () => {
    it('computes running total in dateKey order', () => {
      const daily = [
        { dateKey: '2024-01-01', totalSales: 100 },
        { dateKey: '2024-01-02', totalSales: 200 },
        { dateKey: '2024-01-03', totalSales: 50 },
      ]
      const result = cumulativeSum(daily)
      expect(result[0].cumulativeSales).toBe(100)
      expect(result[1].cumulativeSales).toBe(300)
      expect(result[2].cumulativeSales).toBe(350)
      expect(result[0].dailySales).toBe(100)
    })

    it('sorts input by dateKey before accumulating', () => {
      const daily = [
        { dateKey: '2024-01-03', totalSales: 50 },
        { dateKey: '2024-01-01', totalSales: 100 },
        { dateKey: '2024-01-02', totalSales: 200 },
      ]
      const result = cumulativeSum(daily)
      expect(result.map((r) => r.dateKey)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03'])
      expect(result[2].cumulativeSales).toBe(350)
    })
  })

  describe('movingAverage', () => {
    it('returns null for entries before window is filled', () => {
      const daily = [
        { dateKey: '2024-01-01', value: 100 },
        { dateKey: '2024-01-02', value: 200 },
        { dateKey: '2024-01-03', value: 300 },
      ]
      const result = movingAverage(daily, 3)
      expect(result[0].ma).toBeNull()
      expect(result[1].ma).toBeNull()
      expect(result[2].ma).toBe(200) // (100+200+300)/3
    })

    it('computes trailing window average', () => {
      const daily = [
        { dateKey: '2024-01-01', value: 10 },
        { dateKey: '2024-01-02', value: 20 },
        { dateKey: '2024-01-03', value: 30 },
        { dateKey: '2024-01-04', value: 40 },
      ]
      const result = movingAverage(daily, 2)
      expect(result[0].ma).toBeNull()
      expect(result[1].ma).toBe(15)
      expect(result[2].ma).toBe(25)
      expect(result[3].ma).toBe(35)
    })
  })

  describe('dowAggregate', () => {
    it('groups by day-of-week and computes stats', () => {
      // 2024-01-01 is Monday (dow=1)
      // 2024-01-08 is Monday
      // 2024-01-02 is Tuesday (dow=2)
      const daily = [
        { dateKey: '2024-01-01', totalSales: 100 },
        { dateKey: '2024-01-08', totalSales: 200 },
        { dateKey: '2024-01-02', totalSales: 300 },
      ]
      const result = dowAggregate(daily)
      const mon = result.find((r) => r.dow === 1)
      expect(mon?.avgSales).toBe(150)
      expect(mon?.dayCount).toBe(2)
      const tue = result.find((r) => r.dow === 2)
      expect(tue?.avgSales).toBe(300)
      expect(tue?.dayCount).toBe(1)
    })

    it('excludes zero-sales days (closed days)', () => {
      const daily = [
        { dateKey: '2024-01-01', totalSales: 100 },
        { dateKey: '2024-01-08', totalSales: 0 },
      ]
      const result = dowAggregate(daily)
      const mon = result.find((r) => r.dow === 1)
      expect(mon?.dayCount).toBe(1)
      expect(mon?.avgSales).toBe(100)
    })

    it('returns empty when all sales are zero', () => {
      const daily = [{ dateKey: '2024-01-01', totalSales: 0 }]
      expect(dowAggregate(daily)).toEqual([])
    })

    it('result sorted by dow ascending', () => {
      const daily = [
        // 2024-01-05 Fri(5), 2024-01-06 Sat(6), 2024-01-01 Mon(1)
        { dateKey: '2024-01-05', totalSales: 500 },
        { dateKey: '2024-01-06', totalSales: 600 },
        { dateKey: '2024-01-01', totalSales: 100 },
      ]
      const result = dowAggregate(daily)
      expect(result.map((r) => r.dow)).toEqual([1, 5, 6])
    })
  })

  describe('stddevPop', () => {
    it('returns 0 for empty array', () => {
      expect(stddevPop([])).toBe(0)
    })

    it('returns 0 when all values are identical', () => {
      expect(stddevPop([5, 5, 5, 5])).toBe(0)
    })

    it('computes population stddev for known set', () => {
      // values [2,4,4,4,5,5,7,9], mean=5
      // pop variance = 4, stddev = 2
      const result = stddevPop([2, 4, 4, 4, 5, 5, 7, 9])
      expect(result).toBeCloseTo(2, 5)
    })
  })

  describe('zScore', () => {
    it('returns (value - mean) / stddev', () => {
      expect(zScore(110, 100, 5)).toBe(2)
      expect(zScore(95, 100, 5)).toBe(-1)
    })

    it('returns 0 when stddev is 0', () => {
      expect(zScore(100, 100, 0)).toBe(0)
    })
  })

  describe('coefficientOfVariation', () => {
    it('returns 0 for empty values', () => {
      expect(coefficientOfVariation([])).toBe(0)
    })

    it('returns 0 when mean is 0', () => {
      expect(coefficientOfVariation([0, 0, 0])).toBe(0)
    })

    it('returns stddev / mean for known set', () => {
      // values [10, 20, 30], mean=20, variance=(100+0+100)/3≈66.67, stddev≈8.165
      // cv ≈ 0.408
      const cv = coefficientOfVariation([10, 20, 30])
      expect(cv).toBeGreaterThan(0.4)
      expect(cv).toBeLessThan(0.42)
    })
  })
})
