/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  computeCategoryTotals,
  computeRowMetrics,
  computeStoreGrossProfit,
} from '@/features/category/application/CategoryTotalView.vm'

describe('computeCategoryTotals', () => {
  it('sums cost and price and derives gross profit', () => {
    const data = [
      { cost: 700, price: 1000 },
      { cost: 300, price: 500 },
    ]
    const totals = computeCategoryTotals(data)
    expect(totals.totalCost).toBe(1000)
    expect(totals.totalPrice).toBe(1500)
    expect(totals.totalGrossProfit).toBe(500)
    expect(totals.overallMarkupRate).toBeCloseTo(500 / 1500, 5)
    expect(totals.totalAbsCost).toBe(1000)
    expect(totals.totalAbsPrice).toBe(1500)
  })

  it('uses absolute values for shares', () => {
    const data = [
      { cost: -400, price: -500 },
      { cost: 600, price: 1000 },
    ]
    const totals = computeCategoryTotals(data)
    expect(totals.totalCost).toBe(200)
    expect(totals.totalPrice).toBe(500)
    expect(totals.totalAbsCost).toBe(1000)
    expect(totals.totalAbsPrice).toBe(1500)
  })

  it('handles empty input', () => {
    const totals = computeCategoryTotals([])
    expect(totals.totalCost).toBe(0)
    expect(totals.totalPrice).toBe(0)
    expect(totals.totalGrossProfit).toBe(0)
    expect(totals.overallMarkupRate).toBe(0)
    expect(totals.totalAbsCost).toBe(0)
    expect(totals.totalAbsPrice).toBe(0)
  })

  it('returns zero markup rate when total price is zero', () => {
    const totals = computeCategoryTotals([{ cost: 100, price: 0 }])
    expect(totals.totalGrossProfit).toBe(-100)
    expect(totals.overallMarkupRate).toBe(0)
  })

  it('handles single row', () => {
    const totals = computeCategoryTotals([{ cost: 250, price: 1000 }])
    expect(totals.totalCost).toBe(250)
    expect(totals.totalPrice).toBe(1000)
    expect(totals.totalGrossProfit).toBe(750)
    expect(totals.overallMarkupRate).toBeCloseTo(0.75, 5)
  })
})

describe('computeRowMetrics', () => {
  it('computes grossProfit, costShare, priceShare', () => {
    const m = computeRowMetrics(200, 500, 1000, 2000)
    expect(m.grossProfit).toBe(300)
    expect(m.costShare).toBeCloseTo(0.2, 5)
    expect(m.priceShare).toBeCloseTo(0.25, 5)
  })

  it('uses absolute value for shares when inputs are negative', () => {
    const m = computeRowMetrics(-200, -500, 1000, 2000)
    expect(m.grossProfit).toBe(-300)
    expect(m.costShare).toBeCloseTo(0.2, 5)
    expect(m.priceShare).toBeCloseTo(0.25, 5)
  })

  it('returns zero shares when totals are zero', () => {
    const m = computeRowMetrics(100, 200, 0, 0)
    expect(m.grossProfit).toBe(100)
    expect(m.costShare).toBe(0)
    expect(m.priceShare).toBe(0)
  })

  it('grossProfit is price - cost', () => {
    expect(computeRowMetrics(0, 0, 100, 100).grossProfit).toBe(0)
    expect(computeRowMetrics(50, 150, 1000, 1000).grossProfit).toBe(100)
  })

  it('returns full shares when total equals the single row', () => {
    const m = computeRowMetrics(100, 300, 100, 300)
    expect(m.costShare).toBe(1)
    expect(m.priceShare).toBe(1)
  })
})

describe('computeStoreGrossProfit', () => {
  it('computes grossProfit and markupRate', () => {
    const r = computeStoreGrossProfit(700, 1000)
    expect(r.grossProfit).toBe(300)
    expect(r.markupRate).toBeCloseTo(0.3, 5)
  })

  it('returns zero markup when store price is zero', () => {
    const r = computeStoreGrossProfit(100, 0)
    expect(r.grossProfit).toBe(-100)
    expect(r.markupRate).toBe(0)
  })

  it('handles zero cost', () => {
    const r = computeStoreGrossProfit(0, 500)
    expect(r.grossProfit).toBe(500)
    expect(r.markupRate).toBe(1)
  })

  it('handles negative grossProfit (loss)', () => {
    const r = computeStoreGrossProfit(1200, 1000)
    expect(r.grossProfit).toBe(-200)
    expect(r.markupRate).toBeCloseTo(-0.2, 5)
  })

  it('handles large values', () => {
    const r = computeStoreGrossProfit(700_000, 1_000_000)
    expect(r.grossProfit).toBe(300_000)
    expect(r.markupRate).toBeCloseTo(0.3, 5)
  })
})
