import { describe, it, expect } from 'vitest'
import { aggregateTotalQuantity } from '../YoYWaterfallChart.vm'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

const makeRec = (totalQuantity: number): CategoryTimeSalesRecord =>
  ({
    year: 2024,
    month: 3,
    day: 1,
    storeId: 'S1',
    department: { code: 'D', name: 'D' },
    line: { code: 'L', name: 'L' },
    klass: { code: 'K', name: 'K' },
    timeSlots: [],
    totalQuantity,
    totalAmount: totalQuantity * 100,
  }) as unknown as CategoryTimeSalesRecord

describe('aggregateTotalQuantity', () => {
  it('returns 0 for empty input', () => {
    expect(aggregateTotalQuantity([])).toBe(0)
  })

  it('sums totalQuantity across records', () => {
    expect(aggregateTotalQuantity([makeRec(10), makeRec(20), makeRec(30)])).toBe(60)
  })

  it('handles a single record', () => {
    expect(aggregateTotalQuantity([makeRec(42)])).toBe(42)
  })

  it('handles zero-quantity records', () => {
    expect(aggregateTotalQuantity([makeRec(0), makeRec(0)])).toBe(0)
  })

  it('handles negative quantities (returns algebraic sum)', () => {
    expect(aggregateTotalQuantity([makeRec(10), makeRec(-4)])).toBe(6)
  })

  it('treats records as readonly and does not mutate input', () => {
    const input = [makeRec(5), makeRec(7)]
    const before = input.map((r) => r.totalQuantity)
    aggregateTotalQuantity(input)
    expect(input.map((r) => r.totalQuantity)).toEqual(before)
  })
})
