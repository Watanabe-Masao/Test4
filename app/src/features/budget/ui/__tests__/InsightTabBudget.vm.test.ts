/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { buildBudgetTableRows } from '../InsightTabBudget.vm'
import type { DailyRecord } from '@/domain/models/record'

const mkDaily = (day: number, discountAbsolute: number, grossSales: number): DailyRecord =>
  ({
    day,
    discountAbsolute,
    grossSales,
  }) as unknown as DailyRecord

describe('buildBudgetTableRows', () => {
  it('returns empty array when chart data is empty', () => {
    const result = buildBudgetTableRows([], new Map(), new Map(), new Map(), new Map())
    expect(result).toEqual([])
  })

  it('filters out rows where both actualCum and budgetCum are zero', () => {
    const chart = [
      { day: 1, actualCum: 0, budgetCum: 0 },
      { day: 2, actualCum: 100, budgetCum: 0 },
      { day: 3, actualCum: 0, budgetCum: 200 },
    ]
    const result = buildBudgetTableRows(chart, new Map(), new Map(), new Map(), new Map())
    expect(result.map((r) => r.day)).toEqual([2, 3])
  })

  it('sorts chart data by day ascending before producing rows', () => {
    const chart = [
      { day: 3, actualCum: 300, budgetCum: 300 },
      { day: 1, actualCum: 100, budgetCum: 100 },
      { day: 2, actualCum: 200, budgetCum: 200 },
    ]
    const result = buildBudgetTableRows(chart, new Map(), new Map(), new Map(), new Map())
    expect(result.map((r) => r.day)).toEqual([1, 2, 3])
  })

  it('reads daily sales and budget from the provided maps', () => {
    const chart = [{ day: 1, actualCum: 100, budgetCum: 80 }]
    const salesDaily = new Map([[1, 100]])
    const budgetDaily = new Map([[1, 80]])
    const result = buildBudgetTableRows(chart, new Map(), salesDaily, budgetDaily, new Map())
    expect(result[0].daySales).toBe(100)
    expect(result[0].dayBudget).toBe(80)
    expect(result[0].variance).toBe(20)
    expect(result[0].budgetVariance).toBe(20)
  })

  it('computes achievement as actualCum / budgetCum and zero when budgetCum is zero', () => {
    const chart = [
      { day: 1, actualCum: 50, budgetCum: 100 },
      { day: 2, actualCum: 100, budgetCum: 0 },
    ]
    const result = buildBudgetTableRows(chart, new Map(), new Map(), new Map(), new Map())
    expect(result[0].achievement).toBe(0.5)
    expect(result[1].achievement).toBe(0)
  })

  it('accumulates discount and gross sales for cumulative discount rate', () => {
    const chart = [
      { day: 1, actualCum: 100, budgetCum: 100 },
      { day: 2, actualCum: 200, budgetCum: 200 },
    ]
    const daily = new Map<number, DailyRecord>([
      [1, mkDaily(1, 10, 100)],
      [2, mkDaily(2, 20, 200)],
    ])
    const result = buildBudgetTableRows(chart, daily, new Map(), new Map(), new Map())
    expect(result[0].dayDiscountAbsolute).toBe(10)
    expect(result[0].discountRate).toBeCloseTo(0.1)
    expect(result[0].discountRateCum).toBeCloseTo(0.1)
    expect(result[1].dayDiscountAbsolute).toBe(20)
    expect(result[1].discountRate).toBeCloseTo(0.1)
    // cumulative: (10+20)/(100+200) = 0.1
    expect(result[1].discountRateCum).toBeCloseTo(0.1)
  })

  it('accumulates prev-year sales and computes pyDayRatio / pyCumRatio', () => {
    const chart = [
      { day: 1, actualCum: 120, budgetCum: 100 },
      { day: 2, actualCum: 240, budgetCum: 200 },
    ]
    const salesDaily = new Map([
      [1, 120],
      [2, 120],
    ])
    const prevYearDailyMap = new Map([
      [1, 100],
      [2, 100],
    ])
    const result = buildBudgetTableRows(chart, new Map(), salesDaily, new Map(), prevYearDailyMap)
    expect(result[0].pyDaySales).toBe(100)
    expect(result[0].pyDayRatio).toBeCloseTo(1.2)
    expect(result[0].cumPrevYear).toBe(100)
    expect(result[0].pyCumRatio).toBeCloseTo(1.2)

    expect(result[1].pyDaySales).toBe(100)
    expect(result[1].cumPrevYear).toBe(200)
    expect(result[1].pyCumRatio).toBeCloseTo(1.2)
  })

  it('returns zero ratios when prev-year sales are missing', () => {
    const chart = [{ day: 1, actualCum: 100, budgetCum: 100 }]
    const result = buildBudgetTableRows(chart, new Map(), new Map([[1, 100]]), new Map(), new Map())
    expect(result[0].pyDaySales).toBe(0)
    expect(result[0].pyDayRatio).toBe(0)
    expect(result[0].pyCumRatio).toBe(0)
    expect(result[0].cumPrevYear).toBe(0)
  })

  it('handles missing daily record by defaulting discount and gross to 0', () => {
    const chart = [{ day: 1, actualCum: 100, budgetCum: 100 }]
    const result = buildBudgetTableRows(chart, new Map(), new Map(), new Map(), new Map())
    expect(result[0].dayDiscountAbsolute).toBe(0)
    expect(result[0].discountRate).toBe(0)
    expect(result[0].discountRateCum).toBe(0)
  })
})
