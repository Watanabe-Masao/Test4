import { describe, it, expect } from 'vitest'
import { computeFreePeriodSummary, prorateBudget } from './readFreePeriodFact'
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
    expect(summary.proratedBudget).toBeNull()
    expect(summary.budgetAchievementRate).toBeNull()
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
    expect(summary.dayCount).toBe(2)
    expect(summary.totalSales).toBe(30000)
    expect(summary.averageDailySales).toBe(15000)
  })

  it('予算なしで proratedBudget / budgetAchievementRate が null', () => {
    const summary = computeFreePeriodSummary([makeRow()])
    expect(summary.proratedBudget).toBeNull()
    expect(summary.budgetAchievementRate).toBeNull()
  })

  it('予算ありで達成率を計算', () => {
    const summary = computeFreePeriodSummary([makeRow({ sales: 8000 })], { proratedBudget: 10000 })
    expect(summary.proratedBudget).toBe(10000)
    expect(summary.budgetAchievementRate).toBeCloseTo(0.8, 4)
  })

  it('予算ゼロで達成率 null', () => {
    const summary = computeFreePeriodSummary([makeRow()], { proratedBudget: 0 })
    expect(summary.proratedBudget).toBe(0)
    expect(summary.budgetAchievementRate).toBeNull()
  })
})

// ── 不変条件: grand total = Σrows ──

describe('parity invariant: summary.totalSales = Σ rows.sales', () => {
  it('複数店舗・複数日で total = Σ', () => {
    const rows = [
      makeRow({ storeId: 's1', dateKey: '2025-03-01', sales: 12345 }),
      makeRow({ storeId: 's2', dateKey: '2025-03-01', sales: 67890 }),
      makeRow({ storeId: 's1', dateKey: '2025-03-02', sales: 11111 }),
    ]
    const summary = computeFreePeriodSummary(rows)
    const sumFromRows = rows.reduce((acc, r) => acc + r.sales, 0)
    expect(summary.totalSales).toBe(sumFromRows)
  })

  it('全フィールドで total = Σ', () => {
    const rows = [
      makeRow({ sales: 100, customers: 10, purchaseCost: 70, discount: 5 }),
      makeRow({
        dateKey: '2025-03-02',
        sales: 200,
        customers: 20,
        purchaseCost: 140,
        discount: 10,
      }),
    ]
    const summary = computeFreePeriodSummary(rows)
    expect(summary.totalSales).toBe(300)
    expect(summary.totalCustomers).toBe(30)
    expect(summary.totalPurchaseCost).toBe(210)
    expect(summary.totalDiscount).toBe(15)
  })
})

// ── 不変条件: 期間分割和 ──

describe('parity invariant: 期間分割和', () => {
  it('Jan + Feb = Jan1〜FebEnd の合算と一致', () => {
    const janRows = [
      makeRow({ dateKey: '2025-01-15', day: 15, sales: 50000, customers: 200 }),
      makeRow({ dateKey: '2025-01-31', day: 31, sales: 60000, customers: 250 }),
    ]
    const febRows = [
      makeRow({ dateKey: '2025-02-10', day: 10, sales: 40000, customers: 180 }),
      makeRow({ dateKey: '2025-02-28', day: 28, sales: 55000, customers: 220 }),
    ]
    const allRows = [...janRows, ...febRows]

    const janSummary = computeFreePeriodSummary(janRows)
    const febSummary = computeFreePeriodSummary(febRows)
    const allSummary = computeFreePeriodSummary(allRows)

    expect(allSummary.totalSales).toBe(janSummary.totalSales + febSummary.totalSales)
    expect(allSummary.totalCustomers).toBe(janSummary.totalCustomers + febSummary.totalCustomers)
    expect(allSummary.dayCount).toBe(janSummary.dayCount + febSummary.dayCount)
  })
})

// ── 不変条件: 月末境界 ──

describe('parity invariant: 月末境界', () => {
  it('28/29/30/31 日の差でサマリー計算が壊れない', () => {
    const feb28 = [makeRow({ dateKey: '2025-02-28', day: 28, sales: 10000 })]
    const mar31 = [makeRow({ dateKey: '2025-03-31', day: 31, sales: 10000 })]
    const apr30 = [makeRow({ dateKey: '2025-04-30', day: 30, sales: 10000 })]

    expect(computeFreePeriodSummary(feb28).dayCount).toBe(1)
    expect(computeFreePeriodSummary(mar31).dayCount).toBe(1)
    expect(computeFreePeriodSummary(apr30).dayCount).toBe(1)
    // 全て同じ sales なら averageDailySales も同じ
    expect(computeFreePeriodSummary(feb28).averageDailySales).toBe(10000)
    expect(computeFreePeriodSummary(mar31).averageDailySales).toBe(10000)
    expect(computeFreePeriodSummary(apr30).averageDailySales).toBe(10000)
  })

  it('leap year 2月29日も正常処理', () => {
    const leapDay = [makeRow({ dateKey: '2024-02-29', day: 29, sales: 12000 })]
    const summary = computeFreePeriodSummary(leapDay)
    expect(summary.dayCount).toBe(1)
    expect(summary.totalSales).toBe(12000)
  })
})

// ── 不変条件: 欠損とゼロの区別 ──

describe('parity invariant: 欠損とゼロ', () => {
  it('sales=0 の行はカウントに含まれる（欠損ではない）', () => {
    const rows = [
      makeRow({ dateKey: '2025-03-01', sales: 0, customers: 0 }),
      makeRow({ dateKey: '2025-03-02', sales: 10000, customers: 50 }),
    ]
    const summary = computeFreePeriodSummary(rows)
    expect(summary.dayCount).toBe(2) // 0 も 1 日としてカウント
    expect(summary.storeCount).toBe(1)
    expect(summary.totalSales).toBe(10000)
    expect(summary.averageDailySales).toBe(5000) // 10000 / 2
  })

  it('budget なし = proratedBudget null（0 ではない）', () => {
    const summary = computeFreePeriodSummary([makeRow()])
    expect(summary.proratedBudget).toBeNull()
    expect(summary.proratedBudget).not.toBe(0)
  })
})

// ── prorateBudget ──

describe('prorateBudget', () => {
  it('日別予算がある場合、対象日のみ合算', () => {
    const budgets = new Map([
      [
        '2025-3',
        {
          total: 310000,
          daily: new Map([
            [1, 10000],
            [2, 10000],
            [3, 10000],
          ]),
        },
      ],
    ])
    const dateKeys = new Set(['2025-03-01', '2025-03-02'])
    expect(prorateBudget(budgets, dateKeys)).toBe(20000)
  })

  it('日別予算がない場合、月予算を日割り', () => {
    const budgets = new Map([['2025-3', { total: 310000 }]])
    const dateKeys = new Set(['2025-03-01', '2025-03-02', '2025-03-03'])
    // 310000 / 31 * 3 = 30000
    expect(prorateBudget(budgets, dateKeys)).toBeCloseTo(30000, 0)
  })

  it('月跨ぎ — 各月独立に按分', () => {
    const budgets = new Map([
      ['2025-3', { total: 310000 }],
      ['2025-4', { total: 300000 }],
    ])
    // 3月31日 + 4月1日
    const dateKeys = new Set(['2025-03-31', '2025-04-01'])
    // 310000/31 * 1 + 300000/30 * 1 = 10000 + 10000 = 20000
    expect(prorateBudget(budgets, dateKeys)).toBeCloseTo(20000, 0)
  })

  it('予算なしの月は 0', () => {
    const budgets = new Map<string, { total: number }>()
    const dateKeys = new Set(['2025-03-01'])
    expect(prorateBudget(budgets, dateKeys)).toBe(0)
  })
})
