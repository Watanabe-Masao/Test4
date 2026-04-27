/**
 * CategoryTotalView ViewModel tests
 *
 * The presentation file is a re-export; the implementation lives in
 * features/category/application. We test via the public presentation path.
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  computeCategoryTotals,
  computeRowMetrics,
  computeStoreGrossProfit,
} from './CategoryTotalView.vm'

describe('computeCategoryTotals', () => {
  it('returns zeroed totals for an empty list', () => {
    const t = computeCategoryTotals([])
    expect(t.totalCost).toBe(0)
    expect(t.totalPrice).toBe(0)
    expect(t.totalGrossProfit).toBe(0)
    expect(t.overallMarkupRate).toBe(0)
    expect(t.totalAbsCost).toBe(0)
    expect(t.totalAbsPrice).toBe(0)
  })

  it('sums cost and price and derives gross profit and markup rate', () => {
    const data = [
      { cost: 70, price: 100 },
      { cost: 30, price: 50 },
    ]
    const t = computeCategoryTotals(data)
    expect(t.totalCost).toBe(100)
    expect(t.totalPrice).toBe(150)
    expect(t.totalGrossProfit).toBe(50)
    // markupRate = grossProfit / price = 50 / 150
    expect(t.overallMarkupRate).toBeCloseTo(50 / 150, 10)
    expect(t.totalAbsCost).toBe(100)
    expect(t.totalAbsPrice).toBe(150)
  })

  it('sums absolute values for abs totals when negative entries exist', () => {
    const data = [
      { cost: 100, price: 200 },
      { cost: -30, price: -60 }, // return adjustment
    ]
    const t = computeCategoryTotals(data)
    expect(t.totalCost).toBe(70)
    expect(t.totalPrice).toBe(140)
    expect(t.totalGrossProfit).toBe(70)
    expect(t.totalAbsCost).toBe(130)
    expect(t.totalAbsPrice).toBe(260)
  })
})

describe('computeRowMetrics', () => {
  it('computes gross profit and shares against abs totals', () => {
    const m = computeRowMetrics(40, 100, 200, 500)
    expect(m.grossProfit).toBe(60)
    expect(m.costShare).toBeCloseTo(40 / 200, 10)
    expect(m.priceShare).toBeCloseTo(100 / 500, 10)
  })

  it('handles negative values by taking absolute share and keeping signed gross profit', () => {
    const m = computeRowMetrics(-30, -60, 200, 500)
    expect(m.grossProfit).toBe(-30)
    expect(m.costShare).toBeCloseTo(30 / 200, 10)
    expect(m.priceShare).toBeCloseTo(60 / 500, 10)
  })

  it('returns zero share when totals are zero (safe divide)', () => {
    const m = computeRowMetrics(0, 0, 0, 0)
    expect(m.grossProfit).toBe(0)
    expect(m.costShare).toBe(0)
    expect(m.priceShare).toBe(0)
  })
})

describe('computeStoreGrossProfit', () => {
  it('returns gross profit and markup rate for positive values', () => {
    const r = computeStoreGrossProfit(60, 100)
    expect(r.grossProfit).toBe(40)
    expect(r.markupRate).toBeCloseTo(0.4, 10)
  })

  it('returns zero markup rate when store price is zero', () => {
    const r = computeStoreGrossProfit(0, 0)
    expect(r.grossProfit).toBe(0)
    expect(r.markupRate).toBe(0)
  })

  it('handles negative gross profit', () => {
    const r = computeStoreGrossProfit(120, 100)
    expect(r.grossProfit).toBe(-20)
    expect(r.markupRate).toBeCloseTo(-0.2, 10)
  })
})
