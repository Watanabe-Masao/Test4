import { describe, it, expect } from 'vitest'
import { dateRangeToYearMonths } from './readFreePeriodDeptKPI'

describe('dateRangeToYearMonths', () => {
  it('同月', () => {
    const result = dateRangeToYearMonths('2025-03-01', '2025-03-31')
    expect(result).toEqual([{ year: 2025, month: 3 }])
  })

  it('2ヶ月', () => {
    const result = dateRangeToYearMonths('2025-03-15', '2025-04-10')
    expect(result).toEqual([
      { year: 2025, month: 3 },
      { year: 2025, month: 4 },
    ])
  })

  it('年跨ぎ', () => {
    const result = dateRangeToYearMonths('2024-11-01', '2025-02-28')
    expect(result).toEqual([
      { year: 2024, month: 11 },
      { year: 2024, month: 12 },
      { year: 2025, month: 1 },
      { year: 2025, month: 2 },
    ])
  })

  it('1日だけ', () => {
    const result = dateRangeToYearMonths('2025-06-15', '2025-06-15')
    expect(result).toEqual([{ year: 2025, month: 6 }])
  })
})
