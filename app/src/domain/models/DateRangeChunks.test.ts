import { describe, it, expect } from 'vitest'
import { splitDateRangeByMonth } from './DateRangeChunks'

describe('splitDateRangeByMonth', () => {
  it('returns single chunk for same-month range', () => {
    const chunks = splitDateRangeByMonth(
      { year: 2026, month: 3, day: 1 },
      { year: 2026, month: 3, day: 15 },
    )
    expect(chunks).toHaveLength(1)
    expect(chunks[0].year).toBe(2026)
    expect(chunks[0].month).toBe(3)
    expect(chunks[0].days).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  it('splits a cross-month range into two chunks', () => {
    const chunks = splitDateRangeByMonth(
      { year: 2026, month: 1, day: 29 },
      { year: 2026, month: 2, day: 3 },
    )
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toEqual({ year: 2026, month: 1, days: [29, 30, 31] })
    expect(chunks[1]).toEqual({ year: 2026, month: 2, days: [1, 2, 3] })
  })

  it('handles a single-day range', () => {
    const chunks = splitDateRangeByMonth(
      { year: 2026, month: 6, day: 15 },
      { year: 2026, month: 6, day: 15 },
    )
    expect(chunks).toHaveLength(1)
    expect(chunks[0].days).toEqual([15])
  })

  it('handles year boundary (Dec → Jan)', () => {
    const chunks = splitDateRangeByMonth(
      { year: 2025, month: 12, day: 30 },
      { year: 2026, month: 1, day: 2 },
    )
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toEqual({ year: 2025, month: 12, days: [30, 31] })
    expect(chunks[1]).toEqual({ year: 2026, month: 1, days: [1, 2] })
  })

  it('handles multi-month ranges with full intermediate months', () => {
    const chunks = splitDateRangeByMonth(
      { year: 2026, month: 1, day: 30 },
      { year: 2026, month: 3, day: 2 },
    )
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toEqual({ year: 2026, month: 1, days: [30, 31] })
    // Feb 2026: 28 days (not leap year)
    expect(chunks[1].year).toBe(2026)
    expect(chunks[1].month).toBe(2)
    expect(chunks[1].days).toHaveLength(28)
    expect(chunks[1].days[0]).toBe(1)
    expect(chunks[1].days[27]).toBe(28)
    expect(chunks[2]).toEqual({ year: 2026, month: 3, days: [1, 2] })
  })

  it('handles leap year February correctly', () => {
    const chunks = splitDateRangeByMonth(
      { year: 2024, month: 2, day: 1 },
      { year: 2024, month: 2, day: 29 },
    )
    expect(chunks).toHaveLength(1)
    expect(chunks[0].days).toHaveLength(29)
    expect(chunks[0].days[28]).toBe(29)
  })

  it('returns empty array for inverted range (to < from)', () => {
    const chunks = splitDateRangeByMonth(
      { year: 2026, month: 3, day: 15 },
      { year: 2026, month: 3, day: 10 },
    )
    expect(chunks).toEqual([])
  })
})
