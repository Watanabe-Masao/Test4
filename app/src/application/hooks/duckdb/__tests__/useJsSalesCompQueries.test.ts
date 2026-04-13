/**
 * useJsSalesCompQueries は React hook のみで純粋関数を持たないため、
 * 同じ機能スライス内で代替として jsAggregationLogic.ts の
 * computeYoyDailyV2 を検証する（useJsSalesCompQueries が利用する純粋関数）。
 */
import { describe, it, expect } from 'vitest'
import { computeYoyDailyV2 } from '../jsAggregationLogic'
import type { StoreDaySummaryRow } from '@/infrastructure/duckdb/queries/storeDaySummary'

/** テスト用に最小限のフィールドから StoreDaySummaryRow を作成 */
function mkRow(
  partial: Pick<StoreDaySummaryRow, 'dateKey' | 'day' | 'month' | 'storeId' | 'sales'> &
    Partial<StoreDaySummaryRow>,
): StoreDaySummaryRow {
  return {
    year: 2026,
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
    ...partial,
  } as StoreDaySummaryRow
}

describe('computeYoyDailyV2', () => {
  it('空配列同士を渡すと空配列を返す', () => {
    expect(computeYoyDailyV2([], [], 'sameDate')).toEqual([])
  })

  it('current が空なら結果は空（previous は参照されない）', () => {
    const prevRows = [
      mkRow({
        dateKey: '2025-01-01',
        day: 1,
        month: 1,
        storeId: 'S1',
        sales: 100,
        customers: 10,
        isPrevYear: true,
      }),
    ]
    expect(computeYoyDailyV2([], prevRows, 'sameDate')).toEqual([])
  })

  it('sameDate モード: current と前年同日をマッチさせる', () => {
    const curRows = [
      mkRow({
        dateKey: '2026-01-01',
        day: 1,
        month: 1,
        storeId: 'S1',
        sales: 100,
        customers: 10,
      }),
    ]
    const prevRows = [
      mkRow({
        dateKey: '2025-01-01',
        day: 1,
        month: 1,
        storeId: 'S1',
        sales: 80,
        customers: 8,
        isPrevYear: true,
      }),
    ]

    const result = computeYoyDailyV2(curRows, prevRows, 'sameDate')
    expect(result).toHaveLength(1)
    const row = result[0]
    expect(row.curDateKey).toBe('2026-01-01')
    expect(row.prevDateKey).toBe('2025-01-01')
    expect(row.curSales).toBe(100)
    expect(row.prevSales).toBe(80)
    expect(row.salesDiff).toBe(20)
    expect(row.curCustomers).toBe(10)
    expect(row.prevCustomers).toBe(8)
    expect(row.matchStatus).toBe('matched')
  })

  it('マッチする前年データが無い場合は missing_previous で prevSales=null', () => {
    const curRows = [
      mkRow({
        dateKey: '2026-06-15',
        day: 15,
        month: 6,
        storeId: 'S1',
        sales: 500,
        customers: 50,
      }),
    ]
    const result = computeYoyDailyV2(curRows, [], 'sameDate')
    expect(result).toHaveLength(1)
    expect(result[0].matchStatus).toBe('missing_previous')
    expect(result[0].prevSales).toBeNull()
    expect(result[0].curSales).toBe(500)
    expect(result[0].salesDiff).toBe(500) // null → 0 と扱う
  })

  it('current の入力順が結果に保持される', () => {
    const curRows = [
      mkRow({
        dateKey: '2026-01-02',
        day: 2,
        month: 1,
        storeId: 'S1',
        sales: 200,
        customers: 20,
      }),
      mkRow({
        dateKey: '2026-01-01',
        day: 1,
        month: 1,
        storeId: 'S1',
        sales: 100,
        customers: 10,
      }),
    ]
    const result = computeYoyDailyV2(curRows, [], 'sameDate')
    expect(result).toHaveLength(2)
    expect(result[0].curDateKey).toBe('2026-01-02')
    expect(result[1].curDateKey).toBe('2026-01-01')
  })

  it('複数店舗のデータを店舗別にマッチさせる', () => {
    const curRows = [
      mkRow({
        dateKey: '2026-01-01',
        day: 1,
        month: 1,
        storeId: 'S1',
        sales: 100,
        customers: 10,
      }),
      mkRow({
        dateKey: '2026-01-01',
        day: 1,
        month: 1,
        storeId: 'S2',
        sales: 300,
        customers: 30,
      }),
    ]
    const prevRows = [
      mkRow({
        dateKey: '2025-01-01',
        day: 1,
        month: 1,
        storeId: 'S1',
        sales: 80,
        customers: 8,
        isPrevYear: true,
      }),
      mkRow({
        dateKey: '2025-01-01',
        day: 1,
        month: 1,
        storeId: 'S2',
        sales: 240,
        customers: 24,
        isPrevYear: true,
      }),
    ]

    const result = computeYoyDailyV2(curRows, prevRows, 'sameDate')
    expect(result).toHaveLength(2)
    const s1 = result.find((r) => r.storeId === 'S1')!
    const s2 = result.find((r) => r.storeId === 'S2')!
    expect(s1.prevSales).toBe(80)
    expect(s2.prevSales).toBe(240)
    expect(s1.salesDiff).toBe(20)
    expect(s2.salesDiff).toBe(60)
  })
})
