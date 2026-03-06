/**
 * aggregateWithOffset 不変条件テスト
 *
 * 検証する不変条件:
 *   1. Σ(storeContributions[*].sales) === entry.sales
 *   2. Σ(storeContributions[*].customers) === entry.customers
 *   3. Σ(dailyMapping[*].prevSales) === entry.sales
 *   4. Σ(dailyMapping[*].prevCustomers) === entry.customers
 *   5. transactionValue === Math.round(sales / customers)（customers > 0 時）
 *   6. dailyMapping の currentDay は 1〜daysInTargetMonth の範囲内
 *   7. storeContributions の mappedDay は 1〜daysInTargetMonth の範囲内
 *   8. offset=0 では originalDay === mappedDay
 *   9. 空入力 → ゼロ entry
 */
import { describe, it, expect } from 'vitest'
import { aggregateWithOffset } from '../usePrevYearMonthlyKpi'
import type { PrevYearMonthlyKpiEntry } from '../usePrevYearMonthlyKpi'

// ── テストデータ ──

/** 3店舗×5日分のデータ */
function makeAllAgg() {
  return {
    S1: {
      '1': { sales: 100000, discount: 0 },
      '2': { sales: 120000, discount: 0 },
      '3': { sales: 80000, discount: 0 },
      '15': { sales: 200000, discount: 0 },
      '28': { sales: 150000, discount: 0 },
    },
    S2: {
      '1': { sales: 90000, discount: 0 },
      '3': { sales: 110000, discount: 0 },
      '10': { sales: 95000, discount: 0 },
    },
    S3: {
      '5': { sales: 70000, discount: 0 },
      '20': { sales: 130000, discount: 0 },
    },
  }
}

function makeFlowers() {
  const base = { year: 2024, month: 1, price: 0, cost: 0 }
  return {
    S1: {
      1: { ...base, storeId: 'S1', day: 1, customers: 50 },
      2: { ...base, storeId: 'S1', day: 2, customers: 60 },
      3: { ...base, storeId: 'S1', day: 3, customers: 40 },
      15: { ...base, storeId: 'S1', day: 15, customers: 100 },
      28: { ...base, storeId: 'S1', day: 28, customers: 75 },
    },
    S2: {
      1: { ...base, storeId: 'S2', day: 1, customers: 45 },
      3: { ...base, storeId: 'S2', day: 3, customers: 55 },
      10: { ...base, storeId: 'S2', day: 10, customers: 48 },
    },
    S3: {
      5: { ...base, storeId: 'S3', day: 5, customers: 35 },
      20: { ...base, storeId: 'S3', day: 20, customers: 65 },
    },
  }
}

// ── 不変条件ヘルパー ──

function sumContributionSales(entry: PrevYearMonthlyKpiEntry): number {
  return entry.storeContributions.reduce((s, c) => s + c.sales, 0)
}

function sumContributionCustomers(entry: PrevYearMonthlyKpiEntry): number {
  return entry.storeContributions.reduce((s, c) => s + c.customers, 0)
}

function sumDailyMappingSales(entry: PrevYearMonthlyKpiEntry): number {
  return entry.dailyMapping.reduce((s, d) => s + d.prevSales, 0)
}

function sumDailyMappingCustomers(entry: PrevYearMonthlyKpiEntry): number {
  return entry.dailyMapping.reduce((s, d) => s + d.prevCustomers, 0)
}

// ── テスト ──

describe('aggregateWithOffset 不変条件', () => {
  const allAgg = makeAllAgg()
  const flowers = makeFlowers()
  const allIds = ['S1', 'S2', 'S3'] as const
  const daysInMonth = 31

  describe.each([
    { label: 'offset=0（同日）', offset: 0 },
    { label: 'offset=1（曜日差1）', offset: 1 },
    { label: 'offset=2（曜日差2）', offset: 2 },
    { label: 'offset=6（最大曜日差）', offset: 6 },
  ])('$label', ({ offset }) => {
    const entry = aggregateWithOffset(allAgg, flowers, allIds, offset, daysInMonth)

    it('不変条件1: Σ(storeContributions.sales) === entry.sales', () => {
      expect(sumContributionSales(entry)).toBe(entry.sales)
    })

    it('不変条件2: Σ(storeContributions.customers) === entry.customers', () => {
      expect(sumContributionCustomers(entry)).toBe(entry.customers)
    })

    it('不変条件3: Σ(dailyMapping.prevSales) === entry.sales', () => {
      expect(sumDailyMappingSales(entry)).toBe(entry.sales)
    })

    it('不変条件4: Σ(dailyMapping.prevCustomers) === entry.customers', () => {
      expect(sumDailyMappingCustomers(entry)).toBe(entry.customers)
    })

    it('不変条件5: transactionValue === Math.round(sales / customers)', () => {
      if (entry.customers > 0) {
        expect(entry.transactionValue).toBe(Math.round(entry.sales / entry.customers))
      } else {
        expect(entry.transactionValue).toBe(0)
      }
    })

    it('不変条件6: dailyMapping.currentDay は全て 1〜daysInMonth', () => {
      for (const d of entry.dailyMapping) {
        expect(d.currentDay).toBeGreaterThanOrEqual(1)
        expect(d.currentDay).toBeLessThanOrEqual(daysInMonth)
      }
    })

    it('不変条件7: storeContributions.mappedDay は全て 1〜daysInMonth', () => {
      for (const c of entry.storeContributions) {
        expect(c.mappedDay).toBeGreaterThanOrEqual(1)
        expect(c.mappedDay).toBeLessThanOrEqual(daysInMonth)
      }
    })
  })

  it('不変条件8: offset=0 では originalDay === mappedDay', () => {
    const entry = aggregateWithOffset(allAgg, flowers, allIds, 0, daysInMonth)
    for (const c of entry.storeContributions) {
      expect(c.originalDay).toBe(c.mappedDay)
    }
  })

  it('不変条件9: 空入力 → ゼロ entry', () => {
    const entry = aggregateWithOffset({}, undefined, [], 0, 31)
    expect(entry.sales).toBe(0)
    expect(entry.customers).toBe(0)
    expect(entry.transactionValue).toBe(0)
    expect(entry.dailyMapping).toHaveLength(0)
    expect(entry.storeContributions).toHaveLength(0)
  })

  it('一部店舗のみ選択しても不変条件1-4が成立', () => {
    const entry = aggregateWithOffset(allAgg, flowers, ['S1'], 0, daysInMonth)
    expect(sumContributionSales(entry)).toBe(entry.sales)
    expect(sumContributionCustomers(entry)).toBe(entry.customers)
    expect(sumDailyMappingSales(entry)).toBe(entry.sales)
    expect(sumDailyMappingCustomers(entry)).toBe(entry.customers)
  })

  it('flowers データなしでも sales の不変条件は維持（customers=0）', () => {
    const entry = aggregateWithOffset(allAgg, undefined, allIds, 0, daysInMonth)
    expect(sumContributionSales(entry)).toBe(entry.sales)
    expect(entry.customers).toBe(0)
    expect(entry.transactionValue).toBe(0)
  })

  it('オフセットにより月外にはみ出す日は除外される', () => {
    // day=1 に offset=1 → mappedDay=0 → 月外、除外される
    const entry = aggregateWithOffset(allAgg, flowers, allIds, 1, daysInMonth)
    const hasDay0 = entry.storeContributions.some((c) => c.mappedDay < 1)
    expect(hasDay0).toBe(false)
    // 除外されても残った分の不変条件は成立
    expect(sumContributionSales(entry)).toBe(entry.sales)
  })

  it('dailyMapping は currentDay 昇順', () => {
    const entry = aggregateWithOffset(allAgg, flowers, allIds, 0, daysInMonth)
    for (let i = 1; i < entry.dailyMapping.length; i++) {
      expect(entry.dailyMapping[i].currentDay).toBeGreaterThan(entry.dailyMapping[i - 1].currentDay)
    }
  })
})
