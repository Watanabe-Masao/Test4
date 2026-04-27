/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  computeDowPattern,
  computeDailyFeatures,
  computeHourlyProfile,
  type DowPatternInput,
  type DailyFeatureInput,
} from '../featureAggregation'

describe('computeDowPattern', () => {
  it('returns empty array for empty input', () => {
    expect(computeDowPattern([])).toEqual([])
  })

  it('aggregates per store × dow, excluding zero-sales days', () => {
    // 2025-01-01 is Wednesday (dow=3), 2025-01-08 is Wednesday
    const rows: DowPatternInput[] = [
      { storeId: 's1', dateKey: '2025-01-01', sales: 100 },
      { storeId: 's1', dateKey: '2025-01-08', sales: 200 },
      { storeId: 's1', dateKey: '2025-01-15', sales: 0 }, // excluded
      { storeId: 's2', dateKey: '2025-01-01', sales: 50 },
    ]
    const result = computeDowPattern(rows)
    expect(result).toHaveLength(2)
    const s1 = result.find((r) => r.storeId === 's1')!
    expect(s1.dow).toBe(3)
    expect(s1.dayCount).toBe(2)
    expect(s1.avgSales).toBe(150)
    expect(s1.salesStddev).toBeCloseTo(50, 10)
    const s2 = result.find((r) => r.storeId === 's2')!
    expect(s2.dayCount).toBe(1)
    expect(s2.avgSales).toBe(50)
  })

  it('sums duplicate date entries before dow grouping', () => {
    const rows: DowPatternInput[] = [
      { storeId: 's1', dateKey: '2025-01-01', sales: 60 },
      { storeId: 's1', dateKey: '2025-01-01', sales: 40 },
    ]
    const result = computeDowPattern(rows)
    expect(result).toHaveLength(1)
    expect(result[0].avgSales).toBe(100)
  })

  it('sorts by storeId then dow', () => {
    const rows: DowPatternInput[] = [
      { storeId: 's2', dateKey: '2025-01-01', sales: 50 }, // Wed (3)
      { storeId: 's1', dateKey: '2025-01-02', sales: 50 }, // Thu (4)
      { storeId: 's1', dateKey: '2025-01-01', sales: 50 }, // Wed (3)
    ]
    const result = computeDowPattern(rows)
    expect(result.map((r) => `${r.storeId}:${r.dow}`)).toEqual(['s1:3', 's1:4', 's2:3'])
  })
})

describe('computeDailyFeatures', () => {
  it('returns empty array for empty input', () => {
    expect(computeDailyFeatures([])).toEqual([])
  })

  it('produces daily features with MAs and diffs', () => {
    const rows: DailyFeatureInput[] = Array.from({ length: 30 }, (_, i) => ({
      storeId: 's1',
      dateKey: `2025-01-${String(i + 1).padStart(2, '0')}`,
      sales: 100 + i,
    }))
    const result = computeDailyFeatures(rows)
    expect(result).toHaveLength(30)
    // first day: no diffs, no MAs
    expect(result[0].salesDiff1d).toBeNull()
    expect(result[0].salesDiff7d).toBeNull()
    expect(result[0].salesMa3).toBeNull()
    expect(result[0].cv7day).toBeNull()
    expect(result[0].cv28day).toBeNull()
    expect(result[0].zScore).toBeNull()
    // second day diff1d
    expect(result[1].salesDiff1d).toBe(1)
    // i=6 → cv7day available, diff7d available
    expect(result[6].cv7day).not.toBeNull()
    expect(result[7].salesDiff7d).toBe(7)
    // ma3 at i=2
    expect(result[2].salesMa3).toBeCloseTo(101, 10)
    // cumulative sum
    expect(result[29].cumulativeSales).toBe(
      Array.from({ length: 30 }, (_, i) => 100 + i).reduce((a, b) => a + b, 0),
    )
    // i=27 → cv28day + zScore
    expect(result[27].cv28day).not.toBeNull()
    expect(result[27].zScore).not.toBeNull()
    // spikeRatio at i>=6
    expect(result[6].spikeRatio).not.toBeNull()
  })

  it('trims output to trimFromDateKey', () => {
    const rows: DailyFeatureInput[] = Array.from({ length: 5 }, (_, i) => ({
      storeId: 's1',
      dateKey: `2025-01-0${i + 1}`,
      sales: 100,
    }))
    const trimmed = computeDailyFeatures(rows, '2025-01-03')
    expect(trimmed.map((r) => r.dateKey)).toEqual(['2025-01-03', '2025-01-04', '2025-01-05'])
  })

  it('handles multi-store input independently', () => {
    const rows: DailyFeatureInput[] = [
      { storeId: 's1', dateKey: '2025-01-01', sales: 100 },
      { storeId: 's1', dateKey: '2025-01-02', sales: 110 },
      { storeId: 's2', dateKey: '2025-01-01', sales: 50 },
      { storeId: 's2', dateKey: '2025-01-02', sales: 60 },
    ]
    const result = computeDailyFeatures(rows)
    const s1 = result.filter((r) => r.storeId === 's1')
    const s2 = result.filter((r) => r.storeId === 's2')
    expect(s1).toHaveLength(2)
    expect(s2).toHaveLength(2)
    expect(s1[1].salesDiff1d).toBe(10)
    expect(s2[1].salesDiff1d).toBe(10)
  })

  it('returns null zScore when stddev is zero (flat window)', () => {
    const rows: DailyFeatureInput[] = Array.from({ length: 28 }, (_, i) => ({
      storeId: 's1',
      dateKey: `2025-01-${String(i + 1).padStart(2, '0')}`,
      sales: 100,
    }))
    const result = computeDailyFeatures(rows)
    expect(result[27].zScore).toBeNull()
  })
})

describe('computeHourlyProfile', () => {
  it('returns empty array for empty input', () => {
    expect(computeHourlyProfile([])).toEqual([])
  })

  it('aggregates, ranks, and computes share per store', () => {
    const rows = [
      { storeId: 's1', hour: 10, amount: 100 },
      { storeId: 's1', hour: 11, amount: 300 },
      { storeId: 's1', hour: 12, amount: 600 },
    ]
    const result = computeHourlyProfile(rows)
    expect(result).toHaveLength(3)
    const h12 = result.find((r) => r.hour === 12)!
    const h11 = result.find((r) => r.hour === 11)!
    const h10 = result.find((r) => r.hour === 10)!
    expect(h12.hourRank).toBe(1)
    expect(h11.hourRank).toBe(2)
    expect(h10.hourRank).toBe(3)
    expect(h12.hourShare).toBeCloseTo(0.6, 10)
    expect(h11.hourShare).toBeCloseTo(0.3, 10)
    expect(h10.hourShare).toBeCloseTo(0.1, 10)
    // output sorted by storeId then hour
    expect(result.map((r) => r.hour)).toEqual([10, 11, 12])
  })

  it('sums duplicate hours within a store', () => {
    const rows = [
      { storeId: 's1', hour: 10, amount: 40 },
      { storeId: 's1', hour: 10, amount: 60 },
    ]
    const result = computeHourlyProfile(rows)
    expect(result).toHaveLength(1)
    expect(result[0].totalAmount).toBe(100)
    expect(result[0].hourShare).toBe(1)
    expect(result[0].hourRank).toBe(1)
  })

  it('handles ties: same amount → same rank, next rank jumps', () => {
    const rows = [
      { storeId: 's1', hour: 10, amount: 100 },
      { storeId: 's1', hour: 11, amount: 100 },
      { storeId: 's1', hour: 12, amount: 50 },
    ]
    const result = computeHourlyProfile(rows)
    const h10 = result.find((r) => r.hour === 10)!
    const h11 = result.find((r) => r.hour === 11)!
    const h12 = result.find((r) => r.hour === 12)!
    expect(h10.hourRank).toBe(1)
    expect(h11.hourRank).toBe(1)
    expect(h12.hourRank).toBe(3)
  })

  it('separates stores independently', () => {
    const rows = [
      { storeId: 's1', hour: 10, amount: 100 },
      { storeId: 's2', hour: 10, amount: 200 },
    ]
    const result = computeHourlyProfile(rows)
    expect(result).toHaveLength(2)
    for (const r of result) {
      expect(r.hourShare).toBe(1)
      expect(r.hourRank).toBe(1)
    }
  })
})
