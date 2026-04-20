/**
 * buildDailySalesProjection — pure projection tests
 *
 * 検証対象:
 * - 同一 dateKey の複数店舗 row を合算
 * - dateKey 昇順で安定ソート
 * - 空入力は空配列
 */
import { describe, it, expect } from 'vitest'
import { buildDailySalesProjection } from '../buildDailySalesProjection'
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

describe('buildDailySalesProjection', () => {
  it('空入力は空配列', () => {
    expect(buildDailySalesProjection([])).toEqual([])
  })

  it('単一行はそのまま 1 件', () => {
    const result = buildDailySalesProjection([row({ sales: 1000, customers: 50 })])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ dateKey: '2026-03-01', sales: 1000, customers: 50 })
  })

  it('同一 dateKey の複数店舗 row を合算', () => {
    const result = buildDailySalesProjection([
      row({ dateKey: '2026-03-01', storeId: 's1', sales: 100, customers: 10 }),
      row({ dateKey: '2026-03-01', storeId: 's2', sales: 200, customers: 20 }),
      row({ dateKey: '2026-03-01', storeId: 's3', sales: 300, customers: 30 }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].sales).toBe(600)
    expect(result[0].customers).toBe(60)
  })

  it('異なる dateKey は別エントリ', () => {
    const result = buildDailySalesProjection([
      row({ dateKey: '2026-03-01', sales: 100 }),
      row({ dateKey: '2026-03-02', sales: 200 }),
    ])
    expect(result).toHaveLength(2)
    expect(result[0].sales).toBe(100)
    expect(result[1].sales).toBe(200)
  })

  it('dateKey 昇順ソート', () => {
    const result = buildDailySalesProjection([
      row({ dateKey: '2026-03-15' }),
      row({ dateKey: '2026-03-01' }),
      row({ dateKey: '2026-03-10' }),
    ])
    expect(result.map((r) => r.dateKey)).toEqual(['2026-03-01', '2026-03-10', '2026-03-15'])
  })

  it('店舗跨ぎと日跨ぎの複合集約', () => {
    const result = buildDailySalesProjection([
      row({ dateKey: '2026-03-01', storeId: 's1', sales: 100, customers: 10 }),
      row({ dateKey: '2026-03-02', storeId: 's1', sales: 200, customers: 20 }),
      row({ dateKey: '2026-03-01', storeId: 's2', sales: 50, customers: 5 }),
      row({ dateKey: '2026-03-02', storeId: 's2', sales: 70, customers: 7 }),
    ])
    expect(result).toHaveLength(2)
    expect(result.find((r) => r.dateKey === '2026-03-01')).toEqual({
      dateKey: '2026-03-01',
      sales: 150,
      customers: 15,
    })
    expect(result.find((r) => r.dateKey === '2026-03-02')).toEqual({
      dateKey: '2026-03-02',
      sales: 270,
      customers: 27,
    })
  })

  it('入力並び順に非依存（集約結果は同じ）', () => {
    const a = buildDailySalesProjection([
      row({ dateKey: '2026-03-01', sales: 100 }),
      row({ dateKey: '2026-03-02', sales: 200 }),
    ])
    const b = buildDailySalesProjection([
      row({ dateKey: '2026-03-02', sales: 200 }),
      row({ dateKey: '2026-03-01', sales: 100 }),
    ])
    expect(a).toEqual(b)
  })
})
