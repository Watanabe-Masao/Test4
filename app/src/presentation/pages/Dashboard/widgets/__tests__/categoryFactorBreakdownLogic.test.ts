/**
 * categoryFactorBreakdownLogic.ts — pure logic test
 *
 * 検証対象:
 * - filterRecordsByDrillPath: drillPath の dept/line 各レベルで filter
 * - checkHasSubCategories: class は false / 他は子キー 2 個以上で true
 * - computeWaterfallItems: activeLevel 2/3/5 + hasCust の分岐で steps 生成
 * - computeTotals: items の各 effect を合算
 */
import { describe, it, expect } from 'vitest'
import {
  filterRecordsByDrillPath,
  checkHasSubCategories,
  computeWaterfallItems,
  computeTotals,
} from '../categoryFactorBreakdownLogic'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import type { FactorItem } from '../categoryFactorBreakdown.types'

function makeRec(
  deptCode: string,
  lineCode: string,
  klassCode: string,
  qty = 10,
  amt = 1000,
): CategoryLeafDailyEntry {
  return {
    department: { code: deptCode, name: `Dept ${deptCode}` },
    line: { code: lineCode, name: `Line ${lineCode}` },
    klass: { code: klassCode, name: `Klass ${klassCode}` },
    deptCode,
    deptName: `Dept ${deptCode}`,
    lineCode,
    lineName: `Line ${lineCode}`,
    klassCode,
    klassName: `Klass ${klassCode}`,
    totalQuantity: qty,
    totalAmount: amt,
  } as unknown as CategoryLeafDailyEntry
}

function makeItem(overrides: Partial<FactorItem> = {}): FactorItem {
  return {
    name: 'X',
    code: 'x',
    _level: 2,
    custEffect: 0,
    ticketEffect: 0,
    qtyEffect: 0,
    priceEffect: 0,
    pricePureEffect: 0,
    mixEffect: 0,
    totalChange: 0,
    prevAmount: 0,
    curAmount: 0,
    hasChildren: false,
    ...overrides,
  }
}

// ─── filterRecordsByDrillPath ────────────────────────

describe('filterRecordsByDrillPath', () => {
  it('空 drillPath: 入力をそのまま返す', () => {
    const cur = [makeRec('D1', 'L1', 'K1'), makeRec('D2', 'L2', 'K2')]
    const prev = [makeRec('D1', 'L1', 'K1')]
    const result = filterRecordsByDrillPath(cur, prev, [])
    expect(result.cur).toEqual(cur)
    expect(result.prev).toEqual(prev)
  })

  it('dept drill: department.code で filter', () => {
    const cur = [makeRec('D1', 'L1', 'K1'), makeRec('D2', 'L2', 'K2')]
    const result = filterRecordsByDrillPath(cur, [], [{ level: 'dept', code: 'D1' }])
    expect(result.cur).toHaveLength(1)
    expect(result.cur[0].department.code).toBe('D1')
  })

  it('line drill: line.code で filter', () => {
    const cur = [makeRec('D1', 'L1', 'K1'), makeRec('D1', 'L2', 'K2')]
    const result = filterRecordsByDrillPath(
      cur,
      [],
      [
        { level: 'dept', code: 'D1' },
        { level: 'line', code: 'L1' },
      ],
    )
    expect(result.cur).toHaveLength(1)
    expect(result.cur[0].line.code).toBe('L1')
  })

  it('prev records も同じ drillPath で filter される', () => {
    const prev = [makeRec('D1', 'L1', 'K1'), makeRec('D2', 'L2', 'K2')]
    const result = filterRecordsByDrillPath([], prev, [{ level: 'dept', code: 'D2' }])
    expect(result.prev).toHaveLength(1)
    expect(result.prev[0].department.code).toBe('D2')
  })
})

// ─── checkHasSubCategories ──────────────────────────

describe('checkHasSubCategories', () => {
  it("currentLevel='class' は常に false", () => {
    const recs = [makeRec('D1', 'L1', 'K1'), makeRec('D1', 'L1', 'K2')]
    expect(checkHasSubCategories(recs, 'class')).toBe(false)
  })

  it("currentLevel='dept': 複数 dept|line 組合せで true", () => {
    const recs = [makeRec('D1', 'L1', 'K1'), makeRec('D1', 'L2', 'K2')]
    expect(checkHasSubCategories(recs, 'dept')).toBe(true)
  })

  it("currentLevel='dept': 単一 dept|line 組合せで false", () => {
    const recs = [makeRec('D1', 'L1', 'K1'), makeRec('D1', 'L1', 'K2')]
    expect(checkHasSubCategories(recs, 'dept')).toBe(false)
  })

  it("currentLevel='line': 複数 line|klass 組合せで true", () => {
    const recs = [makeRec('D1', 'L1', 'K1'), makeRec('D1', 'L1', 'K2')]
    expect(checkHasSubCategories(recs, 'line')).toBe(true)
  })

  it('空 records は false', () => {
    expect(checkHasSubCategories([], 'dept')).toBe(false)
  })
})

// ─── computeWaterfallItems ──────────────────────────

describe('computeWaterfallItems', () => {
  it('hasCust=true + activeLevel=2: cust + ticket の range', () => {
    const items = [
      makeItem({
        name: 'A',
        code: 'a',
        _level: 2,
        custEffect: 100,
        ticketEffect: 50,
      }),
    ]
    const result = computeWaterfallItems(items, 2, true)
    expect(result[0].custRange).toEqual([0, 100])
    expect(result[0].ticketRange).toEqual([100, 150])
  })

  it('activeLevel=3: qty + price range が付く', () => {
    const items = [
      makeItem({
        _level: 3,
        qtyEffect: 200,
        priceEffect: 100,
      }),
    ]
    const result = computeWaterfallItems(items, 3, false)
    expect(result[0].qtyRange).toEqual([0, 200])
    expect(result[0].priceRange).toEqual([200, 300])
  })

  it('activeLevel=5: pricePure + mix range が付く', () => {
    const items = [
      makeItem({
        _level: 5,
        qtyEffect: 100,
        pricePureEffect: 50,
        mixEffect: 30,
      }),
    ]
    const result = computeWaterfallItems(items, 5, false)
    expect(result[0].qtyRange).toEqual([0, 100])
    expect(result[0].pricePureRange).toEqual([100, 150])
    expect(result[0].mixRange).toEqual([150, 180])
  })

  it('負の値は negOffset 方向に積み上げる', () => {
    const items = [
      makeItem({
        _level: 2,
        custEffect: -100,
        ticketEffect: -50,
      }),
    ]
    const result = computeWaterfallItems(items, 2, true)
    // negative: [-100, 0] → [-150, -100]
    expect(result[0].custRange).toEqual([-100, 0])
    expect(result[0].ticketRange).toEqual([-150, -100])
  })

  it('hasCust=false なら custRange は nil [0,0]', () => {
    const items = [makeItem({ _level: 2, custEffect: 100, ticketEffect: 50 })]
    const result = computeWaterfallItems(items, 2, false)
    expect(result[0].custRange).toEqual([0, 0])
    expect(result[0].ticketRange).toEqual([0, 50])
  })
})

// ─── computeTotals ───────────────────────────────────

describe('computeTotals', () => {
  it('空 items は全 effect=0', () => {
    const result = computeTotals([])
    expect(result.prevAmount).toBe(0)
    expect(result.curAmount).toBe(0)
    expect(result.totalChange).toBe(0)
  })

  it('各 effect を合算する', () => {
    const items = [
      makeItem({
        prevAmount: 100,
        curAmount: 200,
        totalChange: 100,
        custEffect: 30,
        ticketEffect: 20,
        qtyEffect: 25,
        priceEffect: 10,
        pricePureEffect: 5,
        mixEffect: 10,
      }),
      makeItem({
        prevAmount: 50,
        curAmount: 60,
        totalChange: 10,
        custEffect: 5,
        ticketEffect: 3,
        qtyEffect: 1,
        priceEffect: 1,
        pricePureEffect: 0,
        mixEffect: 0,
      }),
    ]
    const result = computeTotals(items)
    expect(result.prevAmount).toBe(150)
    expect(result.curAmount).toBe(260)
    expect(result.totalChange).toBe(110)
    expect(result.custEffect).toBe(35)
    expect(result.ticketEffect).toBe(23)
    expect(result.qtyEffect).toBe(26)
    expect(result.priceEffect).toBe(11)
    expect(result.pricePureEffect).toBe(5)
    expect(result.mixEffect).toBe(10)
  })
})
