/**
 * Phase 6.5-5b: `aggregateTotalQuantity` は `CategoryTimeSalesRecord[]` から
 * `CategoryDailySeries | null` 入力に切替。projection 側 (Phase 6.5-2) が
 * `grandTotals.salesQty` を事前計算しているため、本関数は pass-through になる。
 */
import { describe, it, expect } from 'vitest'
import { aggregateTotalQuantity } from '../YoYWaterfallChart.vm'
import type { CategoryDailySeries } from '@/application/hooks/categoryDaily/CategoryDailyBundle.types'

function makeSeries(salesQty: number): CategoryDailySeries {
  return {
    entries: [],
    grandTotals: { sales: 0, customers: 0, salesQty },
    dayCount: 0,
  }
}

describe('aggregateTotalQuantity (Phase 6.5-5b — CategoryDailySeries pass-through)', () => {
  it('returns 0 for null series (bundle 未ロード)', () => {
    expect(aggregateTotalQuantity(null)).toBe(0)
  })

  it('returns grandTotals.salesQty from a populated series', () => {
    expect(aggregateTotalQuantity(makeSeries(60))).toBe(60)
  })

  it('returns 0 for a zero-series', () => {
    expect(aggregateTotalQuantity(makeSeries(0))).toBe(0)
  })

  it('handles large values', () => {
    expect(aggregateTotalQuantity(makeSeries(123_456))).toBe(123_456)
  })

  it('handles negative values (pass-through)', () => {
    expect(aggregateTotalQuantity(makeSeries(-10))).toBe(-10)
  })
})
