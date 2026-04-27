/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { buildSameDowPoints } from '../comparisonTypes'
import type { DayMappingRow } from '../comparisonTypes'

const row = (overrides: Partial<DayMappingRow> & { currentDay: number }): DayMappingRow => ({
  prevDay: overrides.currentDay,
  prevMonth: 3,
  prevYear: 2025,
  prevSales: 0,
  prevCustomers: 0,
  prevCtsQuantity: 0,
  ...overrides,
})

describe('buildSameDowPoints', () => {
  it('returns an empty map for empty input', () => {
    expect(buildSameDowPoints([]).size).toBe(0)
  })

  it('keys SameDowPoint entries by currentDay', () => {
    const mapping = [row({ currentDay: 1 }), row({ currentDay: 5 }), row({ currentDay: 10 })]
    const result = buildSameDowPoints(mapping)
    expect(result.size).toBe(3)
    expect(result.has(1)).toBe(true)
    expect(result.has(5)).toBe(true)
    expect(result.has(10)).toBe(true)
  })

  it('preserves source date (year/month/day) on each point', () => {
    const mapping = [
      row({
        currentDay: 7,
        prevDay: 6,
        prevMonth: 4,
        prevYear: 2024,
        prevSales: 1500,
        prevCustomers: 80,
        prevCtsQuantity: 120,
      }),
    ]
    const result = buildSameDowPoints(mapping)
    const point = result.get(7)
    expect(point).not.toBeUndefined()
    expect(point?.sourceDate).toEqual({ year: 2024, month: 4, day: 6 })
    expect(point?.sales).toBe(1500)
    expect(point?.customers).toBe(80)
    expect(point?.ctsQuantity).toBe(120)
    expect(point?.currentDay).toBe(7)
  })

  it('overwrites earlier entry when two rows share the same currentDay', () => {
    const mapping = [row({ currentDay: 1, prevSales: 100 }), row({ currentDay: 1, prevSales: 999 })]
    const result = buildSameDowPoints(mapping)
    expect(result.size).toBe(1)
    expect(result.get(1)?.sales).toBe(999)
  })

  it('does not include entries for unrelated days', () => {
    const mapping = [row({ currentDay: 2, prevSales: 200 })]
    const result = buildSameDowPoints(mapping)
    expect(result.get(99)).toBeUndefined()
  })
})
