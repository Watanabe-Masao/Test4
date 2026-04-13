/**
 * adjacentMonthUtils.test — 隣接月ユーティリティの pure 関数テスト
 */
import { describe, it, expect } from 'vitest'
import { OVERFLOW_DAYS, adjacentMonth, mergeAdjacentMonthRecords } from '../adjacentMonthUtils'

interface TestRecord {
  readonly day: number
  readonly year: number
  readonly month: number
  readonly storeId: string
  readonly amount: number
}

const rec = (year: number, month: number, day: number, amount = 100): TestRecord => ({
  day,
  year,
  month,
  storeId: 'S1',
  amount,
})

describe('OVERFLOW_DAYS', () => {
  it('is 6', () => {
    expect(OVERFLOW_DAYS).toBe(6)
  })
})

describe('adjacentMonth', () => {
  it('returns next month within same year', () => {
    expect(adjacentMonth(2026, 5, 1)).toEqual({ year: 2026, month: 6 })
  })

  it('rolls over from December to January next year', () => {
    expect(adjacentMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
  })

  it('returns previous month within same year', () => {
    expect(adjacentMonth(2026, 5, -1)).toEqual({ year: 2026, month: 4 })
  })

  it('rolls back from January to December previous year', () => {
    expect(adjacentMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })

  it('handles mid-year months both directions', () => {
    expect(adjacentMonth(2000, 7, 1)).toEqual({ year: 2000, month: 8 })
    expect(adjacentMonth(2000, 7, -1)).toEqual({ year: 2000, month: 6 })
  })
})

describe('mergeAdjacentMonthRecords', () => {
  it('normalizes year/month of source records', () => {
    const source = [rec(2025, 4, 15), rec(2025, 4, 20)]
    const merged = mergeAdjacentMonthRecords(source, null, null, 2026, 5, 31, 30)
    expect(merged).toHaveLength(2)
    expect(merged[0].year).toBe(2026)
    expect(merged[0].month).toBe(5)
    expect(merged[0].day).toBe(15)
    expect(merged[1].day).toBe(20)
  })

  it('includes prev month tail within OVERFLOW_DAYS as negative/zero extended days', () => {
    // daysInPrevMonth = 30, underflowStart = 30 - 6 = 24
    // days 25..30 from prev should be pulled in → extended day = day - 30
    const source: TestRecord[] = []
    const prev = [
      rec(2026, 4, 24), // excluded (day > 24 is false)
      rec(2026, 4, 25),
      rec(2026, 4, 28),
      rec(2026, 4, 30),
    ]
    const merged = mergeAdjacentMonthRecords(source, prev, null, 2026, 5, 31, 30)
    expect(merged).toHaveLength(3)
    expect(merged.map((r) => r.day).sort((a, b) => a - b)).toEqual([-5, -2, 0])
    for (const r of merged) {
      expect(r.year).toBe(2026)
      expect(r.month).toBe(5)
    }
  })

  it('includes next month head within OVERFLOW_DAYS as days > daysInSourceMonth', () => {
    // daysInSourceMonth = 31, days 1..6 of next → 32..37
    const next = [
      rec(2026, 6, 1),
      rec(2026, 6, 6),
      rec(2026, 6, 7), // excluded
      rec(2026, 6, 10), // excluded
    ]
    const merged = mergeAdjacentMonthRecords([], null, next, 2026, 5, 31, 30)
    expect(merged).toHaveLength(2)
    expect(merged.map((r) => r.day).sort((a, b) => a - b)).toEqual([32, 37])
  })

  it('combines source, prev and next in one pass', () => {
    const source = [rec(2026, 5, 10)]
    const prev = [rec(2026, 4, 30)]
    const next = [rec(2026, 6, 1)]
    const merged = mergeAdjacentMonthRecords(source, prev, next, 2026, 5, 31, 30)
    expect(merged).toHaveLength(3)
    const days = merged.map((r) => r.day).sort((a, b) => a - b)
    expect(days).toEqual([0, 10, 32])
  })

  it('treats null/undefined prev and next as no records', () => {
    const source = [rec(2026, 5, 1)]
    const a = mergeAdjacentMonthRecords(source, null, null, 2026, 5, 31, 30)
    const b = mergeAdjacentMonthRecords(source, undefined, undefined, 2026, 5, 31, 30)
    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
  })

  it('skips prev month logic when daysInPrevMonth is 0', () => {
    const prev = [rec(2026, 4, 30)]
    const merged = mergeAdjacentMonthRecords([], prev, null, 2026, 5, 31, 0)
    expect(merged).toHaveLength(0)
  })

  it('returns empty array when all inputs empty', () => {
    const merged = mergeAdjacentMonthRecords<TestRecord>([], [], [], 2026, 5, 31, 30)
    expect(merged).toEqual([])
  })

  it('preserves extra properties via spread', () => {
    const source = [rec(2025, 4, 5, 999)]
    const merged = mergeAdjacentMonthRecords(source, null, null, 2026, 5, 31, 30)
    expect(merged[0].storeId).toBe('S1')
    expect(merged[0].amount).toBe(999)
  })
})
