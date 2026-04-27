/**
 * dailyAggregation 純粋関数のユニットテスト。
 *
 * 対象: aggregateByDay, cumulativeSum, movingAverage, dowAggregate
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  aggregateByDay,
  cumulativeSum,
  movingAverage,
  dowAggregate,
} from '@/application/query-bridge/dailyAggregation'

describe('aggregateByDay', () => {
  it('returns empty array for empty input', () => {
    expect(aggregateByDay([])).toEqual([])
  })

  it('sums sales per dateKey and counts distinct stores', () => {
    const records = [
      { dateKey: '2025-01-02', day: 2, storeId: 'S1', sales: 100 },
      { dateKey: '2025-01-02', day: 2, storeId: 'S2', sales: 200 },
      { dateKey: '2025-01-02', day: 2, storeId: 'S1', sales: 50 },
      { dateKey: '2025-01-01', day: 1, storeId: 'S1', sales: 300 },
    ]
    const result = aggregateByDay(records)
    expect(result).toHaveLength(2)
    // Sorted by dateKey ascending
    expect(result[0]).toEqual({
      dateKey: '2025-01-01',
      day: 1,
      totalSales: 300,
      storeCount: 1,
    })
    expect(result[1]).toEqual({
      dateKey: '2025-01-02',
      day: 2,
      totalSales: 350,
      storeCount: 2,
    })
  })

  it('treats duplicate storeIds as one for storeCount', () => {
    const records = [
      { dateKey: '2025-02-01', day: 1, storeId: 'A', sales: 10 },
      { dateKey: '2025-02-01', day: 1, storeId: 'A', sales: 20 },
      { dateKey: '2025-02-01', day: 1, storeId: 'A', sales: 30 },
    ]
    const result = aggregateByDay(records)
    expect(result[0].storeCount).toBe(1)
    expect(result[0].totalSales).toBe(60)
  })
})

describe('cumulativeSum', () => {
  it('returns empty array for empty input', () => {
    expect(cumulativeSum([])).toEqual([])
  })

  it('computes running total in date order', () => {
    const input = [
      { dateKey: '2025-01-03', totalSales: 30 },
      { dateKey: '2025-01-01', totalSales: 10 },
      { dateKey: '2025-01-02', totalSales: 20 },
    ]
    const result = cumulativeSum(input)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      dateKey: '2025-01-01',
      dailySales: 10,
      cumulativeSales: 10,
    })
    expect(result[1]).toEqual({
      dateKey: '2025-01-02',
      dailySales: 20,
      cumulativeSales: 30,
    })
    expect(result[2]).toEqual({
      dateKey: '2025-01-03',
      dailySales: 30,
      cumulativeSales: 60,
    })
  })

  it('handles zero-sale days correctly', () => {
    const result = cumulativeSum([
      { dateKey: '2025-01-01', totalSales: 0 },
      { dateKey: '2025-01-02', totalSales: 100 },
      { dateKey: '2025-01-03', totalSales: 0 },
    ])
    expect(result.map((r) => r.cumulativeSales)).toEqual([0, 100, 100])
  })
})

describe('movingAverage', () => {
  it('returns null for indices before window fills', () => {
    const input = [
      { dateKey: '2025-01-01', value: 10 },
      { dateKey: '2025-01-02', value: 20 },
      { dateKey: '2025-01-03', value: 30 },
    ]
    const result = movingAverage(input, 3)
    expect(result[0].ma).toBeNull()
    expect(result[1].ma).toBeNull()
    expect(result[2].ma).toBe(20) // (10+20+30)/3
  })

  it('computes sliding 3-day mean', () => {
    const input = [
      { dateKey: '2025-01-01', value: 10 },
      { dateKey: '2025-01-02', value: 20 },
      { dateKey: '2025-01-03', value: 30 },
      { dateKey: '2025-01-04', value: 40 },
      { dateKey: '2025-01-05', value: 50 },
    ]
    const result = movingAverage(input, 3)
    expect(result[2].ma).toBe(20)
    expect(result[3].ma).toBe(30) // (20+30+40)/3
    expect(result[4].ma).toBe(40) // (30+40+50)/3
  })

  it('sorts unsorted input before computing', () => {
    const input = [
      { dateKey: '2025-01-03', value: 30 },
      { dateKey: '2025-01-01', value: 10 },
      { dateKey: '2025-01-02', value: 20 },
    ]
    const result = movingAverage(input, 2)
    expect(result[0].dateKey).toBe('2025-01-01')
    expect(result[0].ma).toBeNull()
    expect(result[1].ma).toBe(15) // (10+20)/2
    expect(result[2].ma).toBe(25) // (20+30)/2
  })

  it('handles window size 1 (identity)', () => {
    const input = [
      { dateKey: '2025-01-01', value: 5 },
      { dateKey: '2025-01-02', value: 8 },
    ]
    const result = movingAverage(input, 1)
    expect(result[0].ma).toBe(5)
    expect(result[1].ma).toBe(8)
  })

  it('returns empty for empty input', () => {
    expect(movingAverage([], 7)).toEqual([])
  })
})

describe('dowAggregate', () => {
  it('returns empty array for empty input', () => {
    expect(dowAggregate([])).toEqual([])
  })

  it('excludes non-business days (totalSales <= 0)', () => {
    const result = dowAggregate([
      { dateKey: '2025-01-06', totalSales: 0 }, // Monday but zero → excluded
      { dateKey: '2025-01-13', totalSales: 100 }, // Monday
      { dateKey: '2025-01-20', totalSales: 200 }, // Monday
    ])
    // Only one dow group (Monday = 1)
    const monday = result.find((r) => r.dow === 1)
    expect(monday).toBeDefined()
    expect(monday?.dayCount).toBe(2)
    expect(monday?.avgSales).toBe(150)
  })

  it('computes per-dow avg and stddev', () => {
    // 2025-01-06 Monday, 2025-01-07 Tuesday
    const result = dowAggregate([
      { dateKey: '2025-01-06', totalSales: 100 },
      { dateKey: '2025-01-13', totalSales: 300 },
      { dateKey: '2025-01-07', totalSales: 50 },
    ])
    const monday = result.find((r) => r.dow === 1)
    const tuesday = result.find((r) => r.dow === 2)
    expect(monday?.avgSales).toBe(200) // (100+300)/2
    expect(monday?.dayCount).toBe(2)
    // population stddev: sqrt(((100-200)^2 + (300-200)^2)/2) = sqrt(10000) = 100
    expect(monday?.stddev).toBe(100)
    expect(tuesday?.avgSales).toBe(50)
    expect(tuesday?.stddev).toBe(0)
  })

  it('sorts output by dow ascending', () => {
    const result = dowAggregate([
      { dateKey: '2025-01-10', totalSales: 10 }, // Friday = 5
      { dateKey: '2025-01-06', totalSales: 10 }, // Monday = 1
      { dateKey: '2025-01-08', totalSales: 10 }, // Wednesday = 3
    ])
    const dows = result.map((r) => r.dow)
    expect(dows).toEqual([...dows].sort((a, b) => a - b))
  })
})
