/**
 * comparisonAccessors.test — alignment-aware prev-year data accessors
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  getPrevYearDailyValue,
  getPrevYearDailySales,
  extractPrevYearCustomerCount,
} from '../comparisonAccessors'
import type { PrevYearData, PrevYearDailyEntry } from '../comparisonTypes'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'

const mkEntry = (sales: number, customers = 10): PrevYearDailyEntry => ({
  sales,
  discount: 0,
  customers,
  ctsQuantity: 0,
})

const mkPrevYear = (entries: Array<[number, number, number, PrevYearDailyEntry]>): PrevYearData => {
  const daily = new Map<string, PrevYearDailyEntry>()
  for (const [y, m, d, e] of entries) daily.set(toDateKeyFromParts(y, m, d), e)
  return {
    hasPrevYear: true,
    source: 'loaded',
    daily,
    totalSales: 0,
    totalDiscount: 0,
    totalCustomers: 42,
    totalCtsQuantity: 0,
    grossSales: 0,
    discountRate: 0,
    totalDiscountEntries: [],
  }
}

describe('getPrevYearDailyValue', () => {
  it('returns the entry indexed by the target date key', () => {
    const pv = mkPrevYear([[2024, 3, 15, mkEntry(1000)]])
    expect(getPrevYearDailyValue(pv, 2024, 3, 15)).toEqual(mkEntry(1000))
  })

  it('returns undefined when the target date is missing', () => {
    const pv = mkPrevYear([[2024, 3, 15, mkEntry(1000)]])
    expect(getPrevYearDailyValue(pv, 2024, 3, 16)).toBeUndefined()
  })

  it('returns undefined on empty daily map', () => {
    const pv = mkPrevYear([])
    expect(getPrevYearDailyValue(pv, 2024, 1, 1)).toBeUndefined()
  })
})

describe('getPrevYearDailySales', () => {
  it('returns the sales value when entry exists', () => {
    const pv = mkPrevYear([[2024, 3, 15, mkEntry(5000)]])
    expect(getPrevYearDailySales(pv, 2024, 3, 15)).toBe(5000)
  })

  it('returns 0 when entry missing', () => {
    const pv = mkPrevYear([])
    expect(getPrevYearDailySales(pv, 2024, 3, 15)).toBe(0)
  })

  it('returns 0 for entry with zero sales', () => {
    const pv = mkPrevYear([[2024, 3, 15, mkEntry(0)]])
    expect(getPrevYearDailySales(pv, 2024, 3, 15)).toBe(0)
  })
})

describe('extractPrevYearCustomerCount', () => {
  it('returns the totalCustomers field verbatim', () => {
    const pv = mkPrevYear([])
    expect(extractPrevYearCustomerCount(pv)).toBe(42)
  })

  it('returns 0 when totalCustomers is zero', () => {
    const pv = { ...mkPrevYear([]), totalCustomers: 0 }
    expect(extractPrevYearCustomerCount(pv)).toBe(0)
  })
})
