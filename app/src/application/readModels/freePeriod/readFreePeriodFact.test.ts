import { describe, it, expect } from 'vitest'
import { computeFreePeriodSummary } from './readFreePeriodFact'
import type { FreePeriodDailyRow } from './FreePeriodTypes'

function makeRow(overrides: Partial<FreePeriodDailyRow> = {}): FreePeriodDailyRow {
  return {
    storeId: 's1',
    dateKey: '2025-03-01',
    day: 1,
    dow: 6,
    sales: 10000,
    customers: 50,
    purchaseCost: 7000,
    purchasePrice: 8000,
    discount: 500,
    isPrevYear: false,
    ...overrides,
  }
}

describe('computeFreePeriodSummary', () => {
  it('空配列で全値ゼロ', () => {
    const summary = computeFreePeriodSummary([])
    expect(summary.storeCount).toBe(0)
    expect(summary.dayCount).toBe(0)
    expect(summary.totalSales).toBe(0)
    expect(summary.averageDailySales).toBe(0)
    expect(summary.transactionValue).toBe(0)
    expect(summary.discountRate).toBe(0)
  })

  it('単一行で正しく集計', () => {
    const summary = computeFreePeriodSummary([makeRow()])
    expect(summary.storeCount).toBe(1)
    expect(summary.dayCount).toBe(1)
    expect(summary.totalSales).toBe(10000)
    expect(summary.totalCustomers).toBe(50)
    expect(summary.totalPurchaseCost).toBe(7000)
    expect(summary.totalDiscount).toBe(500)
    expect(summary.averageDailySales).toBe(10000)
    expect(summary.transactionValue).toBe(200)
  })

  it('複数店舗・複数日の集計', () => {
    const rows = [
      makeRow({ storeId: 's1', dateKey: '2025-03-01', sales: 10000, customers: 50 }),
      makeRow({ storeId: 's2', dateKey: '2025-03-01', sales: 20000, customers: 100 }),
      makeRow({ storeId: 's1', dateKey: '2025-03-02', sales: 15000, customers: 60 }),
      makeRow({ storeId: 's2', dateKey: '2025-03-02', sales: 25000, customers: 120 }),
    ]
    const summary = computeFreePeriodSummary(rows)
    expect(summary.storeCount).toBe(2)
    expect(summary.dayCount).toBe(2)
    expect(summary.totalSales).toBe(70000)
    expect(summary.totalCustomers).toBe(330)
    expect(summary.averageDailySales).toBe(35000)
  })

  it('売変率の計算', () => {
    const rows = [makeRow({ sales: 9500, discount: 500 })]
    const summary = computeFreePeriodSummary(rows)
    // discountRate = 500 / (9500 + 500) = 0.05
    expect(summary.discountRate).toBeCloseTo(0.05, 4)
  })

  it('客数ゼロで客単価ゼロ', () => {
    const rows = [makeRow({ customers: 0 })]
    const summary = computeFreePeriodSummary(rows)
    expect(summary.transactionValue).toBe(0)
  })

  it('月跨ぎ（同じ day 番号でも dateKey が異なれば別日として集計）', () => {
    const rows = [
      makeRow({ storeId: 's1', dateKey: '2025-03-31', day: 31, sales: 10000 }),
      makeRow({ storeId: 's1', dateKey: '2025-04-01', day: 1, sales: 15000 }),
      makeRow({ storeId: 's1', dateKey: '2025-04-01', day: 1, sales: 5000 }),
    ]
    const summary = computeFreePeriodSummary(rows)
    expect(summary.dayCount).toBe(2) // 3月31日 + 4月1日
    expect(summary.totalSales).toBe(30000)
    expect(summary.averageDailySales).toBe(15000)
  })
})
