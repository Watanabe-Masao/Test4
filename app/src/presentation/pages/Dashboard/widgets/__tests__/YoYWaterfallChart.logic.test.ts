import { describe, it, expect } from 'vitest'
import {
  aggregatePeriodCurSales,
  aggregatePeriodPrevSales,
  calculatePISummary,
} from '../YoYWaterfallChart.logic'
import type { DailyRecord } from '@/domain/models/record'

// 比較先 DateRange 解決のテストは Phase 2 で domain resolver に移管された:
// → src/domain/models/__tests__/comparisonRangeResolver.test.ts
// builders 経由のテストは waterfallBuildersBatch.test.ts で確認する。
//
// Phase 6.5-5b: logic.ts の未使用 dummy arg (_periodCTS / _periodPrevCTS) を
// 削除したため、EMPTY_CTS fixture は不要になった。

const makeDaily = (
  map: Record<number, { sales?: number; customers?: number }>,
): ReadonlyMap<number, DailyRecord> => {
  const m = new Map<number, DailyRecord>()
  for (const [k, v] of Object.entries(map)) {
    m.set(Number(k), {
      sales: v.sales ?? 0,
      customers: v.customers ?? 0,
    } as unknown as DailyRecord)
  }
  return m
}

describe('aggregatePeriodCurSales', () => {
  it('sums sales and customers within range', () => {
    const daily = makeDaily({
      1: { sales: 100, customers: 10 },
      2: { sales: 200, customers: 20 },
      3: { sales: 300, customers: 30 },
      4: { sales: 400, customers: 40 },
    })
    const r = aggregatePeriodCurSales(daily, 2, 3)
    expect(r).toEqual({ sales: 500, customers: 50 })
  })

  it('returns zero when daily is empty', () => {
    const r = aggregatePeriodCurSales(new Map(), 1, 31)
    expect(r).toEqual({ sales: 0, customers: 0 })
  })

  it('treats null sales/customers as 0', () => {
    const daily = new Map<number, DailyRecord>()
    daily.set(1, { sales: null, customers: null } as unknown as DailyRecord)
    daily.set(2, { sales: 50, customers: 5 } as unknown as DailyRecord)
    const r = aggregatePeriodCurSales(daily, 1, 2)
    expect(r).toEqual({ sales: 50, customers: 5 })
  })
})

describe('aggregatePeriodPrevSales', () => {
  it('wow: uses daily with wowPrev range', () => {
    const daily = makeDaily({
      1: { sales: 100, customers: 10 },
      2: { sales: 200, customers: 20 },
      8: { sales: 500, customers: 50 },
    })
    const r = aggregatePeriodPrevSales('wow', daily, new Map(), 8, 8, 1, 2, 2025, 5)
    expect(r).toEqual({ sales: 300, customers: 30 })
  })

  it('yoy: uses prevDaily via date key', () => {
    const prev = new Map<string, { sales: number; discount: number; customers: number }>()
    prev.set('2025-05-01', { sales: 100, discount: 0, customers: 10 })
    prev.set('2025-05-02', { sales: 200, discount: 0, customers: 20 })
    prev.set('2025-05-03', { sales: 300, discount: 0, customers: 30 })
    const r = aggregatePeriodPrevSales('yoy', new Map(), prev, 1, 2, 0, 0, 2025, 5)
    expect(r).toEqual({ sales: 300, customers: 30 })
  })

  it('yoy: missing prev entries contribute zero', () => {
    const prev = new Map<string, { sales: number; discount: number; customers: number }>()
    const r = aggregatePeriodPrevSales('yoy', new Map(), prev, 1, 3, 0, 0, 2025, 5)
    expect(r).toEqual({ sales: 0, customers: 0 })
  })
})

describe('calculatePISummary', () => {
  const pi = (qty: number, cust: number) => (cust > 0 ? qty / cust : 0)
  const ppi = (sales: number, qty: number) => (qty > 0 ? sales / qty : 0)

  it('returns null when activeLevel < 3', () => {
    expect(calculatePISummary(2, true, 10, 10, 100, 100, 1000, 1000, pi, ppi)).toBeNull()
  })

  it('returns null when !hasQuantity', () => {
    expect(calculatePISummary(3, false, 10, 10, 100, 100, 1000, 1000, pi, ppi)).toBeNull()
  })

  it('returns null when prevCust <= 0', () => {
    expect(calculatePISummary(3, true, 0, 10, 100, 100, 1000, 1000, pi, ppi)).toBeNull()
  })

  it('returns null when curCust <= 0', () => {
    expect(calculatePISummary(3, true, 10, 0, 100, 100, 1000, 1000, pi, ppi)).toBeNull()
  })

  it('computes PI/PPI when valid', () => {
    const r = calculatePISummary(3, true, 5, 10, 20, 50, 2000, 5000, pi, ppi)
    expect(r).toEqual({ prevPI: 4, curPI: 5, prevPPI: 100, curPPI: 100 })
  })
})
