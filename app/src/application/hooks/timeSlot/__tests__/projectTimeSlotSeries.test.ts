/**
 * projectTimeSlotSeries — pure projection tests
 *
 * 検証対象:
 * - storeIds subset でフィルタ
 * - storeId × hour で集約
 * - 24 長配列（index=hour、欠損は null）
 * - byHour と byHourQuantity の null 位置が一致
 * - hour 範囲外の row は無視
 * - total / grandTotal の整合
 */
import { describe, it, expect } from 'vitest'
import { projectTimeSlotSeries, EMPTY_TIME_SLOT_SERIES } from '../projectTimeSlotSeries'
import type { StoreAggregationRow } from '@/application/hooks/duckdb'

function row(overrides: Partial<StoreAggregationRow> = {}): StoreAggregationRow {
  return {
    storeId: 's1',
    hour: 10,
    amount: 0,
    quantity: 0,
    ...overrides,
  }
}

describe('projectTimeSlotSeries', () => {
  it('空 rows で空 entries', () => {
    const r = projectTimeSlotSeries([], { dayCount: 7 })
    expect(r.entries).toEqual([])
    expect(r.grandTotal).toBe(0)
    expect(r.grandTotalQuantity).toBe(0)
    expect(r.dayCount).toBe(7)
  })

  it('byHour は長さ 24（0〜23）', () => {
    const r = projectTimeSlotSeries([row({ hour: 10, amount: 100 })], { dayCount: 1 })
    expect(r.entries[0].byHour).toHaveLength(24)
    expect(r.entries[0].byHourQuantity).toHaveLength(24)
  })

  it('対応 hour 位置に値、他は null', () => {
    const r = projectTimeSlotSeries([row({ storeId: 's1', hour: 10, amount: 500, quantity: 50 })], {
      dayCount: 1,
    })
    expect(r.entries[0].byHour[10]).toBe(500)
    expect(r.entries[0].byHour[0]).toBeNull()
    expect(r.entries[0].byHour[23]).toBeNull()
  })

  it('同じ (storeId, hour) の複数 row を合算', () => {
    const r = projectTimeSlotSeries(
      [
        row({ storeId: 's1', hour: 10, amount: 100, quantity: 10 }),
        row({ storeId: 's1', hour: 10, amount: 200, quantity: 20 }),
      ],
      { dayCount: 1 },
    )
    expect(r.entries[0].byHour[10]).toBe(300)
    expect(r.entries[0].byHourQuantity[10]).toBe(30)
  })

  it('hour 範囲外（< 0 / >= 24）の row は無視', () => {
    const r = projectTimeSlotSeries(
      [
        row({ storeId: 's1', hour: 10, amount: 100 }),
        row({ storeId: 's1', hour: -1, amount: 999 }),
        row({ storeId: 's1', hour: 24, amount: 999 }),
        row({ storeId: 's1', hour: 100, amount: 999 }),
      ],
      { dayCount: 1 },
    )
    expect(r.entries[0].total).toBe(100)
  })

  it('非整数 hour は無視', () => {
    const r = projectTimeSlotSeries(
      [
        row({ storeId: 's1', hour: 10, amount: 100 }),
        row({ storeId: 's1', hour: 10.5, amount: 999 }),
      ],
      { dayCount: 1 },
    )
    expect(r.entries[0].total).toBe(100)
  })

  it('storeIds subset でフィルタ', () => {
    const r = projectTimeSlotSeries(
      [
        row({ storeId: 's1', hour: 10, amount: 100 }),
        row({ storeId: 's2', hour: 10, amount: 200 }),
        row({ storeId: 's3', hour: 10, amount: 300 }),
      ],
      { dayCount: 1, storeIds: new Set(['s1', 's3']) },
    )
    expect(r.entries.map((e) => e.storeId)).toEqual(['s1', 's3'])
  })

  it('storeIds 空 set は全店採用', () => {
    const r = projectTimeSlotSeries(
      [row({ storeId: 's1', hour: 10 }), row({ storeId: 's2', hour: 10 })],
      { dayCount: 1, storeIds: new Set() },
    )
    expect(r.entries).toHaveLength(2)
  })

  it('entries は storeId 昇順', () => {
    const r = projectTimeSlotSeries(
      [
        row({ storeId: 's3', hour: 10 }),
        row({ storeId: 's1', hour: 10 }),
        row({ storeId: 's2', hour: 10 }),
      ],
      { dayCount: 1 },
    )
    expect(r.entries.map((e) => e.storeId)).toEqual(['s1', 's2', 's3'])
  })

  it('total は null を除外して合計', () => {
    const r = projectTimeSlotSeries(
      [
        row({ storeId: 's1', hour: 10, amount: 100, quantity: 5 }),
        row({ storeId: 's1', hour: 15, amount: 200, quantity: 8 }),
      ],
      { dayCount: 1 },
    )
    expect(r.entries[0].total).toBe(300)
    expect(r.entries[0].totalQuantity).toBe(13)
  })

  it('grandTotal は全 entries の合計', () => {
    const r = projectTimeSlotSeries(
      [
        row({ storeId: 's1', hour: 10, amount: 100, quantity: 10 }),
        row({ storeId: 's2', hour: 11, amount: 200, quantity: 20 }),
      ],
      { dayCount: 1 },
    )
    expect(r.grandTotal).toBe(300)
    expect(r.grandTotalQuantity).toBe(30)
  })

  it('EMPTY_TIME_SLOT_SERIES は空 constants', () => {
    expect(EMPTY_TIME_SLOT_SERIES.entries).toEqual([])
    expect(EMPTY_TIME_SLOT_SERIES.dayCount).toBe(0)
  })
})
