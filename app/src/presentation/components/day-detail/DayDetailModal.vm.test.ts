/**
 * DayDetailModal.vm — pure function tests
 *
 * 検証対象: computeCoreMetrics / computeCustomerMetrics / computeWowMetrics /
 * resolveActiveCompMode / computeComparisonLabels / computeBreakdown / computeCostItemRatio
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  DOW_NAMES,
  computeCoreMetrics,
  computeCustomerMetrics,
  computeWowMetrics,
  resolveActiveCompMode,
  computeComparisonLabels,
  computeBreakdown,
  computeCostItemRatio,
  type CompMode,
  type CostItem,
} from './DayDetailModal.vm'
import type { DailyRecord } from '@/domain/models/record'
import type { PrevYearData } from '@/application/hooks/analytics'

// ── Fixture builders ──

function makePrevYearData(
  entries: Array<[string, { sales: number; customers: number }]>,
): PrevYearData {
  return {
    daily: new Map(entries),
  } as unknown as PrevYearData
}

function makeDailyRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    sales: 0,
    customers: 0,
    totalCost: 0,
    purchase: { cost: 0, price: 0 },
    flowers: { cost: 0, price: 0 },
    directProduce: { cost: 0, price: 0 },
    interStoreIn: { cost: 0, price: 0 },
    interStoreOut: { cost: 0, price: 0 },
    interDepartmentIn: { cost: 0, price: 0 },
    interDepartmentOut: { cost: 0, price: 0 },
    ...overrides,
  } as unknown as DailyRecord
}

// ── DOW_NAMES ──

describe('DOW_NAMES', () => {
  it('has 7 entries starting with 日', () => {
    expect(DOW_NAMES).toHaveLength(7)
    expect(DOW_NAMES[0]).toBe('日')
    expect(DOW_NAMES[6]).toBe('土')
  })
})

// ── computeCoreMetrics ──

describe('computeCoreMetrics', () => {
  const prevYear = makePrevYearData([['2024-03-15', { sales: 800, customers: 40 }]])

  it('computes metrics for a present record', () => {
    const record = makeDailyRecord({ sales: 1000, customers: 50 })
    const result = computeCoreMetrics(record, 900, 9000, 10000, prevYear, 15, 3, 2024)
    expect(result.actual).toBe(1000)
    expect(result.diff).toBe(100) // 1000 - 900
    expect(result.ach).toBeCloseTo(1000 / 900)
    expect(result.cumDiff).toBe(1000) // 10000 - 9000
    expect(result.cumAch).toBeCloseTo(10000 / 9000)
    expect(result.pySales).toBe(800)
    expect(result.pyRatio).toBeCloseTo(1000 / 800)
    // 2024-03-15 は金曜
    expect(result.dayOfWeek).toBe('金')
  })

  it('handles undefined record (actual = 0)', () => {
    const result = computeCoreMetrics(undefined, 500, 1000, 200, prevYear, 15, 3, 2024)
    expect(result.actual).toBe(0)
    expect(result.diff).toBe(-500)
    expect(result.pySales).toBe(800)
  })

  it('returns 0 pySales when date not in prevYear map', () => {
    const record = makeDailyRecord({ sales: 100 })
    const result = computeCoreMetrics(record, 50, 50, 100, prevYear, 20, 3, 2024)
    expect(result.pySales).toBe(0)
    expect(result.pyRatio).toBe(0) // safeDivide → 0
  })
})

// ── computeCustomerMetrics ──

describe('computeCustomerMetrics', () => {
  const prevYear = makePrevYearData([['2024-03-15', { sales: 800, customers: 40 }]])

  it('computes daily and cumulative transaction values', () => {
    const record = makeDailyRecord({ sales: 1000, customers: 50 })
    const result = computeCustomerMetrics(
      record,
      1000,
      800,
      prevYear,
      15,
      5000,
      100,
      4000,
      80,
      2024,
      3,
    )
    expect(result.dayCust).toBe(50)
    expect(result.dayTxVal).toBe(20) // 1000/50
    expect(result.pyCust).toBe(40)
    expect(result.pyTxVal).toBe(20) // 800/40
    expect(result.cumTxVal).toBe(50) // 5000/100
    expect(result.cumPrevTxVal).toBe(50) // 4000/80
    expect(result.custRatio).toBeCloseTo(50 / 40)
    expect(result.txValRatio).toBe(1) // 20/20
  })

  it('handles undefined record', () => {
    const result = computeCustomerMetrics(undefined, 0, 0, prevYear, 15, 0, 0, 0, 0, 2024, 3)
    expect(result.dayCust).toBe(0)
    expect(result.dayTxVal).toBe(0)
  })

  it('returns 0 pyCust when date missing', () => {
    const record = makeDailyRecord({ sales: 100, customers: 10 })
    const result = computeCustomerMetrics(record, 100, 0, prevYear, 99, 100, 10, 0, 0, 2024, 3)
    expect(result.pyCust).toBe(0)
    expect(result.pyTxVal).toBe(0)
  })
})

// ── computeWowMetrics ──

describe('computeWowMetrics', () => {
  it('returns canWoW = false when day <= 7', () => {
    const result = computeWowMetrics(5, new Map())
    expect(result.wowPrevDay).toBe(-2)
    expect(result.canWoW).toBe(false)
    expect(result.wowPrevSales).toBe(0)
    expect(result.wowPrevCust).toBe(0)
  })

  it('returns canWoW = true when day = 8', () => {
    const dailyMap = new Map<number, DailyRecord>([
      [1, makeDailyRecord({ sales: 500, customers: 25 })],
    ])
    const result = computeWowMetrics(8, dailyMap)
    expect(result.wowPrevDay).toBe(1)
    expect(result.canWoW).toBe(true)
    expect(result.wowPrevSales).toBe(500)
    expect(result.wowPrevCust).toBe(25)
  })

  it('handles missing daily record', () => {
    const result = computeWowMetrics(10, new Map())
    expect(result.canWoW).toBe(true)
    expect(result.wowPrevSales).toBe(0)
    expect(result.wowPrevCust).toBe(0)
  })

  it('handles undefined dailyMap', () => {
    const result = computeWowMetrics(10, undefined)
    expect(result.canWoW).toBe(true)
    expect(result.wowPrevSales).toBe(0)
  })
})

// ── resolveActiveCompMode ──

describe('resolveActiveCompMode', () => {
  it('returns yoy when compMode is yoy', () => {
    expect(resolveActiveCompMode('yoy' as CompMode, true)).toBe('yoy')
    expect(resolveActiveCompMode('yoy' as CompMode, false)).toBe('yoy')
  })

  it('returns wow when wow and canWoW is true', () => {
    expect(resolveActiveCompMode('wow' as CompMode, true)).toBe('wow')
  })

  it('falls back to yoy when wow but canWoW is false', () => {
    expect(resolveActiveCompMode('wow' as CompMode, false)).toBe('yoy')
  })
})

// ── computeComparisonLabels ──

describe('computeComparisonLabels', () => {
  it('builds yoy labels', () => {
    const labels = computeComparisonLabels('yoy', 15, 8, 111, 22, 900, 40)
    expect(labels.compSales).toBe(900)
    expect(labels.compCust).toBe(40)
    expect(labels.compLabel).toBe('前年')
    expect(labels.curCompLabel).toBe('当年')
  })

  it('builds wow labels', () => {
    const labels = computeComparisonLabels('wow', 15, 8, 111, 22, 900, 40)
    expect(labels.compSales).toBe(111)
    expect(labels.compCust).toBe(22)
    expect(labels.compLabel).toBe('8日')
    expect(labels.curCompLabel).toBe('15日')
  })
})

// ── computeBreakdown ──

describe('computeBreakdown', () => {
  it('filters out zero-cost zero-price items', () => {
    const record = makeDailyRecord({
      totalCost: 1000,
      purchase: { cost: 400, price: 600 },
      flowers: { cost: 0, price: 0 },
      directProduce: { cost: 200, price: 300 },
    })
    const bd = computeBreakdown(record)
    expect(bd.totalCost).toBe(1000)
    expect(bd.costItems).toHaveLength(2)
    expect(bd.costItems[0].label).toBe('仕入（在庫）')
    expect(bd.costItems[1].label).toBe('産直')
    // totalPrice = |600| + |300| = 900
    expect(bd.totalPrice).toBe(900)
  })

  it('keeps items where only price is non-zero', () => {
    const record = makeDailyRecord({
      totalCost: 0,
      purchase: { cost: 0, price: 100 },
    })
    const bd = computeBreakdown(record)
    expect(bd.costItems).toHaveLength(1)
    expect(bd.costItems[0].price).toBe(100)
  })

  it('sums absolute values for negative prices (inter-store-out)', () => {
    const record = makeDailyRecord({
      totalCost: 500,
      purchase: { cost: 300, price: 400 },
      interStoreOut: { cost: -100, price: -200 },
    })
    const bd = computeBreakdown(record)
    expect(bd.costItems).toHaveLength(2)
    // totalPrice = |400| + |-200| = 600
    expect(bd.totalPrice).toBe(600)
  })

  it('returns empty items when all zero', () => {
    const record = makeDailyRecord({ totalCost: 0 })
    const bd = computeBreakdown(record)
    expect(bd.costItems).toEqual([])
    expect(bd.totalPrice).toBe(0)
    expect(bd.totalCost).toBe(0)
  })
})

// ── computeCostItemRatio ──

describe('computeCostItemRatio', () => {
  it('computes share against total', () => {
    const item: CostItem = { label: 'A', cost: 100, price: 300 }
    expect(computeCostItemRatio(item, 1000)).toBeCloseTo(0.3)
  })

  it('uses absolute price value', () => {
    const item: CostItem = { label: 'A', cost: 100, price: -250 }
    expect(computeCostItemRatio(item, 1000)).toBeCloseTo(0.25)
  })

  it('returns 0 when total is 0', () => {
    const item: CostItem = { label: 'A', cost: 100, price: 200 }
    expect(computeCostItemRatio(item, 0)).toBe(0)
  })
})
