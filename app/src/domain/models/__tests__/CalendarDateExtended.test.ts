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
} from '../CalendarDate'

describe('CalendarDate utilities', () => {
  describe('toDateKey', () => {
    it('formats single-digit month and day with zero padding', () => {
      expect(toDateKey({ year: 2026, month: 2, day: 3 })).toBe('2026-02-03')
    })

    it('formats double-digit month and day', () => {
      expect(toDateKey({ year: 2026, month: 12, day: 31 })).toBe('2026-12-31')
    })
  })

  describe('toDateKeyFromParts', () => {
    it('produces same output as toDateKey', () => {
      expect(toDateKeyFromParts(2026, 2, 3)).toBe('2026-02-03')
    })
  })

  describe('fromDateKey', () => {
    it('parses YYYY-MM-DD string', () => {
      expect(fromDateKey('2026-02-03')).toEqual({ year: 2026, month: 2, day: 3 })
    })

    it('round-trips with toDateKey', () => {
      const date = { year: 2025, month: 11, day: 15 }
      expect(fromDateKey(toDateKey(date))).toEqual(date)
    })
  })

  describe('getDow', () => {
    it('returns correct day of week (0=Sun)', () => {
      // 2026-03-04 is Wednesday
      expect(getDow({ year: 2026, month: 3, day: 4 })).toBe(3)
    })

    it('returns 0 for Sunday', () => {
      // 2026-03-01 is Sunday
      expect(getDow({ year: 2026, month: 3, day: 1 })).toBe(0)
    })
  })

  describe('formatCalendarDate', () => {
    it('returns same as toDateKey', () => {
      const date = { year: 2026, month: 1, day: 5 }
      expect(formatCalendarDate(date)).toBe(toDateKey(date))
    })
  })

  describe('isSameDate', () => {
    it('returns true for identical dates', () => {
      expect(isSameDate({ year: 2026, month: 1, day: 1 }, { year: 2026, month: 1, day: 1 })).toBe(
        true,
      )
    })

    it('returns false for different day', () => {
      expect(isSameDate({ year: 2026, month: 1, day: 1 }, { year: 2026, month: 1, day: 2 })).toBe(
        false,
      )
    })

    it('returns false for different month', () => {
      expect(isSameDate({ year: 2026, month: 1, day: 1 }, { year: 2026, month: 2, day: 1 })).toBe(
        false,
      )
    })

    it('returns false for different year', () => {
      expect(isSameDate({ year: 2025, month: 1, day: 1 }, { year: 2026, month: 1, day: 1 })).toBe(
        false,
      )
    })
  })

  describe('dateRangeDays', () => {
    it('returns 1 for same-day range', () => {
      const d = { year: 2026, month: 1, day: 1 }
      expect(dateRangeDays({ from: d, to: d })).toBe(1)
    })

    it('returns correct count for multi-day range', () => {
      expect(
        dateRangeDays({
          from: { year: 2026, month: 1, day: 1 },
          to: { year: 2026, month: 1, day: 10 },
        }),
      ).toBe(10)
    })

    it('handles cross-month ranges', () => {
      expect(
        dateRangeDays({
          from: { year: 2026, month: 1, day: 28 },
          to: { year: 2026, month: 2, day: 3 },
        }),
      ).toBe(7) // 28,29,30,31,1,2,3
    })
  })

  describe('dateRangeToKeys', () => {
    it('returns fromKey and toKey', () => {
      const range = {
        from: { year: 2026, month: 1, day: 15 },
        to: { year: 2026, month: 2, day: 10 },
      }
      const { fromKey, toKey } = dateRangeToKeys(range)
      expect(fromKey).toBe('2026-01-15')
      expect(toKey).toBe('2026-02-10')
    })

    it('maintains lexicographic order', () => {
      const range = {
        from: { year: 2025, month: 12, day: 31 },
        to: { year: 2026, month: 1, day: 1 },
      }
      const { fromKey, toKey } = dateRangeToKeys(range)
      expect(fromKey < toKey).toBe(true)
    })
  })
})
