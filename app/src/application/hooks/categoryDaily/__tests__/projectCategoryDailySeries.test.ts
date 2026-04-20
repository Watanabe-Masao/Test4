/**
 * projectCategoryDailySeries — pure projection tests
 *
 * 検証対象:
 * - storeIds / deptCodes subset でフィルタ
 * - (deptCode, dateKey) で集約（店×時刻次元を折りたたむ）
 * - entries は deptCode 昇順、daily は dateKey 昇順
 * - customers は常に 0（現状 CTS に無い）
 * - dateKey は YYYY-MM-DD 形式
 */
import { describe, it, expect } from 'vitest'
import {
  projectCategoryDailySeries,
  EMPTY_CATEGORY_DAILY_SERIES,
} from '../projectCategoryDailySeries'
import type { CategoryTimeSalesRecord } from '@/domain/models/DataTypes'

function row(overrides: Partial<CategoryTimeSalesRecord> = {}): CategoryTimeSalesRecord {
  return {
    year: 2026,
    month: 3,
    day: 1,
    storeId: 's1',
    department: { code: 'D1', name: '野菜' },
    line: { code: 'L1', name: '葉物' },
    klass: { code: 'K1', name: '単品' },
    timeSlots: [],
    totalQuantity: 10,
    totalAmount: 1000,
    ...overrides,
  }
}

describe('projectCategoryDailySeries', () => {
  it('空 rows で空 entries', () => {
    const r = projectCategoryDailySeries([], { dayCount: 31 })
    expect(r.entries).toEqual([])
    expect(r.grandTotals).toEqual({ sales: 0, customers: 0, salesQty: 0 })
    expect(r.dayCount).toBe(31)
  })

  it('単一 row で 1 entry', () => {
    const r = projectCategoryDailySeries([row({ totalAmount: 100, totalQuantity: 5 })], {
      dayCount: 1,
    })
    expect(r.entries).toHaveLength(1)
    expect(r.entries[0].deptCode).toBe('D1')
    expect(r.entries[0].deptName).toBe('野菜')
    expect(r.entries[0].daily[0].sales).toBe(100)
    expect(r.entries[0].daily[0].salesQty).toBe(5)
  })

  it('同一 (deptCode, dateKey) の複数 row を合算（店×時刻次元を折りたたむ）', () => {
    const r = projectCategoryDailySeries(
      [
        row({ storeId: 's1', day: 1, totalAmount: 100, totalQuantity: 10 }),
        row({ storeId: 's2', day: 1, totalAmount: 200, totalQuantity: 20 }),
        row({ storeId: 's1', day: 1, totalAmount: 50, totalQuantity: 5 }),
      ],
      { dayCount: 1 },
    )
    expect(r.entries).toHaveLength(1)
    expect(r.entries[0].daily).toHaveLength(1)
    expect(r.entries[0].daily[0].sales).toBe(350)
    expect(r.entries[0].daily[0].salesQty).toBe(35)
  })

  it('異なる日は別 dataPoint', () => {
    const r = projectCategoryDailySeries(
      [row({ day: 1, totalAmount: 100 }), row({ day: 2, totalAmount: 200 })],
      { dayCount: 2 },
    )
    expect(r.entries[0].daily).toHaveLength(2)
    expect(r.entries[0].daily[0].dateKey).toBe('2026-03-01')
    expect(r.entries[0].daily[1].dateKey).toBe('2026-03-02')
  })

  it('dateKey は YYYY-MM-DD 0 埋め', () => {
    const r = projectCategoryDailySeries([row({ year: 2026, month: 1, day: 5 })], { dayCount: 1 })
    expect(r.entries[0].daily[0].dateKey).toBe('2026-01-05')
  })

  it('異なる dept は別 entry', () => {
    const r = projectCategoryDailySeries(
      [
        row({ department: { code: 'D1', name: '野菜' } }),
        row({ department: { code: 'D2', name: '鮮魚' } }),
      ],
      { dayCount: 1 },
    )
    expect(r.entries).toHaveLength(2)
  })

  it('entries は deptCode 昇順', () => {
    const r = projectCategoryDailySeries(
      [
        row({ department: { code: 'D3', name: 'C3' } }),
        row({ department: { code: 'D1', name: 'C1' } }),
        row({ department: { code: 'D2', name: 'C2' } }),
      ],
      { dayCount: 1 },
    )
    expect(r.entries.map((e) => e.deptCode)).toEqual(['D1', 'D2', 'D3'])
  })

  it('storeIds subset でフィルタ', () => {
    const r = projectCategoryDailySeries(
      [row({ storeId: 's1', totalAmount: 100 }), row({ storeId: 's2', totalAmount: 200 })],
      { dayCount: 1, storeIds: new Set(['s1']) },
    )
    expect(r.entries[0].daily[0].sales).toBe(100)
  })

  it('deptCodes subset でフィルタ', () => {
    const r = projectCategoryDailySeries(
      [
        row({ department: { code: 'D1', name: '野菜' } }),
        row({ department: { code: 'D2', name: '鮮魚' } }),
      ],
      { dayCount: 1, deptCodes: new Set(['D1']) },
    )
    expect(r.entries).toHaveLength(1)
    expect(r.entries[0].deptCode).toBe('D1')
  })

  it('customers は常に 0（CTS に無いフィールド）', () => {
    const r = projectCategoryDailySeries([row({ totalAmount: 100 })], { dayCount: 1 })
    expect(r.entries[0].daily[0].customers).toBe(0)
    expect(r.entries[0].totals.customers).toBe(0)
    expect(r.grandTotals.customers).toBe(0)
  })

  it('deptName は最初の row から pin', () => {
    const r = projectCategoryDailySeries(
      [
        row({ department: { code: 'D1', name: '初回名' } }),
        row({ department: { code: 'D1', name: '後続名' } }),
      ],
      { dayCount: 1 },
    )
    expect(r.entries[0].deptName).toBe('初回名')
  })

  it('grandTotals = 全 entries の totals 合計', () => {
    const r = projectCategoryDailySeries(
      [
        row({ department: { code: 'D1', name: '' }, totalAmount: 100, totalQuantity: 10 }),
        row({ department: { code: 'D2', name: '' }, totalAmount: 200, totalQuantity: 20 }),
      ],
      { dayCount: 1 },
    )
    expect(r.grandTotals.sales).toBe(300)
    expect(r.grandTotals.salesQty).toBe(30)
  })

  it('EMPTY_CATEGORY_DAILY_SERIES は空 constants', () => {
    expect(EMPTY_CATEGORY_DAILY_SERIES.entries).toEqual([])
    expect(EMPTY_CATEGORY_DAILY_SERIES.dayCount).toBe(0)
  })
})
