/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { buildRecordAggregates } from '../DrilldownWaterfall.builders'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'

const makeRec = (
  dept: string,
  line: string,
  klass: string,
  qty: number,
  amt: number,
): CategoryLeafDailyEntry =>
  ({
    year: 2024,
    month: 3,
    day: 1,
    storeId: 'S1',
    department: { code: dept, name: dept },
    line: { code: line, name: line },
    klass: { code: klass, name: klass },
    deptCode: dept,
    deptName: dept,
    lineCode: line,
    lineName: line,
    klassCode: klass,
    klassName: klass,
    timeSlots: [],
    totalQuantity: qty,
    totalAmount: amt,
  }) as unknown as CategoryLeafDailyEntry

describe('buildRecordAggregates', () => {
  it('returns zero state for empty inputs', () => {
    const r = buildRecordAggregates([], [])
    expect(r.curTotalQty).toBe(0)
    expect(r.prevTotalQty).toBe(0)
    expect(r.hasQuantity).toBe(false)
    expect(r.priceMix).toBeNull()
  })

  it('sums totalQuantity for both sides', () => {
    const cur = [makeRec('D1', 'L1', 'K1', 10, 1000), makeRec('D1', 'L1', 'K2', 20, 2000)]
    const prev = [makeRec('D1', 'L1', 'K1', 5, 500), makeRec('D1', 'L1', 'K2', 15, 1500)]
    const r = buildRecordAggregates(cur, prev)
    expect(r.curTotalQty).toBe(30)
    expect(r.prevTotalQty).toBe(20)
    expect(r.hasQuantity).toBe(true)
  })

  it('sets hasQuantity false when current is 0', () => {
    const cur = [makeRec('D1', 'L1', 'K1', 0, 0)]
    const prev = [makeRec('D1', 'L1', 'K1', 10, 1000)]
    const r = buildRecordAggregates(cur, prev)
    expect(r.curTotalQty).toBe(0)
    expect(r.prevTotalQty).toBe(10)
    expect(r.hasQuantity).toBe(false)
  })

  it('sets hasQuantity false when prev is 0', () => {
    const cur = [makeRec('D1', 'L1', 'K1', 10, 1000)]
    const prev = [makeRec('D1', 'L1', 'K1', 0, 0)]
    const r = buildRecordAggregates(cur, prev)
    expect(r.hasQuantity).toBe(false)
  })

  it('skips priceMix when either side is empty', () => {
    const cur = [makeRec('D1', 'L1', 'K1', 10, 1000)]
    const r = buildRecordAggregates(cur, [])
    expect(r.priceMix).toBeNull()

    const r2 = buildRecordAggregates([], [makeRec('D1', 'L1', 'K1', 10, 1000)])
    expect(r2.priceMix).toBeNull()
  })

  it('computes priceMix when both sides have records', () => {
    // Same key, price increased from 100 → 110, quantity same
    const cur = [makeRec('D1', 'L1', 'K1', 10, 1100)]
    const prev = [makeRec('D1', 'L1', 'K1', 10, 1000)]
    const r = buildRecordAggregates(cur, prev)
    expect(r.priceMix).not.toBeNull()
    if (r.priceMix) {
      expect(typeof r.priceMix.priceEffect).toBe('number')
      expect(typeof r.priceMix.mixEffect).toBe('number')
      // priceEffect + mixEffect ~= totalAmount diff (100) — identity from domain
      expect(r.priceMix.priceEffect + r.priceMix.mixEffect).toBeCloseTo(100)
    }
  })
})
