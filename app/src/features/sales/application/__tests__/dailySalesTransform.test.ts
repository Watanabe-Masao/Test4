import { describe, it, expect } from 'vitest'
import {
  buildBaseDayItems,
  buildWaterfallData,
  createDowFilter,
} from '@/features/sales/application/dailySalesTransform'
import type { DailyRecord } from '@/domain/models/record'
import type { BaseDayItem } from '@/application/hooks/useDailySalesData'

const makeRec = (over: {
  sales?: number
  discountAbsolute?: number
  grossSales?: number
  customers?: number
}): DailyRecord =>
  ({
    sales: 0,
    discountAbsolute: 0,
    grossSales: 0,
    customers: 0,
    ...over,
  }) as unknown as DailyRecord

describe('buildBaseDayItems', () => {
  it('builds base data with cumulative totals when no prev/budget provided', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeRec({ sales: 100, grossSales: 120, customers: 10 })],
      [2, makeRec({ sales: 200, grossSales: 240, customers: 20 })],
      [3, makeRec({ sales: 300, grossSales: 360, customers: 30 })],
    ])
    const { baseData } = buildBaseDayItems(daily, 3, undefined, undefined, 2025, 1)
    expect(baseData).toHaveLength(3)
    expect(baseData[0].sales).toBe(100)
    expect(baseData[2].currentCum).toBe(600)
    // prev/budget null when not provided
    expect(baseData[0].prevYearSales).toBeNull()
    expect(baseData[0].prevYearCum).toBeNull()
    expect(baseData[0].budgetCum).toBeNull()
    expect(baseData[0].budgetDaily).toBeNull()
    // txValue = round(100/10) = 10
    expect(baseData[0].txValue).toBe(10)
  })

  it('returns null txValue when customers are zero', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeRec({ sales: 100, grossSales: 100, customers: 0 })],
    ])
    const { baseData } = buildBaseDayItems(daily, 1, undefined, undefined, 2025, 1)
    expect(baseData[0].txValue).toBeNull()
  })

  it('fills zero for missing days but still builds entries', () => {
    const daily = new Map<number, DailyRecord>([
      [2, makeRec({ sales: 500, grossSales: 500, customers: 50 })],
    ])
    const { baseData } = buildBaseDayItems(daily, 3, undefined, undefined, 2025, 1)
    expect(baseData).toHaveLength(3)
    expect(baseData[0].sales).toBe(0)
    expect(baseData[1].sales).toBe(500)
    expect(baseData[2].sales).toBe(0)
    expect(baseData[2].currentCum).toBe(500)
  })

  it('applies prevYear data and computes yoyDiff + yoyRatio', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeRec({ sales: 200, grossSales: 200, customers: 20 })],
      [2, makeRec({ sales: 400, grossSales: 400, customers: 40 })],
    ])
    const prevYear = new Map<string, { sales: number; discount: number; customers?: number }>([
      ['2025-01-01', { sales: 100, discount: -10, customers: 10 }],
      ['2025-01-02', { sales: 200, discount: -20, customers: 20 }],
    ])
    const { baseData } = buildBaseDayItems(daily, 2, prevYear, undefined, 2025, 1)
    expect(baseData[0].prevYearSales).toBe(100)
    expect(baseData[0].prevYearDiscount).toBe(10) // abs
    expect(baseData[0].yoyDiff).toBe(100)
    expect(baseData[1].yoyDiffCum).toBe(300) // 100 + 200
    expect(baseData[1].yoyRatio).toBeCloseTo(600 / 300, 5)
    expect(baseData[1].prevYearCum).toBe(300)
    expect(baseData[0].prevCustomers).toBe(10)
  })

  it('applies budget data and computes budgetDiff + achievement', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeRec({ sales: 150, grossSales: 150, customers: 10 })],
      [2, makeRec({ sales: 250, grossSales: 250, customers: 20 })],
    ])
    const budget = new Map<number, number>([
      [1, 100],
      [2, 200],
    ])
    const { baseData } = buildBaseDayItems(daily, 2, undefined, budget, 2025, 1)
    expect(baseData[0].budgetDaily).toBe(100)
    expect(baseData[0].budgetDiff).toBe(50)
    expect(baseData[1].budgetCum).toBe(300)
    expect(baseData[1].budgetDiffCum).toBe(100)
    expect(baseData[1].budgetAchievementRate).toBeCloseTo(400 / 300, 5)
  })
})

describe('buildWaterfallData', () => {
  const makeBase = (over: Partial<BaseDayItem>): BaseDayItem =>
    ({
      day: 1,
      sales: 0,
      discount: 0,
      prevYearSales: null,
      prevYearDiscount: null,
      customers: 0,
      quantity: 0,
      txValue: null,
      prevCustomers: null,
      prevQuantity: null,
      prevTxValue: null,
      currentCum: 0,
      prevYearCum: null,
      budgetCum: null,
      cumDiscountRate: 0,
      discountCum: 0,
      prevYearDiscountCum: null,
      yoyDiff: null,
      yoyDiffCum: null,
      budgetDiff: null,
      budgetDiffCum: null,
      budgetDaily: null,
      budgetAchievementRate: null,
      yoyRatio: null,
      ...over,
    }) as BaseDayItem

  it('accumulates positive sales changes as wfSalesUp', () => {
    const base = [
      makeBase({ day: 1, sales: 100, discount: 10, customers: 10 }),
      makeBase({ day: 2, sales: 150, discount: 20, customers: 15 }),
    ]
    const wf = buildWaterfallData(base)
    // Day 1: first day, salesChange = sales = 100, up = 100
    expect(wf[0].wfSalesUp).toBe(100)
    expect(wf[0].wfSalesDown).toBe(0)
    expect(wf[0].wfSalesCum).toBe(100)
    // Day 2: change = 150 - 100 = 50, up = 50
    expect(wf[1].wfSalesUp).toBe(50)
    expect(wf[1].wfSalesDown).toBe(0)
    expect(wf[1].wfSalesCum).toBe(150)
  })

  it('records negative changes as wfSalesDown', () => {
    const base = [
      makeBase({ day: 1, sales: 200, discount: 0, customers: 10 }),
      makeBase({ day: 2, sales: 150, discount: 0, customers: 8 }),
    ]
    const wf = buildWaterfallData(base)
    // Day 2: change = -50, down = 50
    expect(wf[1].wfSalesDown).toBe(50)
    expect(wf[1].wfSalesUp).toBe(0)
    expect(wf[1].wfSalesCum).toBe(150)
    // Customers change: 8 - 10 = -2
    expect(wf[1].wfCustDown).toBe(2)
    expect(wf[1].wfCustUp).toBe(0)
  })

  it('uses budget diffs when diffTarget is budget', () => {
    const base = [
      makeBase({ day: 1, sales: 100, yoyDiff: 10, budgetDiff: 20 }),
      makeBase({ day: 2, sales: 200, yoyDiff: 30, budgetDiff: -5 }),
    ]
    const wf = buildWaterfallData(base, 'budget')
    // Day 1 budgetDiff = 20
    expect(wf[0].wfYoyUp).toBe(20)
    expect(wf[0].wfYoyCum).toBe(20)
    // Day 2 budgetDiff = -5
    expect(wf[1].wfYoyDown).toBe(5)
    expect(wf[1].wfYoyCum).toBe(15)
  })

  it('defaults to yoy diff when diffTarget omitted', () => {
    const base = [
      makeBase({ day: 1, sales: 100, yoyDiff: 50 }),
      makeBase({ day: 2, sales: 200, yoyDiff: null }),
    ]
    const wf = buildWaterfallData(base)
    expect(wf[0].wfYoyUp).toBe(50)
    // null yoyDiff → treated as 0
    expect(wf[1].wfYoyUp).toBe(0)
    expect(wf[1].wfYoyDown).toBe(0)
    expect(wf[1].wfYoyCum).toBe(50)
  })

  it('computes discountDiffCum from current - prev discount', () => {
    const base = [
      makeBase({ day: 1, discount: 30, prevYearDiscount: 10 }),
      makeBase({ day: 2, discount: 40, prevYearDiscount: null }),
    ]
    const wf = buildWaterfallData(base)
    expect(wf[0].discountDiffCum).toBe(20)
    // Day 2: 40 - 0 = 40, cum = 60
    expect(wf[1].discountDiffCum).toBe(60)
  })

  it('returns an empty array for empty input', () => {
    expect(buildWaterfallData([])).toEqual([])
  })
})

describe('createDowFilter', () => {
  it('returns null when no dows selected', () => {
    expect(createDowFilter(2025, 1, [])).toBeNull()
  })

  it('filters days by selected day-of-week', () => {
    // 2025-01-01 is Wednesday (dow=3)
    const filter = createDowFilter(2025, 1, [3]) // only Wednesdays
    expect(filter).not.toBeNull()
    expect(filter!(1)).toBe(true) // Wed
    expect(filter!(2)).toBe(false) // Thu
    expect(filter!(8)).toBe(true) // next Wed
  })

  it('supports multiple selected dows', () => {
    // 2025-01: Sat = 4, 11, 18, 25; Sun = 5, 12, 19, 26
    const filter = createDowFilter(2025, 1, [0, 6])
    expect(filter).not.toBeNull()
    expect(filter!(4)).toBe(true) // Sat
    expect(filter!(5)).toBe(true) // Sun
    expect(filter!(6)).toBe(false) // Mon
  })

  it('returns a predicate with deterministic output for each day', () => {
    const filter = createDowFilter(2025, 6, [1, 2, 3, 4, 5])
    expect(filter).not.toBeNull()
    // 2025-06-01 is Sunday, so weekday filter returns false
    expect(filter!(1)).toBe(false)
    expect(filter!(2)).toBe(true)
  })

  it('treats all dows selected as all-pass', () => {
    const filter = createDowFilter(2025, 1, [0, 1, 2, 3, 4, 5, 6])
    expect(filter).not.toBeNull()
    for (let d = 1; d <= 31; d++) {
      expect(filter!(d)).toBe(true)
    }
  })
})
