import { describe, it, expect } from 'vitest'
import { buildDowGapProjection } from '../comparisonProjections'
import { ZERO_DOW_GAP_ANALYSIS } from '@/domain/calculations/dowGapAnalysis'
import type { PrevYearMonthlyKpi, PrevYearMonthlyKpiEntry } from '../comparisonTypes'

const emptyEntry: PrevYearMonthlyKpiEntry = {
  sales: 0,
  customers: 0,
  transactionValue: 0,
  ctsQuantity: 0,
  dailyMapping: [],
  storeContributions: [],
}

const monthlyTotal = { sales: 0, customers: 0, transactionValue: 0, ctsQuantity: 0 }

describe('buildDowGapProjection', () => {
  it('returns ZERO_DOW_GAP_ANALYSIS when hasPrevYear is false', () => {
    const kpi: PrevYearMonthlyKpi = {
      hasPrevYear: false,
      sameDow: emptyEntry,
      sameDate: emptyEntry,
      monthlyTotal,
      sourceYear: 2025,
      sourceMonth: 3,
      dowOffset: 0,
    }
    expect(buildDowGapProjection(kpi, 2026, 3, 1000)).toEqual(ZERO_DOW_GAP_ANALYSIS)
  })

  it('returns ZERO_DOW_GAP_ANALYSIS when sourceYear is 0 even if hasPrevYear is true', () => {
    const kpi: PrevYearMonthlyKpi = {
      hasPrevYear: true,
      sameDow: emptyEntry,
      sameDate: emptyEntry,
      monthlyTotal,
      sourceYear: 0,
      sourceMonth: 0,
      dowOffset: 0,
    }
    expect(buildDowGapProjection(kpi, 2026, 3, 1000)).toEqual(ZERO_DOW_GAP_ANALYSIS)
  })

  it('produces a dow gap analysis with empty dailyMapping but valid year/month', () => {
    const kpi: PrevYearMonthlyKpi = {
      hasPrevYear: true,
      sameDow: emptyEntry,
      sameDate: emptyEntry,
      monthlyTotal,
      sourceYear: 2025,
      sourceMonth: 3,
      dowOffset: 0,
    }
    const result = buildDowGapProjection(kpi, 2026, 3, 1000)
    // analyzeDowGap was called: result has a dowCounts array of length 7
    expect(result.dowCounts).toHaveLength(7)
    expect(result.prevDowDailyAvg).toHaveLength(7)
    // actualDayImpact NOT added because dailyMappings are empty
    expect(result.actualDayImpact).toBeUndefined()
  })

  it('aggregates prev sales by day-of-week when sameDate dailyMapping has rows', () => {
    // 2025-03-01 was a Saturday (dow=6)
    const kpi: PrevYearMonthlyKpi = {
      hasPrevYear: true,
      sameDow: {
        ...emptyEntry,
        dailyMapping: [
          {
            prevDay: 1,
            prevMonth: 3,
            prevYear: 2025,
            currentDay: 1,
            prevSales: 100,
            prevCustomers: 10,
            prevCtsQuantity: 5,
          },
        ],
      },
      sameDate: {
        ...emptyEntry,
        dailyMapping: [
          {
            prevDay: 1,
            prevMonth: 3,
            prevYear: 2025,
            currentDay: 1,
            prevSales: 100,
            prevCustomers: 10,
            prevCtsQuantity: 5,
          },
          {
            prevDay: 2,
            prevMonth: 3,
            prevYear: 2025,
            currentDay: 2,
            prevSales: 200,
            prevCustomers: 20,
            prevCtsQuantity: 8,
          },
        ],
      },
      monthlyTotal,
      sourceYear: 2025,
      sourceMonth: 3,
      dowOffset: 0,
    }
    const result = buildDowGapProjection(kpi, 2026, 3, 1000)
    // result merges actualDayImpact when both dailyMappings have rows
    expect(result.actualDayImpact).not.toBeUndefined()
    expect(result.dowCounts).toHaveLength(7)
  })
})
