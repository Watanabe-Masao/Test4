/**
 * jsAggregationLogic — computeYoyDaily / computeYoyDailyV2 tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { computeYoyDaily, computeYoyDailyV2 } from '../jsAggregationLogic'
import type { StoreDaySummaryRow } from '@/infrastructure/duckdb/queries/storeDaySummary'

function row(overrides: Partial<StoreDaySummaryRow> = {}): StoreDaySummaryRow {
  return {
    year: 2026,
    month: 3,
    day: 1,
    dateKey: '2026-03-01',
    storeId: 's1',
    sales: 1000,
    coreSales: 900,
    grossSales: 1000,
    discount71: 0,
    discount72: 0,
    discount73: 0,
    discount74: 0,
    discountAmount: 0,
    discountAbsolute: 0,
    purchaseCost: 500,
    purchasePrice: 700,
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
    customers: 50,
    totalQuantity: 100,
    isPrevYear: false,
    ...overrides,
  }
}

describe('computeYoyDaily', () => {
  it('空入力で空配列', () => {
    const r = computeYoyDaily([], [])
    expect(r).toEqual([])
  })

  it('sameDate で当期と前期を整列', () => {
    const cur = [row({ dateKey: '2026-03-01', sales: 1000 })]
    const prev = [row({ dateKey: '2025-03-01', sales: 900 })]
    const r = computeYoyDaily(cur, prev, 'sameDate')
    expect(r.length).toBeGreaterThan(0)
  })

  it('結果は YoyDailyRow 互換', () => {
    const cur = [row({ dateKey: '2026-03-01', sales: 1000 })]
    const prev = [row({ dateKey: '2025-03-01', sales: 900 })]
    const r = computeYoyDaily(cur, prev)
    expect(r[0]).toHaveProperty('curSales')
    expect(r[0]).toHaveProperty('storeId')
  })

  it('dowOffset は後方互換（デフォルト 0）', () => {
    const cur = [row({ dateKey: '2026-03-01', sales: 1000 })]
    const prev = [row({ dateKey: '2025-03-01', sales: 900 })]
    const r1 = computeYoyDaily(cur, prev)
    const r2 = computeYoyDaily(cur, prev, 'sameDate', 0)
    expect(r1).toEqual(r2)
  })
})

describe('computeYoyDailyV2', () => {
  it('空入力で空配列', () => {
    const r = computeYoyDailyV2([], [], 'sameDate')
    expect(r).toEqual([])
  })

  it('sameDate mode で比較先を解決', () => {
    const cur = [row({ dateKey: '2026-03-01', sales: 1000 })]
    const prev = [row({ dateKey: '2025-03-01', sales: 900 })]
    const r = computeYoyDailyV2(cur, prev, 'sameDate')
    expect(r.length).toBeGreaterThan(0)
  })

  it('結果は matchStatus を含む（V1 超集合）', () => {
    const cur = [row({ dateKey: '2026-03-01', sales: 1000 })]
    const prev = [row({ dateKey: '2025-03-01', sales: 900 })]
    const r = computeYoyDailyV2(cur, prev, 'sameDate')
    expect(r[0]).toHaveProperty('matchStatus')
  })

  it('sameDayOfWeek mode でも動作', () => {
    const cur = [row({ dateKey: '2026-03-01', sales: 1000 })]
    const prev = [row({ dateKey: '2025-03-01', sales: 900 })]
    const r = computeYoyDailyV2(cur, prev, 'sameDayOfWeek')
    expect(r.length).toBeGreaterThan(0)
  })
})
