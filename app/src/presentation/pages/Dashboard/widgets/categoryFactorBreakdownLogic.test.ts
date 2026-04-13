import { describe, it, expect } from 'vitest'
import {
  filterRecordsByDrillPath,
  checkHasSubCategories,
  computeTotals,
  computeWaterfallItems,
} from './categoryFactorBreakdownLogic'
import type { FactorItem } from './categoryFactorBreakdown.types'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

function mkRecord(
  dept: string,
  line: string,
  klass: string,
  totalQuantity: number,
  totalAmount: number,
): CategoryTimeSalesRecord {
  return {
    department: { code: dept, name: `Dept${dept}` },
    line: { code: line, name: `Line${line}` },
    klass: { code: klass, name: `Klass${klass}` },
    totalQuantity,
    totalAmount,
  } as unknown as CategoryTimeSalesRecord
}

describe('filterRecordsByDrillPath', () => {
  const cur = [
    mkRecord('D1', 'L1', 'K1', 10, 100),
    mkRecord('D1', 'L2', 'K2', 20, 200),
    mkRecord('D2', 'L3', 'K3', 5, 50),
  ]
  const prev = [mkRecord('D1', 'L1', 'K1', 8, 80), mkRecord('D2', 'L3', 'K3', 4, 40)]

  it('returns original when path empty', () => {
    const r = filterRecordsByDrillPath(cur, prev, [])
    expect(r.cur).toBe(cur)
    expect(r.prev).toBe(prev)
  })

  it('filters by dept', () => {
    const r = filterRecordsByDrillPath(cur, prev, [{ level: 'dept', code: 'D1' }])
    expect(r.cur).toHaveLength(2)
    expect(r.prev).toHaveLength(1)
  })

  it('filters by dept then line', () => {
    const r = filterRecordsByDrillPath(cur, prev, [
      { level: 'dept', code: 'D1' },
      { level: 'line', code: 'L1' },
    ])
    expect(r.cur).toHaveLength(1)
    expect(r.cur[0].klass.code).toBe('K1')
    expect(r.prev).toHaveLength(1)
  })
})

describe('checkHasSubCategories', () => {
  it('returns false at class level', () => {
    const recs = [mkRecord('D1', 'L1', 'K1', 1, 1), mkRecord('D1', 'L1', 'K2', 1, 1)]
    expect(checkHasSubCategories(recs, 'class')).toBe(false)
  })

  it('returns true when multiple lines exist at dept level', () => {
    const recs = [mkRecord('D1', 'L1', 'K1', 1, 1), mkRecord('D1', 'L2', 'K2', 1, 1)]
    expect(checkHasSubCategories(recs, 'dept')).toBe(true)
  })

  it('returns false when only one child at dept level', () => {
    const recs = [mkRecord('D1', 'L1', 'K1', 1, 1), mkRecord('D1', 'L1', 'K1', 1, 1)]
    expect(checkHasSubCategories(recs, 'dept')).toBe(false)
  })

  it('returns true when multiple klasses at line level', () => {
    const recs = [mkRecord('D1', 'L1', 'K1', 1, 1), mkRecord('D1', 'L1', 'K2', 1, 1)]
    expect(checkHasSubCategories(recs, 'line')).toBe(true)
  })

  it('returns false on empty input', () => {
    expect(checkHasSubCategories([], 'dept')).toBe(false)
  })
})

describe('computeTotals', () => {
  it('sums all fields across items', () => {
    const items: FactorItem[] = [
      {
        name: 'A',
        code: 'a',
        _level: 3,
        custEffect: 10,
        ticketEffect: 20,
        qtyEffect: 30,
        priceEffect: 40,
        pricePureEffect: 5,
        mixEffect: 2,
        totalChange: 100,
        prevAmount: 500,
        curAmount: 600,
        hasChildren: true,
      },
      {
        name: 'B',
        code: 'b',
        _level: 3,
        custEffect: 1,
        ticketEffect: 2,
        qtyEffect: 3,
        priceEffect: 4,
        pricePureEffect: 1,
        mixEffect: 1,
        totalChange: 10,
        prevAmount: 200,
        curAmount: 210,
        hasChildren: false,
      },
    ]
    const t = computeTotals(items)
    expect(t.prevAmount).toBe(700)
    expect(t.curAmount).toBe(810)
    expect(t.totalChange).toBe(110)
    expect(t.custEffect).toBe(11)
    expect(t.ticketEffect).toBe(22)
    expect(t.qtyEffect).toBe(33)
    expect(t.priceEffect).toBe(44)
    expect(t.pricePureEffect).toBe(6)
    expect(t.mixEffect).toBe(3)
  })

  it('returns zeros on empty input', () => {
    const t = computeTotals([])
    expect(t).toEqual({
      prevAmount: 0,
      curAmount: 0,
      totalChange: 0,
      custEffect: 0,
      ticketEffect: 0,
      qtyEffect: 0,
      priceEffect: 0,
      pricePureEffect: 0,
      mixEffect: 0,
    })
  })
})

describe('computeWaterfallItems', () => {
  const base: FactorItem = {
    name: 'A',
    code: 'a',
    _level: 3,
    custEffect: 100,
    ticketEffect: 50,
    qtyEffect: 60,
    priceEffect: -40,
    pricePureEffect: 0,
    mixEffect: 0,
    totalChange: 120,
    prevAmount: 500,
    curAmount: 620,
    hasChildren: false,
  }

  it('builds ranges for level 3 with hasCust', () => {
    const [result] = computeWaterfallItems([base], 3, true)
    // steps: cust(+100), qty(+60), price(-40)
    // positive offset accumulates: cust [0,100], qty [100,160]
    // negative offset accumulates: price [-40,0]
    expect(result.custRange).toEqual([0, 100])
    expect(result.qtyRange).toEqual([100, 160])
    expect(result.priceRange).toEqual([-40, 0])
    // non-active steps remain [0, 0]
    expect(result.ticketRange).toEqual([0, 0])
    expect(result.pricePureRange).toEqual([0, 0])
    expect(result.mixRange).toEqual([0, 0])
  })

  it('builds ranges for level 2 without cust', () => {
    const item: FactorItem = { ...base, _level: 2, ticketEffect: 30 }
    const [result] = computeWaterfallItems([item], 2, false)
    expect(result.custRange).toEqual([0, 0])
    expect(result.ticketRange).toEqual([0, 30])
  })

  it('builds ranges for level 5 with pricePure and mix', () => {
    const item: FactorItem = {
      ...base,
      _level: 5,
      priceEffect: 0,
      pricePureEffect: 20,
      mixEffect: -10,
    }
    const [result] = computeWaterfallItems([item], 5, true)
    expect(result.custRange).toEqual([0, 100])
    expect(result.qtyRange).toEqual([100, 160])
    expect(result.pricePureRange).toEqual([160, 180])
    expect(result.mixRange).toEqual([-10, 0])
  })
})
