import { describe, it, expect } from 'vitest'
import {
  aggregateWeeklyTotals,
  computeEstimatedCustomerGap,
  computeEstimatedUnitPriceImpact,
  buildBudgetDetailRows,
  buildPeriodLabels,
} from '../PrevYearBudgetDetailPanel.vm'
import type { DowGapAnalysis, DowGapMethod } from '@/domain/models/ComparisonContext'
import type { ComparisonPoint } from '@/application/comparison/viewModels'

describe('aggregateWeeklyTotals', () => {
  it('returns empty map for empty input', () => {
    const result = aggregateWeeklyTotals([])
    expect(result.size).toBe(0)
  })

  it('aggregates rows from the same week', () => {
    const rows = [
      { week: 1, prevSales: 100, prevCustomers: 10, budget: 200 },
      { week: 1, prevSales: 50, prevCustomers: 5, budget: 100 },
    ]
    const map = aggregateWeeklyTotals(rows)
    expect(map.size).toBe(1)
    const week1 = map.get(1)!
    expect(week1.sales).toBe(150)
    expect(week1.customers).toBe(15)
    expect(week1.budget).toBe(300)
    expect(week1.days).toBe(2)
  })

  it('separates different weeks', () => {
    const rows = [
      { week: 1, prevSales: 100, prevCustomers: 10, budget: 200 },
      { week: 2, prevSales: 300, prevCustomers: 30, budget: 400 },
    ]
    const map = aggregateWeeklyTotals(rows)
    expect(map.size).toBe(2)
    expect(map.get(1)?.sales).toBe(100)
    expect(map.get(2)?.sales).toBe(300)
    expect(map.get(1)?.days).toBe(1)
    expect(map.get(2)?.days).toBe(1)
  })
})

describe('computeEstimatedCustomerGap', () => {
  const invalidGap = {
    isValid: false,
    dowCounts: [],
    prevDowDailyAvgCustomers: {},
    methodResults: undefined,
  } as unknown as DowGapAnalysis

  it('returns 0 when dowGap is invalid', () => {
    expect(computeEstimatedCustomerGap(invalidGap, 'dowDailyAverage' as DowGapMethod)).toBe(0)
  })

  it('uses prevDowDailyAvgCustomers fallback when no methodResult', () => {
    const dowGap = {
      isValid: true,
      dowCounts: [
        { dow: 0, diff: 2 },
        { dow: 1, diff: -1 },
      ],
      prevDowDailyAvgCustomers: { 0: 50, 1: 30 },
      methodResults: undefined,
    } as unknown as DowGapAnalysis
    // 2 * 50 + (-1) * 30 = 70
    expect(computeEstimatedCustomerGap(dowGap, 'dowDailyAverage' as DowGapMethod)).toBe(70)
  })

  it('uses methodResult dowAvgCustomers when available', () => {
    const dowGap = {
      isValid: true,
      dowCounts: [
        { dow: 0, diff: 3 },
        { dow: 2, diff: -2 },
      ],
      prevDowDailyAvgCustomers: { 0: 10, 2: 10 },
      methodResults: {
        dowDailyAverage: {
          dowAvgCustomers: { 0: 100, 2: 50 },
        },
      },
    } as unknown as DowGapAnalysis
    // 3 * 100 + (-2) * 50 = 200
    expect(computeEstimatedCustomerGap(dowGap, 'dowDailyAverage' as DowGapMethod)).toBe(200)
  })

  it('rounds the result', () => {
    const dowGap = {
      isValid: true,
      dowCounts: [{ dow: 0, diff: 1 }],
      prevDowDailyAvgCustomers: { 0: 50.6 },
      methodResults: undefined,
    } as unknown as DowGapAnalysis
    expect(computeEstimatedCustomerGap(dowGap, 'dowDailyAverage' as DowGapMethod)).toBe(51)
  })
})

describe('computeEstimatedUnitPriceImpact', () => {
  const validGap = { isValid: true } as unknown as DowGapAnalysis
  const invalidGap = { isValid: false } as unknown as DowGapAnalysis

  it('returns 0 when dowGap invalid', () => {
    expect(computeEstimatedUnitPriceImpact(invalidGap, 1000, 10, 0, 0, 100)).toBe(0)
  })

  it('returns 0 when entryCustomers is 0', () => {
    expect(computeEstimatedUnitPriceImpact(validGap, 1000, 0, 0, 0, 100)).toBe(0)
  })

  it('returns 0 when adjustedCustomers becomes 0 or negative', () => {
    expect(computeEstimatedUnitPriceImpact(validGap, 1000, 10, 0, -10, 100)).toBe(0)
    expect(computeEstimatedUnitPriceImpact(validGap, 1000, 10, 0, -11, 100)).toBe(0)
  })

  it('computes impact: adjustedSales/adjustedCustomers - prevTransactionValue', () => {
    // adjustedSales = 1000 + 200 = 1200
    // adjustedCustomers = 10 + 2 = 12
    // 1200/12 - 90 = 100 - 90 = 10
    expect(computeEstimatedUnitPriceImpact(validGap, 1000, 10, 200, 2, 90)).toBe(10)
  })
})

describe('buildBudgetDetailRows', () => {
  it('returns empty array for empty points', () => {
    const rows = buildBudgetDetailRows(
      [],
      new Map(),
      2025,
      4,
      () => 1,
      () => 0,
    )
    expect(rows).toEqual([])
  })

  it('builds rows from comparison points', () => {
    const points = [
      {
        currentDay: 10,
        sourceDate: { year: 2024, month: 4, day: 11 },
        sales: 5000,
        customers: 100,
        ctsQuantity: 50,
      },
    ] as unknown as readonly ComparisonPoint[]
    const budget = new Map<number, number>([[10, 7000]])
    const rows = buildBudgetDetailRows(
      points,
      budget,
      2025,
      4,
      (date) => Math.ceil(date.day / 7),
      (date) => date.day % 7,
    )
    expect(rows).toHaveLength(1)
    const r = rows[0]
    expect(r.currentDay).toBe(10)
    expect(r.prevDay).toBe(11)
    expect(r.prevMonth).toBe(4)
    expect(r.prevYear).toBe(2024)
    expect(r.prevSales).toBe(5000)
    expect(r.prevCustomers).toBe(100)
    expect(r.prevCtsQuantity).toBe(50)
    expect(r.budget).toBe(7000)
    expect(r.week).toBe(2)
    expect(r.dow).toBe(11 % 7)
  })

  it('uses 0 budget for missing entries in budgetDaily', () => {
    const points = [
      {
        currentDay: 1,
        sourceDate: { year: 2024, month: 4, day: 1 },
        sales: 0,
        customers: 0,
        ctsQuantity: 0,
      },
    ] as unknown as readonly ComparisonPoint[]
    const rows = buildBudgetDetailRows(
      points,
      new Map(),
      2025,
      4,
      () => 1,
      () => 0,
    )
    expect(rows[0].budget).toBe(0)
  })
})

describe('buildPeriodLabels', () => {
  it('returns month labels when points is empty', () => {
    const labels = buildPeriodLabels([], 2024, 3, 2025, 4)
    expect(labels.prev).toBe('2024年3月')
    expect(labels.cur).toBe('2025年4月')
  })

  it('builds same-month range label', () => {
    const points = [
      {
        currentDay: 1,
        sourceDate: { year: 2024, month: 3, day: 1 },
      },
      {
        currentDay: 5,
        sourceDate: { year: 2024, month: 3, day: 5 },
      },
    ] as unknown as readonly ComparisonPoint[]
    const labels = buildPeriodLabels(points, 2024, 3, 2025, 4)
    expect(labels.prev).toBe('2024年3月1日〜5日')
    expect(labels.cur).toBe('2025年4月1日〜5日')
  })

  it('builds cross-month range label when source months differ', () => {
    const points = [
      {
        currentDay: 28,
        sourceDate: { year: 2024, month: 2, day: 28 },
      },
      {
        currentDay: 2,
        sourceDate: { year: 2024, month: 3, day: 2 },
      },
    ] as unknown as readonly ComparisonPoint[]
    const labels = buildPeriodLabels(points, 2024, 2, 2025, 4)
    expect(labels.prev).toBe('2024年2月28日〜2024年3月2日')
    expect(labels.cur).toBe('2025年4月28日〜2日')
  })
})
