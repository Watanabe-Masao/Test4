/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  toDateKey,
  toDateKeyFromParts,
  fromDateKey,
  getDow,
  toJsDate,
  fromJsDate,
  weekNumber,
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

  describe('toDateKey', () => {
    it('returns same as toDateKey', () => {
      const date = { year: 2026, month: 1, day: 5 }
      expect(toDateKey(date)).toBe(toDateKey(date))
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

  describe('toJsDate', () => {
    it('CalendarDate → JS Date (month は -1 ずらし)', () => {
      const d = toJsDate({ year: 2026, month: 3, day: 15 })
      expect(d.getFullYear()).toBe(2026)
      expect(d.getMonth()).toBe(2) // 0-index
      expect(d.getDate()).toBe(15)
    })

    it('1月 1日 → new Date(y, 0, 1)', () => {
      const d = toJsDate({ year: 2026, month: 1, day: 1 })
      expect(d.getMonth()).toBe(0)
    })
  })

  describe('fromJsDate', () => {
    it('JS Date → CalendarDate (month は +1 ずらし)', () => {
      const cd = fromJsDate(new Date(2026, 2, 15))
      expect(cd).toEqual({ year: 2026, month: 3, day: 15 })
    })

    it('toJsDate との round-trip', () => {
      const src = { year: 2025, month: 11, day: 30 }
      expect(fromJsDate(toJsDate(src))).toEqual(src)
    })
  })

  describe('weekNumber', () => {
    it('2026-03-01（月初の日曜）は week 1', () => {
      expect(weekNumber({ year: 2026, month: 3, day: 1 })).toBe(1)
    })

    it('2026-03-02（月曜、月初翌日）は week 2', () => {
      expect(weekNumber({ year: 2026, month: 3, day: 2 })).toBe(2)
    })

    it('2026-03-08（日曜、2 週目の末日）は week 2', () => {
      expect(weekNumber({ year: 2026, month: 3, day: 8 })).toBe(2)
    })

    it('2026-03-09（月曜）は week 3', () => {
      expect(weekNumber({ year: 2026, month: 3, day: 9 })).toBe(3)
    })

    it('2026-03-31（火曜）は week 6', () => {
      expect(weekNumber({ year: 2026, month: 3, day: 31 })).toBe(6)
    })

    it('2026-01-01（木曜）は week 1', () => {
      // firstDow=4 → mondayBased=3 → (0+3)/7=0 → +1 → week 1
      expect(weekNumber({ year: 2026, month: 1, day: 1 })).toBe(1)
    })

    it('2026-01-05（月曜）は week 2（月曜始まり）', () => {
      // firstDow=4 → mondayBased=3 → (4+3)/7=1 → +1 → week 2
      expect(weekNumber({ year: 2026, month: 1, day: 5 })).toBe(2)
    })

    it('月初が水曜でも 1 日は week 1', () => {
      // 2026-04-01 は水曜 → firstDow=3 → mondayBased=2 → (0+2)/7=0 → +1 → week 1
      expect(weekNumber({ year: 2026, month: 4, day: 1 })).toBe(1)
    })
  })
})
