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
  computeFactorItems,
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
    year: 2026,
    month: 1,
    day: 1,
    storeId: '1',
    deptCode,
    deptName: `Dept ${deptCode}`,
    lineCode,
    lineName: `Line ${lineCode}`,
    klassCode,
    klassName: `Klass ${klassCode}`,
    totalQuantity: qty,
    totalAmount: amt,
    timeSlots: [],
  }
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

  it('dept drill: deptCode で filter', () => {
    const cur = [makeRec('D1', 'L1', 'K1'), makeRec('D2', 'L2', 'K2')]
    const result = filterRecordsByDrillPath(cur, [], [{ level: 'dept', code: 'D1' }])
    expect(result.cur).toHaveLength(1)
    expect(result.cur[0].deptCode).toBe('D1')
  })

  it('line drill: lineCode で filter', () => {
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
    expect(result.cur[0].lineCode).toBe('L1')
  })

  it('prev records も同じ drillPath で filter される', () => {
    const prev = [makeRec('D1', 'L1', 'K1'), makeRec('D2', 'L2', 'K2')]
    const result = filterRecordsByDrillPath([], prev, [{ level: 'dept', code: 'D2' }])
    expect(result.prev).toHaveLength(1)
    expect(result.prev[0].deptCode).toBe('D2')
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

// ─── computeFactorItems (Shapley 2/3/5 factor decomposition) ──

describe('computeFactorItems', () => {
  const curRecords = [makeRec('D1', 'L1', 'K1', 100, 12000), makeRec('D2', 'L2', 'K2', 80, 10000)]
  const prevRecords = [makeRec('D1', 'L1', 'K1', 90, 10000), makeRec('D2', 'L2', 'K2', 70, 8000)]

  it('activeLevel=2 + hasCust=true: decompose2 恒等式 (custEffect + ticketEffect ≈ totalChange)', () => {
    const items = computeFactorItems(
      { cur: curRecords, prev: prevRecords },
      'dept',
      2,
      true,
      150,
      200,
      false,
    )
    expect(items).toHaveLength(2)
    for (const item of items) {
      expect(item.totalChange).toBe(item.curAmount - item.prevAmount)
      expect(item.custEffect + item.ticketEffect).toBeCloseTo(item.totalChange, 3)
      expect(item._level).toBe(2)
    }
  })

  it('activeLevel=2 + hasCust=false: 差分は全て ticketEffect (custEffect=0)', () => {
    const items = computeFactorItems(
      { cur: curRecords, prev: prevRecords },
      'dept',
      2,
      false,
      0,
      0,
      false,
    )
    for (const item of items) {
      expect(item.custEffect).toBe(0)
      expect(item.ticketEffect).toBe(item.curAmount - item.prevAmount)
    }
  })

  it('activeLevel=3 + hasCust=true: 3-factor 恒等式 (cust + qty + price ≈ totalChange)', () => {
    const items = computeFactorItems(
      { cur: curRecords, prev: prevRecords },
      'dept',
      3,
      true,
      150,
      200,
      false,
    )
    for (const item of items) {
      const sum = item.custEffect + item.qtyEffect + item.priceEffect
      expect(sum).toBeCloseTo(item.totalChange, 3)
    }
  })

  it('activeLevel=3 + hasCust=false + qty>0: qty/price へ decompose2 で配分', () => {
    const items = computeFactorItems(
      { cur: curRecords, prev: prevRecords },
      'dept',
      3,
      false,
      0,
      0,
      false,
    )
    for (const item of items) {
      expect(item.custEffect).toBe(0)
      expect(item.qtyEffect + item.priceEffect).toBeCloseTo(item.totalChange, 3)
    }
  })

  it('activeLevel=3 + prevQty=0 (qty データ無): 差分は全て priceEffect', () => {
    const cur = [makeRec('D1', 'L1', 'K1', 10, 1000)]
    const prev = [makeRec('D1', 'L1', 'K1', 0, 500)]
    const items = computeFactorItems({ cur, prev }, 'dept', 3, false, 0, 0, false)
    expect(items[0].qtyEffect).toBe(0)
    expect(items[0].priceEffect).toBe(500)
  })

  it('activeLevel=5: sub-record 粒度が必要 — 5-factor 恒等式 (cust + qty + pricePure + mix ≈ totalChange)', () => {
    // D1 の下に複数 line を配置して mix 効果を発生させる
    const cur = [makeRec('D1', 'L1', 'K1', 60, 6000), makeRec('D1', 'L2', 'K2', 40, 6000)]
    const prev = [makeRec('D1', 'L1', 'K1', 50, 5000), makeRec('D1', 'L2', 'K2', 40, 5000)]
    const items = computeFactorItems({ cur, prev }, 'dept', 5, true, 90, 100, false)
    expect(items).toHaveLength(1)
    const item = items[0]
    const sum = item.custEffect + item.qtyEffect + item.pricePureEffect + item.mixEffect
    expect(sum).toBeCloseTo(item.totalChange, 3)
  })

  it('activeLevel=5 + hasCust=false + qty>0: qty + pricePure + mix で配分', () => {
    const cur = [makeRec('D1', 'L1', 'K1', 60, 6000), makeRec('D1', 'L2', 'K2', 40, 6000)]
    const prev = [makeRec('D1', 'L1', 'K1', 50, 5000), makeRec('D1', 'L2', 'K2', 40, 5000)]
    const items = computeFactorItems({ cur, prev }, 'dept', 5, false, 0, 0, false)
    const item = items[0]
    expect(item.custEffect).toBe(0)
    const sum = item.qtyEffect + item.pricePureEffect + item.mixEffect
    expect(sum).toBeCloseTo(item.totalChange, 3)
  })

  it('activeLevel=5 + prev qty=0: 差分は pricePureEffect に集約', () => {
    const cur = [makeRec('D1', 'L1', 'K1', 10, 1000)]
    const prev = [makeRec('D1', 'L1', 'K1', 0, 500)]
    const items = computeFactorItems({ cur, prev }, 'dept', 5, false, 0, 0, false)
    expect(items[0].qtyEffect).toBe(0)
    expect(items[0].mixEffect).toBe(0)
    expect(items[0].pricePureEffect).toBe(500)
  })

  it('compact=true → 最大 8 件 / compact=false → 最大 12 件', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      makeRec(`D${i}`, `L${i}`, `K${i}`, 10, 1000 + i * 100),
    )
    const prev = Array.from({ length: 20 }, (_, i) => makeRec(`D${i}`, `L${i}`, `K${i}`, 10, 1000))
    const compact = computeFactorItems({ cur: many, prev }, 'dept', 2, false, 0, 0, true)
    const full = computeFactorItems({ cur: many, prev }, 'dept', 2, false, 0, 0, false)
    expect(compact).toHaveLength(8)
    expect(full).toHaveLength(12)
  })

  it('totalChange 絶対値降順でソート', () => {
    const items = computeFactorItems(
      { cur: curRecords, prev: prevRecords },
      'dept',
      2,
      false,
      0,
      0,
      false,
    )
    for (let i = 1; i < items.length; i++) {
      expect(Math.abs(items[i - 1].totalChange)).toBeGreaterThanOrEqual(
        Math.abs(items[i].totalChange),
      )
    }
  })

  it('cur 側のみ存在する code / prev 側のみ存在する code の両方を含む (allCodes union)', () => {
    const cur = [makeRec('D1', 'L1', 'K1', 10, 1000)]
    const prev = [makeRec('D2', 'L2', 'K2', 20, 2000)]
    const items = computeFactorItems({ cur, prev }, 'dept', 2, false, 0, 0, false)
    expect(items.map((i) => i.code).sort()).toEqual(['D1', 'D2'])
    const d1 = items.find((i) => i.code === 'D1')!
    expect(d1.curAmount).toBe(1000)
    expect(d1.prevAmount).toBe(0)
    const d2 = items.find((i) => i.code === 'D2')!
    expect(d2.curAmount).toBe(0)
    expect(d2.prevAmount).toBe(2000)
  })

  it('hasChildren: dept level + 子 line が複数なら true', () => {
    const cur = [makeRec('D1', 'L1', 'K1', 10, 1000), makeRec('D1', 'L2', 'K2', 10, 1000)]
    const items = computeFactorItems({ cur, prev: [] }, 'dept', 2, false, 0, 0, false)
    expect(items.find((i) => i.code === 'D1')!.hasChildren).toBe(true)
  })

  it('hasChildren: class level は末端のため常に false', () => {
    const cur = [makeRec('D1', 'L1', 'K1', 10, 1000)]
    const items = computeFactorItems({ cur, prev: [] }, 'class', 2, false, 0, 0, false)
    expect(items[0].hasChildren).toBe(false)
  })

  it('currentLevel=line: line 単位で集計 (klass を跨いで合算)', () => {
    const cur = [
      makeRec('D1', 'L1', 'K1', 10, 1000),
      makeRec('D1', 'L1', 'K2', 20, 2000),
      makeRec('D1', 'L2', 'K3', 30, 3000),
    ]
    const items = computeFactorItems({ cur, prev: [] }, 'line', 2, false, 0, 0, false)
    expect(items.map((i) => i.code).sort()).toEqual(['L1', 'L2'])
    expect(items.find((i) => i.code === 'L1')!.curAmount).toBe(3000)
    expect(items.find((i) => i.code === 'L2')!.curAmount).toBe(3000)
  })

  it('currentLevel=class: klass 単位で集計 + hasChildren は false', () => {
    const cur = [makeRec('D1', 'L1', 'K1', 10, 1000), makeRec('D1', 'L1', 'K2', 20, 2000)]
    const items = computeFactorItems({ cur, prev: [] }, 'class', 2, false, 0, 0, false)
    expect(items.map((i) => i.code).sort()).toEqual(['K1', 'K2'])
    for (const item of items) {
      expect(item.hasChildren).toBe(false)
    }
  })
})
