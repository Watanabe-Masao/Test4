import { describe, it, expect } from 'vitest'
import {
  DOW_LABELS,
  DOW_NAMES,
  WEATHER_ICONS,
  fmtSenDiff,
  buildCalendarWeeks,
  calcWeekSummary,
  buildCumulativeMaps,
} from '../calendarUtils'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData } from '@/application/hooks/analytics'

function makeStoreResult(overrides: {
  daily?: Map<number, { sales: number; customers: number }>
  budgetDaily?: Map<number, number>
}): StoreResult {
  return {
    daily: overrides.daily ?? new Map(),
    budgetDaily: overrides.budgetDaily ?? new Map(),
  } as unknown as StoreResult
}

function emptyPrevYear(): PrevYearData {
  return {
    hasPrevYear: false,
    daily: new Map(),
  } as unknown as PrevYearData
}

describe('calendarUtils — constants', () => {
  it('DOW_LABELS has 7 items starting with Monday', () => {
    expect(DOW_LABELS).toHaveLength(7)
    expect(DOW_LABELS[0]).toBe('月')
    expect(DOW_LABELS[6]).toBe('日')
  })

  it('DOW_NAMES has 7 items starting with Sunday', () => {
    expect(DOW_NAMES).toHaveLength(7)
    expect(DOW_NAMES[0]).toBe('日')
    expect(DOW_NAMES[6]).toBe('土')
  })

  it('WEATHER_ICONS maps all weather categories', () => {
    expect(WEATHER_ICONS.sunny).toBeTruthy()
    expect(WEATHER_ICONS.cloudy).toBeTruthy()
    expect(WEATHER_ICONS.rainy).toBeTruthy()
    expect(WEATHER_ICONS.snowy).toBeTruthy()
    expect(WEATHER_ICONS.other).toBeTruthy()
  })
})

describe('fmtSenDiff', () => {
  it('formats positive values with + prefix', () => {
    expect(fmtSenDiff(12_345)).toBe('+12千')
  })

  it('formats negative values with - sign preserved', () => {
    expect(fmtSenDiff(-12_345)).toBe('-12千')
  })

  it('formats zero as +0', () => {
    expect(fmtSenDiff(0)).toBe('+0千')
  })

  it('rounds to nearest thousand', () => {
    expect(fmtSenDiff(1_499)).toBe('+1千')
    expect(fmtSenDiff(1_500)).toBe('+2千')
  })

  it('formats large values with locale commas', () => {
    expect(fmtSenDiff(1_234_567)).toBe('+1,235千')
  })
})

describe('buildCalendarWeeks', () => {
  it('builds weeks for February 2024 (Thursday start, 29 days)', () => {
    // 2024-02-01 is a Thursday. firstDow = (4 + 6) % 7 = 3
    const weeks = buildCalendarWeeks(2024, 2, 29)
    // First week should start with 3 nulls then 1-4
    expect(weeks[0]).toEqual([null, null, null, 1, 2, 3, 4])
    // Every row is length 7
    for (const w of weeks) {
      expect(w).toHaveLength(7)
    }
    // The last day 29 should appear somewhere
    const flat = weeks.flat()
    expect(flat).toContain(29)
  })

  it('pads the final week with nulls', () => {
    const weeks = buildCalendarWeeks(2024, 2, 29)
    const lastWeek = weeks[weeks.length - 1]
    // Last week should contain 29 and trailing nulls
    expect(lastWeek).toContain(29)
    expect(lastWeek.slice(lastWeek.indexOf(29) + 1).every((v) => v === null)).toBe(true)
  })

  it('has no null before day 1 when month starts on Monday', () => {
    // 2024-04-01 is a Monday → firstDow 0
    const weeks = buildCalendarWeeks(2024, 4, 30)
    expect(weeks[0][0]).toBe(1)
  })
})

describe('calcWeekSummary', () => {
  it('aggregates sales, budget, customers, and day count', () => {
    const daily = new Map([
      [1, { sales: 10_000, customers: 50 }],
      [2, { sales: 20_000, customers: 80 }],
      [3, { sales: 0, customers: 0 }],
    ])
    const budgetDaily = new Map([
      [1, 12_000],
      [2, 18_000],
      [3, 15_000],
    ])
    const sr = makeStoreResult({ daily, budgetDaily })
    const prev = emptyPrevYear()

    const summary = calcWeekSummary([1, 2, 3, null, null, null, null], sr, prev, 2024, 2)

    expect(summary.wSales).toBe(30_000)
    expect(summary.wBudget).toBe(45_000)
    expect(summary.wDiff).toBe(-15_000)
    expect(summary.wCustomers).toBe(130)
    // sales > 0 on day 1 and 2 only
    expect(summary.dayCount).toBe(2)
  })

  it('returns all zeros for fully-null week', () => {
    const sr = makeStoreResult({})
    const prev = emptyPrevYear()
    const summary = calcWeekSummary([null, null, null, null, null, null, null], sr, prev, 2024, 2)
    expect(summary.wSales).toBe(0)
    expect(summary.wBudget).toBe(0)
    expect(summary.wCustomers).toBe(0)
    expect(summary.dayCount).toBe(0)
  })

  it('skips null day cells', () => {
    const daily = new Map([[5, { sales: 100, customers: 1 }]])
    const sr = makeStoreResult({ daily })
    const prev = emptyPrevYear()
    const summary = calcWeekSummary([null, null, 5, null, null, null, null], sr, prev, 2024, 2)
    expect(summary.wSales).toBe(100)
    expect(summary.wCustomers).toBe(1)
  })
})

describe('buildCumulativeMaps', () => {
  it('builds monotonically increasing cumulative sums', () => {
    const daily = new Map([
      [1, { sales: 1_000, customers: 10 }],
      [2, { sales: 2_000, customers: 20 }],
      [3, { sales: 3_000, customers: 30 }],
    ])
    const budgetDaily = new Map([
      [1, 1_100],
      [2, 2_100],
      [3, 3_100],
    ])
    const sr = makeStoreResult({ daily, budgetDaily })
    const prev = emptyPrevYear()

    const result = buildCumulativeMaps(3, sr, prev, 2024, 2)

    expect(result.cumSales.get(1)).toBe(1_000)
    expect(result.cumSales.get(2)).toBe(3_000)
    expect(result.cumSales.get(3)).toBe(6_000)

    expect(result.cumBudget.get(3)).toBe(6_300)

    expect(result.cumCustomers.get(3)).toBe(60)
  })

  it('returns zeros for days with no data', () => {
    const sr = makeStoreResult({})
    const prev = emptyPrevYear()
    const result = buildCumulativeMaps(3, sr, prev, 2024, 2)
    expect(result.cumSales.get(1)).toBe(0)
    expect(result.cumBudget.get(3)).toBe(0)
    expect(result.cumCustomers.get(3)).toBe(0)
  })
})
