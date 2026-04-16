/**
 * projectStoreDailySeries — parity / truth-table test
 *
 * unify-period-analysis Phase 6.5 Step B (Phase 6.5-2):
 * `StoreDaySummaryRow[] → StoreDailySeries` 変換意味を fixture ベースで凍結
 * する。Phase 6.5-4 (`useStoreDailyBundle` hook) / Phase 6.5-5
 * (`SalesPurchaseComparisonChart` 載せ替え) は本テストが緑である状態を維持
 * するだけでよい。
 *
 * ## 凍結対象 (truth table)
 *
 *   1. storeId 昇順での安定ソート (localeCompare)
 *   2. 各 entry 内の dateKey 昇順での安定ソート
 *   3. 同一 (storeId, dateKey) の row 合算 (defensive)
 *   4. 欠損日は配列に現れない (padding しない)
 *   5. store subset 集約 — 指定外は除外
 *   6. 空 subset は全 store を対象
 *   7. dayCount の伝搬 (pass-through)
 *   8. 空入力 — empty series
 *   9. EMPTY_STORE_DAILY_SERIES の shape 固定
 *  10. grandTotals が entries.totals の和に一致
 *  11. 各 entry.totals が daily の sum に一致
 *  12. 月跨ぎ入力で dateKey 順が正しくソートされる
 *  13. 4 metric (sales/customers/purchaseCost/grossSales) の pass-through
 *
 * ## 関連
 *
 *   - app/src/application/hooks/storeDaily/projectStoreDailySeries.ts
 *   - app/src/application/hooks/storeDaily/StoreDailyBundle.types.ts
 *   - projects/completed/unify-period-analysis/phase-6-5-step-b-design.md
 */
import { describe, it, expect } from 'vitest'
import { projectStoreDailySeries, EMPTY_STORE_DAILY_SERIES } from '../projectStoreDailySeries'
import type { StoreDaySummaryRow } from '@/application/queries/summary/StoreDaySummaryHandler'
import type { StoreDailySeries } from '../StoreDailyBundle.types'

// ── helpers ───────────────────────────────────────────────

function makeRow(overrides: {
  storeId: string
  dateKey: string
  day: number
  sales: number
  customers: number
  purchaseCost?: number
  grossSales?: number
  year?: number
  month?: number
}): StoreDaySummaryRow {
  const year = overrides.year ?? 2025
  const month = overrides.month ?? 4
  return {
    year,
    month,
    day: overrides.day,
    dateKey: overrides.dateKey,
    storeId: overrides.storeId,
    sales: overrides.sales,
    coreSales: 0,
    grossSales: overrides.grossSales ?? overrides.sales,
    discount71: 0,
    discount72: 0,
    discount73: 0,
    discount74: 0,
    discountAmount: 0,
    discountAbsolute: 0,
    purchaseCost: overrides.purchaseCost ?? 0,
    purchasePrice: 0,
    interStoreInCost: 0,
    interStoreInPrice: 0,
    interStoreOutCost: 0,
    interStoreOutPrice: 0,
    interDeptInCost: 0,
    interDeptInPrice: 0,
    interDeptOutCost: 0,
    interDeptOutPrice: 0,
    flowersCost: 0,
    flowersPrice: 0,
    directProduceCost: 0,
    customers: overrides.customers,
  } as unknown as StoreDaySummaryRow
}

// ── truth table ───────────────────────────────────────────

describe('projectStoreDailySeries — pure projection truth table', () => {
  // (1) storeId 昇順
  it('entries は storeId の localeCompare 昇順で安定ソートされる', () => {
    const rows = [
      makeRow({ storeId: 'STORE_C', dateKey: '2025-04-01', day: 1, sales: 100, customers: 1 }),
      makeRow({ storeId: 'STORE_A', dateKey: '2025-04-01', day: 1, sales: 200, customers: 2 }),
      makeRow({ storeId: 'STORE_B', dateKey: '2025-04-01', day: 1, sales: 300, customers: 3 }),
    ]
    const result = projectStoreDailySeries(rows, { dayCount: 1 })
    expect(result.entries.map((e) => e.storeId)).toEqual(['STORE_A', 'STORE_B', 'STORE_C'])
  })

  // (2) dateKey 昇順
  it('各 entry 内の daily は dateKey の昇順で安定ソートされる', () => {
    const rows = [
      makeRow({ storeId: 'S1', dateKey: '2025-04-15', day: 15, sales: 100, customers: 1 }),
      makeRow({ storeId: 'S1', dateKey: '2025-04-03', day: 3, sales: 200, customers: 2 }),
      makeRow({ storeId: 'S1', dateKey: '2025-04-10', day: 10, sales: 300, customers: 3 }),
      makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 400, customers: 4 }),
    ]
    const result = projectStoreDailySeries(rows, { dayCount: 15 })
    expect(result.entries[0].daily.map((d) => d.dateKey)).toEqual([
      '2025-04-01',
      '2025-04-03',
      '2025-04-10',
      '2025-04-15',
    ])
  })

  // (3) 同一 (storeId, dateKey) の合算
  it('同じ (storeId, dateKey) の row が複数あれば全 metric で合算される', () => {
    const rows = [
      makeRow({
        storeId: 'S1',
        dateKey: '2025-04-01',
        day: 1,
        sales: 100,
        customers: 10,
        purchaseCost: 50,
        grossSales: 110,
      }),
      makeRow({
        storeId: 'S1',
        dateKey: '2025-04-01',
        day: 1,
        sales: 200,
        customers: 20,
        purchaseCost: 80,
        grossSales: 220,
      }),
    ]
    const result = projectStoreDailySeries(rows, { dayCount: 1 })
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].daily).toHaveLength(1)
    expect(result.entries[0].daily[0]).toEqual({
      dateKey: '2025-04-01',
      sales: 300,
      customers: 30,
      purchaseCost: 130,
      grossSales: 330,
    })
  })

  // (4) 欠損日は padding しない
  it('入力にない日は daily 配列に出現しない (no padding)', () => {
    const rows = [
      makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 100, customers: 1 }),
      makeRow({ storeId: 'S1', dateKey: '2025-04-05', day: 5, sales: 500, customers: 5 }),
    ]
    const result = projectStoreDailySeries(rows, { dayCount: 5 })
    expect(result.entries[0].daily.map((d) => d.dateKey)).toEqual(['2025-04-01', '2025-04-05'])
  })

  // (5) store subset
  it('storeIds option が指定されたら subset 外の row を除外する', () => {
    const rows = [
      makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 100, customers: 1 }),
      makeRow({ storeId: 'S2', dateKey: '2025-04-01', day: 1, sales: 200, customers: 2 }),
      makeRow({ storeId: 'S3', dateKey: '2025-04-01', day: 1, sales: 300, customers: 3 }),
    ]
    const subset = new Set(['S1', 'S3'])
    const result = projectStoreDailySeries(rows, { dayCount: 1, storeIds: subset })
    expect(result.entries.map((e) => e.storeId)).toEqual(['S1', 'S3'])
    expect(result.grandTotals.sales).toBe(400)
  })

  // (6) 空 subset
  it('storeIds option が空 set のときは全 store を対象にする', () => {
    const rows = [
      makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 100, customers: 1 }),
      makeRow({ storeId: 'S2', dateKey: '2025-04-01', day: 1, sales: 200, customers: 2 }),
    ]
    const result = projectStoreDailySeries(rows, { dayCount: 1, storeIds: new Set() })
    expect(result.entries).toHaveLength(2)
    expect(result.grandTotals.sales).toBe(300)
  })

  // (7) dayCount 伝搬
  it('options.dayCount が結果にそのまま伝搬する', () => {
    const result = projectStoreDailySeries(
      [makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 1, customers: 1 })],
      { dayCount: 30 },
    )
    expect(result.dayCount).toBe(30)
  })

  // (8) 空入力
  it('空 row 配列のときは entries 空 + grandTotals 0 + dayCount pass-through', () => {
    const result = projectStoreDailySeries([], { dayCount: 7 })
    expect(result.entries).toEqual([])
    expect(result.grandTotals).toEqual({
      sales: 0,
      customers: 0,
      purchaseCost: 0,
      grossSales: 0,
    })
    expect(result.dayCount).toBe(7)
  })

  // (9) EMPTY constant shape
  it('EMPTY_STORE_DAILY_SERIES は empty entries / zero totals / dayCount 0', () => {
    expect(EMPTY_STORE_DAILY_SERIES.entries).toEqual([])
    expect(EMPTY_STORE_DAILY_SERIES.grandTotals).toEqual({
      sales: 0,
      customers: 0,
      purchaseCost: 0,
      grossSales: 0,
    })
    expect(EMPTY_STORE_DAILY_SERIES.dayCount).toBe(0)
  })

  // (10) grandTotals = Σ entries.totals
  it('grandTotals は全 entries.totals の和に一致する', () => {
    const rows = [
      makeRow({
        storeId: 'S1',
        dateKey: '2025-04-01',
        day: 1,
        sales: 100,
        customers: 10,
        purchaseCost: 40,
      }),
      makeRow({
        storeId: 'S1',
        dateKey: '2025-04-02',
        day: 2,
        sales: 200,
        customers: 20,
        purchaseCost: 80,
      }),
      makeRow({
        storeId: 'S2',
        dateKey: '2025-04-01',
        day: 1,
        sales: 300,
        customers: 30,
        purchaseCost: 120,
      }),
    ]
    const result = projectStoreDailySeries(rows, { dayCount: 2 })
    const sumSales = result.entries.reduce((s, e) => s + e.totals.sales, 0)
    const sumCustomers = result.entries.reduce((s, e) => s + e.totals.customers, 0)
    const sumPurchaseCost = result.entries.reduce((s, e) => s + e.totals.purchaseCost, 0)
    expect(result.grandTotals.sales).toBe(sumSales)
    expect(result.grandTotals.customers).toBe(sumCustomers)
    expect(result.grandTotals.purchaseCost).toBe(sumPurchaseCost)
    expect(result.grandTotals.sales).toBe(600)
  })

  // (11) entry.totals = Σ daily
  it('各 entry.totals は daily 配列の和に一致する', () => {
    const rows = [
      makeRow({
        storeId: 'S1',
        dateKey: '2025-04-01',
        day: 1,
        sales: 100,
        customers: 10,
        purchaseCost: 40,
      }),
      makeRow({
        storeId: 'S1',
        dateKey: '2025-04-02',
        day: 2,
        sales: 200,
        customers: 20,
        purchaseCost: 80,
      }),
      makeRow({
        storeId: 'S1',
        dateKey: '2025-04-03',
        day: 3,
        sales: 300,
        customers: 30,
        purchaseCost: 120,
      }),
    ]
    const result = projectStoreDailySeries(rows, { dayCount: 3 })
    const entry = result.entries[0]
    expect(entry.totals.sales).toBe(entry.daily.reduce((s, d) => s + d.sales, 0))
    expect(entry.totals.customers).toBe(entry.daily.reduce((s, d) => s + d.customers, 0))
    expect(entry.totals.purchaseCost).toBe(entry.daily.reduce((s, d) => s + d.purchaseCost, 0))
    expect(entry.totals.sales).toBe(600)
  })

  // (12) 月跨ぎ
  it('月跨ぎ入力で dateKey 昇順に正しくソートされる', () => {
    const rows = [
      makeRow({
        storeId: 'S1',
        dateKey: '2025-05-01',
        day: 1,
        sales: 100,
        customers: 1,
        year: 2025,
        month: 5,
      }),
      makeRow({ storeId: 'S1', dateKey: '2025-04-30', day: 30, sales: 200, customers: 2 }),
    ]
    const result = projectStoreDailySeries(rows, { dayCount: 2 })
    expect(result.entries[0].daily.map((d) => d.dateKey)).toEqual(['2025-04-30', '2025-05-01'])
  })

  // (13) 4 metric pass-through
  it('4 つの metric (sales / customers / purchaseCost / grossSales) が pass-through される', () => {
    const rows = [
      makeRow({
        storeId: 'S1',
        dateKey: '2025-04-01',
        day: 1,
        sales: 1000,
        customers: 50,
        purchaseCost: 400,
        grossSales: 1100,
      }),
    ]
    const result = projectStoreDailySeries(rows, { dayCount: 1 })
    expect(result.entries[0].daily[0]).toEqual({
      dateKey: '2025-04-01',
      sales: 1000,
      customers: 50,
      purchaseCost: 400,
      grossSales: 1100,
    })
  })
})

// ── caller-pattern parity ─────────────────────────────────

describe('projectStoreDailySeries — caller-pattern parity', () => {
  it('current/comparison ペアの典型ユースケース (2 series + 同じ store subset)', () => {
    const subset = new Set(['S1', 'S2'])
    const currentRows = [
      makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 1000, customers: 50 }),
      makeRow({ storeId: 'S2', dateKey: '2025-04-01', day: 1, sales: 2000, customers: 80 }),
      makeRow({ storeId: 'S3', dateKey: '2025-04-01', day: 1, sales: 9999, customers: 999 }), // subset 外
    ]
    const comparisonRows = [
      makeRow({
        storeId: 'S1',
        dateKey: '2024-04-01',
        day: 1,
        sales: 900,
        customers: 45,
        year: 2024,
      }),
      makeRow({
        storeId: 'S2',
        dateKey: '2024-04-01',
        day: 1,
        sales: 1800,
        customers: 70,
        year: 2024,
      }),
    ]

    const current = projectStoreDailySeries(currentRows, { dayCount: 1, storeIds: subset })
    const comparison = projectStoreDailySeries(comparisonRows, { dayCount: 1, storeIds: subset })

    expect(current.grandTotals.sales).toBe(3000)
    expect(comparison.grandTotals.sales).toBe(2700)

    // 両 series で store 順序が一致する (UI で zip しやすい)
    expect(current.entries.map((e) => e.storeId)).toEqual(['S1', 'S2'])
    expect(comparison.entries.map((e) => e.storeId)).toEqual(['S1', 'S2'])
  })

  it('結果型が StoreDailySeries shape を満たす (compile-time + runtime)', () => {
    const result: StoreDailySeries = projectStoreDailySeries(
      [makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 100, customers: 1 })],
      { dayCount: 1 },
    )
    expect(result).toBeDefined()
    expect(typeof result.dayCount).toBe('number')
    expect(Array.isArray(result.entries)).toBe(true)
    expect(typeof result.grandTotals.sales).toBe('number')
  })
})
