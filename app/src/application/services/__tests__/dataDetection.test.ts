import { describe, it, expect } from 'vitest'
import {
  maxDayOfRecord,
  maxDayOfFlatRecords,
  detectDataMaxDay,
} from '@/application/services/dataDetection'

describe('maxDayOfRecord', () => {
  it('returns 0 for null', () => {
    expect(maxDayOfRecord(null)).toBe(0)
  })

  it('returns 0 for undefined', () => {
    expect(maxDayOfRecord(undefined)).toBe(0)
  })

  it('returns 0 for empty record', () => {
    expect(maxDayOfRecord({})).toBe(0)
  })

  it('returns max day across stores', () => {
    const record = {
      s1: { 1: {}, 5: {}, 10: {} },
      s2: { 3: {}, 15: {}, 7: {} },
    }
    expect(maxDayOfRecord(record)).toBe(15)
  })

  it('skips malformed store entries', () => {
    const record = {
      s1: { 3: {}, 8: {} },
      s2: null as unknown as { [day: number]: unknown },
    }
    expect(maxDayOfRecord(record)).toBe(8)
  })

  it('handles single store with single day', () => {
    expect(maxDayOfRecord({ s1: { 12: {} } })).toBe(12)
  })
})

describe('maxDayOfFlatRecords', () => {
  it('returns 0 for empty array', () => {
    expect(maxDayOfFlatRecords([])).toBe(0)
  })

  it('returns max day from flat records', () => {
    expect(maxDayOfFlatRecords([{ day: 3 }, { day: 10 }, { day: 5 }])).toBe(10)
  })

  it('handles single-element array', () => {
    expect(maxDayOfFlatRecords([{ day: 7 }])).toBe(7)
  })

  it('handles day 0 only', () => {
    expect(maxDayOfFlatRecords([{ day: 0 }])).toBe(0)
  })
})

describe('detectDataMaxDay', () => {
  const empty = { records: [] }

  it('returns 0 for all empty sources', () => {
    expect(
      detectDataMaxDay({
        purchase: empty,
        classifiedSales: empty,
        interStoreIn: empty,
        interStoreOut: empty,
        flowers: empty,
        directProduce: empty,
      }),
    ).toBe(0)
  })

  it('returns max day across all sources', () => {
    expect(
      detectDataMaxDay({
        purchase: { records: [{ day: 5 }] },
        classifiedSales: { records: [{ day: 20 }, { day: 12 }] },
        interStoreIn: { records: [{ day: 3 }] },
        interStoreOut: { records: [{ day: 8 }] },
        flowers: { records: [{ day: 18 }] },
        directProduce: { records: [{ day: 2 }] },
      }),
    ).toBe(20)
  })

  it('ignores consumables (not included in input)', () => {
    // only flowers has data
    expect(
      detectDataMaxDay({
        purchase: empty,
        classifiedSales: empty,
        interStoreIn: empty,
        interStoreOut: empty,
        flowers: { records: [{ day: 25 }] },
        directProduce: empty,
      }),
    ).toBe(25)
  })
})
