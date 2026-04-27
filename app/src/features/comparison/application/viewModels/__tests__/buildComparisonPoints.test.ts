/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { toComparisonPoints, toComparisonPointMap } from '../buildComparisonPoints'
import type { DayMappingRow } from '@/features/comparison/application/comparisonTypes'

const row = (overrides: Partial<DayMappingRow> & { currentDay: number }): DayMappingRow => ({
  prevDay: overrides.currentDay,
  prevMonth: 3,
  prevYear: 2025,
  prevSales: 0,
  prevCustomers: 0,
  prevCtsQuantity: 0,
  ...overrides,
})

describe('toComparisonPoints', () => {
  it('returns empty array for empty mapping', () => {
    expect(toComparisonPoints([])).toEqual([])
  })

  it('converts each DayMappingRow into a ComparisonPoint with sourceDate preserved', () => {
    const mapping = [
      row({ currentDay: 2, prevDay: 1, prevSales: 100, prevCustomers: 10, prevCtsQuantity: 5 }),
    ]
    const result = toComparisonPoints(mapping)
    expect(result).toHaveLength(1)
    expect(result[0].currentDay).toBe(2)
    expect(result[0].sales).toBe(100)
    expect(result[0].customers).toBe(10)
    expect(result[0].ctsQuantity).toBe(5)
    expect(result[0].sourceDate).toEqual({ year: 2025, month: 3, day: 1 })
  })

  it('returns points sorted by currentDay ascending', () => {
    const mapping = [
      row({ currentDay: 5, prevSales: 500 }),
      row({ currentDay: 1, prevSales: 100 }),
      row({ currentDay: 3, prevSales: 300 }),
    ]
    const result = toComparisonPoints(mapping)
    expect(result.map((p) => p.currentDay)).toEqual([1, 3, 5])
  })

  it('deduplicates rows sharing the same currentDay (last wins)', () => {
    const mapping = [row({ currentDay: 1, prevSales: 100 }), row({ currentDay: 1, prevSales: 200 })]
    const result = toComparisonPoints(mapping)
    expect(result).toHaveLength(1)
    expect(result[0].sales).toBe(200)
  })
})

describe('toComparisonPointMap', () => {
  it('returns empty map for empty mapping', () => {
    expect(toComparisonPointMap([]).size).toBe(0)
  })

  it('keys ComparisonPoints by currentDay', () => {
    const mapping = [row({ currentDay: 1, prevSales: 100 }), row({ currentDay: 2, prevSales: 200 })]
    const result = toComparisonPointMap(mapping)
    expect(result.size).toBe(2)
    expect(result.get(1)?.sales).toBe(100)
    expect(result.get(2)?.sales).toBe(200)
  })

  it('preserves source date through mapping', () => {
    const mapping = [row({ currentDay: 7, prevDay: 6, prevMonth: 4, prevYear: 2024 })]
    const result = toComparisonPointMap(mapping)
    expect(result.get(7)?.sourceDate).toEqual({ year: 2024, month: 4, day: 6 })
  })
})
