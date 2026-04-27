/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { buildDailyYoYRows } from '../buildDailyYoYRows'
import type { ComparisonPoint } from '../ComparisonViewTypes'

const point = (overrides: Partial<ComparisonPoint> & { currentDay: number }): ComparisonPoint => ({
  sourceDate: { year: 2025, month: 3, day: overrides.currentDay },
  sales: 0,
  customers: 0,
  ctsQuantity: 0,
  ...overrides,
})

describe('buildDailyYoYRows', () => {
  it('returns empty array when both inputs are empty', () => {
    const result = buildDailyYoYRows(new Map(), [])
    expect(result).toEqual([])
  })

  it('produces rows for current-only data with prev fields zeroed', () => {
    const current = new Map([
      [1, { sales: 100, customers: 10 }],
      [2, { sales: 200, customers: 20 }],
    ])
    const result = buildDailyYoYRows(current, [])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      day: 1,
      currentSales: 100,
      prevSales: 0,
      currentCustomers: 10,
      prevCustomers: 0,
    })
    expect(result[1]).toEqual({
      day: 2,
      currentSales: 200,
      prevSales: 0,
      currentCustomers: 20,
      prevCustomers: 0,
    })
  })

  it('produces rows for prev-only data with current fields zeroed', () => {
    const prev = [point({ currentDay: 5, sales: 500, customers: 25 })]
    const result = buildDailyYoYRows(new Map(), prev)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      day: 5,
      currentSales: 0,
      prevSales: 500,
      currentCustomers: 0,
      prevCustomers: 25,
    })
  })

  it('joins current and prev maps on day with both populated', () => {
    const current = new Map([[3, { sales: 300, customers: 30 }]])
    const prev = [point({ currentDay: 3, sales: 280, customers: 28 })]
    const result = buildDailyYoYRows(current, prev)
    expect(result).toEqual([
      {
        day: 3,
        currentSales: 300,
        prevSales: 280,
        currentCustomers: 30,
        prevCustomers: 28,
      },
    ])
  })

  it('returns rows sorted by day ascending', () => {
    const current = new Map([
      [10, { sales: 100, customers: 10 }],
      [1, { sales: 50, customers: 5 }],
    ])
    const prev = [point({ currentDay: 5, sales: 500 }), point({ currentDay: 1, sales: 60 })]
    const result = buildDailyYoYRows(current, prev)
    expect(result.map((r) => r.day)).toEqual([1, 5, 10])
  })

  it('unions days from current and prev without duplicates', () => {
    const current = new Map([
      [1, { sales: 100, customers: 10 }],
      [2, { sales: 200, customers: 20 }],
    ])
    const prev = [point({ currentDay: 2, sales: 180 }), point({ currentDay: 3, sales: 300 })]
    const result = buildDailyYoYRows(current, prev)
    expect(result.map((r) => r.day)).toEqual([1, 2, 3])
    // day 2 should pair both
    expect(result[1].currentSales).toBe(200)
    expect(result[1].prevSales).toBe(180)
  })
})
