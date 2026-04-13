import { describe, it, expect } from 'vitest'
import { aggregateYoYVarianceData } from '../YoYVarianceChart.vm'
import type { DailyRecord } from '@/domain/models/record'

const mkDaily = (
  entries: Record<number, { sales?: number; customers?: number; discountAbsolute?: number }>,
): ReadonlyMap<number, DailyRecord> => {
  const m = new Map<number, DailyRecord>()
  for (const [k, v] of Object.entries(entries)) {
    m.set(Number(k), {
      sales: v.sales ?? 0,
      customers: v.customers ?? 0,
      discountAbsolute: v.discountAbsolute ?? 0,
    } as unknown as DailyRecord)
  }
  return m
}

const mkPrev = (
  entries: Record<string, { sales: number; discount: number; customers?: number }>,
): ReadonlyMap<string, { sales: number; discount: number; customers?: number }> => {
  const m = new Map<string, { sales: number; discount: number; customers?: number }>()
  for (const [k, v] of Object.entries(entries)) {
    m.set(k, v)
  }
  return m
}

describe('aggregateYoYVarianceData', () => {
  it('returns zeros for an empty month with no prev data', () => {
    const result = aggregateYoYVarianceData(new Map(), 3, 2025, 5, new Map())
    expect(result.chartData).toHaveLength(3)
    expect(result.totals).toEqual({ salesDiff: 0, discountDiff: 0, customerDiff: 0 })
    for (const row of result.chartData) {
      expect(row.salesDiff).toBe(0)
      expect(row.discountDiff).toBe(0)
      expect(row.customerDiff).toBe(0)
      expect(row.cumSalesDiff).toBe(0)
      expect(row.cumDiscountDiff).toBe(0)
      expect(row.cumCustomerDiff).toBe(0)
      // prev is zero → growth rates are null
      expect(row.salesGrowth).toBeNull()
      expect(row.customerGrowth).toBeNull()
      expect(row.txValueGrowth).toBeNull()
      expect(row.cumSalesGrowth).toBeNull()
      expect(row.cumCustomerGrowth).toBeNull()
      expect(row.cumTxValueGrowth).toBeNull()
    }
  })

  it('computes daily diffs and cumulative diffs', () => {
    const daily = mkDaily({
      1: { sales: 200, customers: 20, discountAbsolute: 10 },
      2: { sales: 150, customers: 15, discountAbsolute: 5 },
    })
    const prev = mkPrev({
      '2025-05-01': { sales: 100, discount: 5, customers: 10 },
      '2025-05-02': { sales: 200, discount: 10, customers: 20 },
    })
    const result = aggregateYoYVarianceData(daily, 2, 2025, 5, prev)
    expect(result.chartData).toHaveLength(2)

    const d1 = result.chartData[0]
    expect(d1.day).toBe(1)
    expect(d1.salesDiff).toBe(100)
    expect(d1.discountDiff).toBe(5)
    expect(d1.customerDiff).toBe(10)
    expect(d1.cumSalesDiff).toBe(100)
    expect(d1.cumDiscountDiff).toBe(5)
    expect(d1.cumCustomerDiff).toBe(10)
    // salesGrowth = (200 - 100) / 100 = 1
    expect(d1.salesGrowth).toBe(1)
    // customerGrowth = (20 - 10) / 10 = 1
    expect(d1.customerGrowth).toBe(1)

    const d2 = result.chartData[1]
    expect(d2.salesDiff).toBe(-50)
    expect(d2.discountDiff).toBe(-5)
    expect(d2.customerDiff).toBe(-5)
    // cumulative
    expect(d2.cumSalesDiff).toBe(50)
    expect(d2.cumDiscountDiff).toBe(0)
    expect(d2.cumCustomerDiff).toBe(5)
    // salesGrowth day2 = (150 - 200) / 200 = -0.25
    expect(d2.salesGrowth).toBe(-0.25)

    expect(result.totals).toEqual({ salesDiff: 50, discountDiff: 0, customerDiff: 5 })
  })

  it('growth rates are null when prev is zero', () => {
    const daily = mkDaily({ 1: { sales: 100, customers: 10 } })
    const result = aggregateYoYVarianceData(daily, 1, 2025, 5, new Map())
    const row = result.chartData[0]
    expect(row.salesDiff).toBe(100)
    expect(row.salesGrowth).toBeNull()
    expect(row.customerGrowth).toBeNull()
    expect(row.txValueGrowth).toBeNull()
    expect(row.cumSalesGrowth).toBeNull()
    expect(row.cumCustomerGrowth).toBeNull()
    expect(row.cumTxValueGrowth).toBeNull()
  })

  it('treats missing current day as zeros', () => {
    const daily = mkDaily({ 2: { sales: 100, customers: 10 } })
    const prev = mkPrev({
      '2025-05-01': { sales: 50, discount: 0, customers: 5 },
      '2025-05-02': { sales: 50, discount: 0, customers: 5 },
    })
    const result = aggregateYoYVarianceData(daily, 2, 2025, 5, prev)
    // Day 1 missing → cur = 0
    expect(result.chartData[0].salesDiff).toBe(-50)
    expect(result.chartData[0].customerDiff).toBe(-5)
    // salesGrowth = (0 - 50) / 50 = -1
    expect(result.chartData[0].salesGrowth).toBe(-1)
    expect(result.chartData[1].salesDiff).toBe(50)
    expect(result.chartData[1].customerDiff).toBe(5)
  })

  it('ma7 series has length = daysInMonth with leading nulls', () => {
    const entries: Record<number, { sales: number; customers: number }> = {}
    for (let d = 1; d <= 10; d++) entries[d] = { sales: 100, customers: 10 }
    const daily = mkDaily(entries)
    const result = aggregateYoYVarianceData(daily, 10, 2025, 5, new Map())
    expect(result.salesGrowthMa7).toHaveLength(10)
    // first 6 entries should be null (NaN → null)
    for (let i = 0; i < 6; i++) {
      expect(result.salesGrowthMa7[i]).toBeNull()
    }
    // 7th onward should be numeric
    expect(typeof result.salesGrowthMa7[6]).toBe('number')
    expect(result.customerGrowthMa7).toHaveLength(10)
    expect(result.txValueGrowthMa7).toHaveLength(10)
  })

  it('totals accumulate across the full month', () => {
    const daily = mkDaily({
      1: { sales: 500, customers: 50, discountAbsolute: 20 },
      2: { sales: 300, customers: 30, discountAbsolute: 10 },
      3: { sales: 200, customers: 20, discountAbsolute: 5 },
    })
    const prev = mkPrev({
      '2025-05-01': { sales: 400, discount: 10, customers: 40 },
      '2025-05-02': { sales: 400, discount: 10, customers: 40 },
      '2025-05-03': { sales: 400, discount: 10, customers: 40 },
    })
    const result = aggregateYoYVarianceData(daily, 3, 2025, 5, prev)
    expect(result.totals.salesDiff).toBe(1000 - 1200)
    expect(result.totals.discountDiff).toBe(35 - 30)
    expect(result.totals.customerDiff).toBe(100 - 120)
  })
})
