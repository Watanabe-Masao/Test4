/**
 * projectStoreDailySeries — pure projection tests
 *
 * 検証対象:
 * - storeIds subset でフィルタ
 * - (storeId, dateKey) で集約
 * - 出力は storeId 昇順、各 entry 内は dateKey 昇順
 * - 欠損日は padding しない
 * - totals / grandTotals の整合
 */
import { describe, it, expect } from 'vitest'
import { projectStoreDailySeries, EMPTY_STORE_DAILY_SERIES } from '../projectStoreDailySeries'
import type { StoreDaySummaryRow } from '@/application/queries/summary/StoreDaySummaryHandler'

function row(overrides: Partial<StoreDaySummaryRow> = {}): StoreDaySummaryRow {
  return {
    year: 2026,
    month: 3,
    day: 1,
    dateKey: '2026-03-01',
    storeId: 's1',
    sales: 0,
    coreSales: 0,
    grossSales: 0,
    discount71: 0,
    discount72: 0,
    discount73: 0,
    discount74: 0,
    discountAmount: 0,
    discountAbsolute: 0,
    purchaseCost: 0,
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
    directProducePrice: 0,
    costInclusionCost: 0,
    customers: 0,
    totalQuantity: 0,
    isPrevYear: false,
    ...overrides,
  }
}

describe('projectStoreDailySeries', () => {
  it('空 rows で空 entries + grandTotals=0', () => {
    const r = projectStoreDailySeries([], { dayCount: 31 })
    expect(r.entries).toEqual([])
    expect(r.grandTotals).toEqual({ sales: 0, customers: 0, purchaseCost: 0, grossSales: 0 })
    expect(r.dayCount).toBe(31)
  })

  it('単一 row は 1 entry / 1 daily', () => {
    const r = projectStoreDailySeries(
      [row({ storeId: 's1', dateKey: '2026-03-01', sales: 100, customers: 10 })],
      { dayCount: 1 },
    )
    expect(r.entries).toHaveLength(1)
    expect(r.entries[0].storeId).toBe('s1')
    expect(r.entries[0].daily).toHaveLength(1)
    expect(r.entries[0].daily[0].sales).toBe(100)
    expect(r.entries[0].totals.sales).toBe(100)
  })

  it('同一 (storeId, dateKey) の複数 row を合算', () => {
    const r = projectStoreDailySeries(
      [
        row({ storeId: 's1', dateKey: '2026-03-01', sales: 100, customers: 10 }),
        row({ storeId: 's1', dateKey: '2026-03-01', sales: 200, customers: 20 }),
      ],
      { dayCount: 1 },
    )
    expect(r.entries).toHaveLength(1)
    expect(r.entries[0].daily).toHaveLength(1)
    expect(r.entries[0].daily[0].sales).toBe(300)
    expect(r.entries[0].daily[0].customers).toBe(30)
  })

  it('entries は storeId 昇順', () => {
    const r = projectStoreDailySeries(
      [row({ storeId: 's3' }), row({ storeId: 's1' }), row({ storeId: 's2' })],
      { dayCount: 1 },
    )
    expect(r.entries.map((e) => e.storeId)).toEqual(['s1', 's2', 's3'])
  })

  it('entries 内の daily は dateKey 昇順', () => {
    const r = projectStoreDailySeries(
      [
        row({ storeId: 's1', dateKey: '2026-03-15' }),
        row({ storeId: 's1', dateKey: '2026-03-01' }),
        row({ storeId: 's1', dateKey: '2026-03-10' }),
      ],
      { dayCount: 31 },
    )
    expect(r.entries[0].daily.map((d) => d.dateKey)).toEqual([
      '2026-03-01',
      '2026-03-10',
      '2026-03-15',
    ])
  })

  it('欠損日は padding しない（配列要素も存在しない）', () => {
    // row は 2 件のみ、dayCount=31 でも daily は 2 件
    const r = projectStoreDailySeries(
      [
        row({ storeId: 's1', dateKey: '2026-03-01' }),
        row({ storeId: 's1', dateKey: '2026-03-15' }),
      ],
      { dayCount: 31 },
    )
    expect(r.entries[0].daily).toHaveLength(2)
  })

  it('storeIds subset でフィルタ', () => {
    const r = projectStoreDailySeries(
      [row({ storeId: 's1' }), row({ storeId: 's2' }), row({ storeId: 's3' })],
      { dayCount: 1, storeIds: new Set(['s1', 's3']) },
    )
    expect(r.entries.map((e) => e.storeId)).toEqual(['s1', 's3'])
  })

  it('storeIds 空 set は全店採用（filter なし扱い）', () => {
    const r = projectStoreDailySeries([row({ storeId: 's1' }), row({ storeId: 's2' })], {
      dayCount: 1,
      storeIds: new Set(),
    })
    expect(r.entries).toHaveLength(2)
  })

  it('grandTotals は全 entries の totals 合計', () => {
    const r = projectStoreDailySeries(
      [
        row({ storeId: 's1', sales: 100, customers: 10, purchaseCost: 50, grossSales: 100 }),
        row({ storeId: 's2', sales: 200, customers: 20, purchaseCost: 80, grossSales: 200 }),
      ],
      { dayCount: 1 },
    )
    expect(r.grandTotals.sales).toBe(300)
    expect(r.grandTotals.customers).toBe(30)
    expect(r.grandTotals.purchaseCost).toBe(130)
    expect(r.grandTotals.grossSales).toBe(300)
  })

  it('dayCount はそのまま出力へ反映', () => {
    const r = projectStoreDailySeries([], { dayCount: 7 })
    expect(r.dayCount).toBe(7)
  })

  it('EMPTY_STORE_DAILY_SERIES は空 constants', () => {
    expect(EMPTY_STORE_DAILY_SERIES.entries).toEqual([])
    expect(EMPTY_STORE_DAILY_SERIES.dayCount).toBe(0)
  })
})
