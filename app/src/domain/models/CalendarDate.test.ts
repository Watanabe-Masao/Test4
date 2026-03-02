import { describe, it, expect } from 'vitest'
import {
  toDateKey,
  toDateKeyFromParts,
  fromDateKey,
  getDow,
  formatCalendarDate,
  isSameDate,
  dateRangeDays,
  dateRangeToKeys,
} from './CalendarDate'

describe('CalendarDate', () => {
  describe('toDateKey', () => {
    it('should pad month and day with leading zeros', () => {
      expect(toDateKey({ year: 2026, month: 2, day: 3 })).toBe('2026-02-03')
    })

    it('should not pad double-digit month and day', () => {
      expect(toDateKey({ year: 2025, month: 12, day: 31 })).toBe('2025-12-31')
    })

    it('should handle first day of year', () => {
      expect(toDateKey({ year: 2026, month: 1, day: 1 })).toBe('2026-01-01')
    })
  })

  describe('toDateKeyFromParts', () => {
    it('should produce same result as toDateKey', () => {
      expect(toDateKeyFromParts(2026, 3, 15)).toBe('2026-03-15')
    })

    it('should pad single digits', () => {
      expect(toDateKeyFromParts(2025, 1, 5)).toBe('2025-01-05')
    })
  })

  describe('fromDateKey', () => {
    it('should parse date key back to CalendarDate', () => {
      expect(fromDateKey('2026-02-03')).toEqual({ year: 2026, month: 2, day: 3 })
    })

    it('should handle December 31st', () => {
      expect(fromDateKey('2025-12-31')).toEqual({ year: 2025, month: 12, day: 31 })
    })

    it('should be inverse of toDateKey', () => {
      const original = { year: 2026, month: 7, day: 14 }
      expect(fromDateKey(toDateKey(original))).toEqual(original)
    })
  })

  describe('getDow', () => {
    it('should return correct day of week (Sunday=0)', () => {
      // 2026-03-01 is a Sunday
      expect(getDow({ year: 2026, month: 3, day: 1 })).toBe(0)
    })

    it('should return Saturday as 6', () => {
      // 2026-02-28 is a Saturday
      expect(getDow({ year: 2026, month: 2, day: 28 })).toBe(6)
    })

    it('should return Monday as 1', () => {
      // 2026-03-02 is a Monday
      expect(getDow({ year: 2026, month: 3, day: 2 })).toBe(1)
    })
  })

  describe('formatCalendarDate', () => {
    it('should return same format as toDateKey', () => {
      const date = { year: 2026, month: 3, day: 15 }
      expect(formatCalendarDate(date)).toBe(toDateKey(date))
    })

    it('should produce YYYY-MM-DD format', () => {
      expect(formatCalendarDate({ year: 2025, month: 1, day: 9 })).toBe('2025-01-09')
    })
  })

  describe('isSameDate', () => {
    it('should return true for identical dates', () => {
      const a = { year: 2026, month: 3, day: 1 }
      const b = { year: 2026, month: 3, day: 1 }
      expect(isSameDate(a, b)).toBe(true)
    })

    it('should return false for different years', () => {
      expect(isSameDate({ year: 2025, month: 3, day: 1 }, { year: 2026, month: 3, day: 1 })).toBe(
        false,
      )
    })

    it('should return false for different months', () => {
      expect(isSameDate({ year: 2026, month: 2, day: 1 }, { year: 2026, month: 3, day: 1 })).toBe(
        false,
      )
    })

    it('should return false for different days', () => {
      expect(isSameDate({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 3, day: 2 })).toBe(
        false,
      )
    })
  })

  describe('dateRangeDays', () => {
    it('should return 1 for same-day range', () => {
      const range = {
        from: { year: 2026, month: 3, day: 1 },
        to: { year: 2026, month: 3, day: 1 },
      }
      expect(dateRangeDays(range)).toBe(1)
    })

    it('should count inclusive days within a month', () => {
      const range = {
        from: { year: 2026, month: 3, day: 1 },
        to: { year: 2026, month: 3, day: 10 },
      }
      expect(dateRangeDays(range)).toBe(10)
    })

    it('should handle month boundary', () => {
      const range = {
        from: { year: 2026, month: 2, day: 25 },
        to: { year: 2026, month: 3, day: 5 },
      }
      // Feb 25-28 = 4 days + Mar 1-5 = 5 days = 9 days
      expect(dateRangeDays(range)).toBe(9)
    })

    it('should handle full month', () => {
      const range = {
        from: { year: 2026, month: 1, day: 1 },
        to: { year: 2026, month: 1, day: 31 },
      }
      expect(dateRangeDays(range)).toBe(31)
    })
  })

  describe('dateRangeToKeys', () => {
    it('should convert range to DateKey pair', () => {
      const range = {
        from: { year: 2026, month: 1, day: 5 },
        to: { year: 2026, month: 2, day: 15 },
      }
      expect(dateRangeToKeys(range)).toEqual({
        fromKey: '2026-01-05',
        toKey: '2026-02-15',
      })
    })

    it('should produce lexicographically ordered keys', () => {
      const range = {
        from: { year: 2025, month: 12, day: 1 },
        to: { year: 2026, month: 1, day: 31 },
      }
      const { fromKey, toKey } = dateRangeToKeys(range)
      expect(fromKey < toKey).toBe(true)
    })
  })
})
