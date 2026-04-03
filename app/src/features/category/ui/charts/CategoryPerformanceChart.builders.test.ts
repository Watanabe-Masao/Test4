/**
 * CategoryPerformanceChart.builders — 純粋関数テスト
 *
 * buildCategoryRows の不変条件を検証する。
 *
 * @guard H4 component に acquisition logic 禁止 — 導出は builders で一度だけ
 */
import { describe, it, expect } from 'vitest'
import { buildCategoryRows } from './CategoryPerformanceChart.builders'
import type { LevelAggregationRow } from '@/application/queries/cts/LevelAggregationHandler'

function makeRow(overrides: Partial<LevelAggregationRow> = {}): LevelAggregationRow {
  return {
    code: 'D01',
    name: 'Department 01',
    amount: 100000,
    quantity: 500,
    childCount: 3,
    handledDayCount: 20,
    totalDayCount: 31,
    ...overrides,
  }
}

describe('buildCategoryRows', () => {
  const totalCustomers = 1000

  it('基本 PI 計算（domain 関数 calculateAmountPI/calculateQuantityPI 経由）', () => {
    const rows = buildCategoryRows([makeRow({ amount: 200000, quantity: 400 })], null, 1000, 0)
    expect(rows).toHaveLength(1)
    // PI = amount / customers * 1000 = 200000 / 1000 * 1000 = 200000
    expect(rows[0].piAmount).toBe(200000)
    // PI = quantity / customers * 1000 = 400 / 1000 * 1000 = 400
    expect(rows[0].piQty).toBe(400)
  })

  it('prev レコードがある場合の prevPiAmount/prevPiQty 算出', () => {
    const cur = [makeRow({ code: 'D01', amount: 200000, quantity: 400 })]
    const prev = [makeRow({ code: 'D01', amount: 180000, quantity: 350 })]
    const rows = buildCategoryRows(cur, prev, 1000, 900)
    expect(rows[0].prevPiAmount).toBe(200000) // 180000 / 900 * 1000
    expect(rows[0].prevPiQty).toBeCloseTo(388.889, 0) // 350 / 900 * 1000
  })

  it('prev が null の場合 prevPiAmount/prevPiQty は null', () => {
    const rows = buildCategoryRows([makeRow()], null, totalCustomers, 0)
    expect(rows[0].prevPiAmount).toBeNull()
    expect(rows[0].prevPiQty).toBeNull()
  })

  it('prevTotalCustomers = 0 の場合 prevPi は null', () => {
    const cur = [makeRow({ code: 'D01' })]
    const prev = [makeRow({ code: 'D01', amount: 90000 })]
    const rows = buildCategoryRows(cur, prev, totalCustomers, 0)
    expect(rows[0].prevPiAmount).toBeNull()
  })

  it('偏差値計算（stdDev > 0）', () => {
    const records = [
      makeRow({ code: 'D01', amount: 100000, quantity: 100 }),
      makeRow({ code: 'D02', amount: 200000, quantity: 200 }),
      makeRow({ code: 'D03', amount: 300000, quantity: 300 }),
      makeRow({ code: 'D04', amount: 400000, quantity: 400 }),
      makeRow({ code: 'D05', amount: 500000, quantity: 500 }),
    ]
    const rows = buildCategoryRows(records, null, totalCustomers, 0)

    // With 5 different values, stdDev > 0 so deviations should be set
    for (const row of rows) {
      expect(row.deviation).not.toBeNull()
      expect(row.deviation!).toBeGreaterThanOrEqual(0)
      expect(row.deviation!).toBeLessThanOrEqual(100)
    }
  })

  it('全要素同値（stdDev = 0）→ deviation は null のまま', () => {
    const records = [
      makeRow({ code: 'D01', amount: 100000, quantity: 100 }),
      makeRow({ code: 'D02', amount: 100000, quantity: 100 }),
      makeRow({ code: 'D03', amount: 100000, quantity: 100 }),
    ]
    const rows = buildCategoryRows(records, null, totalCustomers, 0)
    for (const row of rows) {
      expect(row.deviation).toBeNull()
      expect(row.qtyDeviation).toBeNull()
    }
  })

  it('TopN ソート（piAmount 降順、デフォルト20件）', () => {
    const records = Array.from({ length: 30 }, (_, i) =>
      makeRow({ code: `D${String(i).padStart(2, '0')}`, amount: (30 - i) * 10000 }),
    )
    const rows = buildCategoryRows(records, null, totalCustomers, 0)
    expect(rows).toHaveLength(20)
    // First should have highest piAmount
    expect(rows[0].piAmount).toBeGreaterThan(rows[1].piAmount)
    // Last of top20 should be 11th largest
    expect(rows[19].piAmount).toBeLessThan(rows[18].piAmount)
  })

  it('topN パラメータで件数を制御', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      makeRow({ code: `D${i}`, amount: (10 - i) * 10000 }),
    )
    const rows = buildCategoryRows(records, null, totalCustomers, 0, 5)
    expect(rows).toHaveLength(5)
  })

  it('空レコード → 空配列', () => {
    const rows = buildCategoryRows([], null, totalCustomers, 0)
    expect(rows).toEqual([])
  })

  it('totalCustomers = 0 → 空配列', () => {
    const rows = buildCategoryRows([makeRow()], null, 0, 0)
    expect(rows).toEqual([])
  })

  it('name が空の場合 code をフォールバック', () => {
    const rows = buildCategoryRows([makeRow({ code: 'X99', name: '' })], null, totalCustomers, 0)
    expect(rows[0].name).toBe('X99')
  })
})
