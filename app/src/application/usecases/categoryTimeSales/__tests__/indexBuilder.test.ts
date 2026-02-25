import { describe, it, expect } from 'vitest'
import { buildCategoryTimeSalesIndex } from '../indexBuilder'
import { EMPTY_CTS_INDEX } from '@/domain/models'
import type { CategoryTimeSalesData, CategoryTimeSalesRecord } from '@/domain/models'

function makeRecord(overrides: Partial<CategoryTimeSalesRecord> = {}): CategoryTimeSalesRecord {
  return {
    year: 2026,
    month: 2,
    day: 1,
    storeId: 'S001',
    department: { code: 'D01', name: '食品' },
    line: { code: 'L01', name: '生鮮' },
    klass: { code: 'K01', name: '青果' },
    timeSlots: [{ hour: 10, quantity: 5, amount: 1000 }],
    totalQuantity: 5,
    totalAmount: 1000,
    ...overrides,
  }
}

describe('buildCategoryTimeSalesIndex', () => {
  it('空データで EMPTY_CTS_INDEX を返す', () => {
    const data: CategoryTimeSalesData = { records: [] }
    const result = buildCategoryTimeSalesIndex(data)
    expect(result).toBe(EMPTY_CTS_INDEX)
  })

  it('単一レコードで正しくインデックスを構築する', () => {
    const rec = makeRecord()
    const data: CategoryTimeSalesData = { records: [rec] }
    const result = buildCategoryTimeSalesIndex(data)

    expect(result.recordCount).toBe(1)
    expect(result.storeIds).toEqual(new Set(['S001']))

    expect(result.allDateKeys).toEqual(new Set(['2026-02-01']))
    const dateMap = result.byStoreDate.get('S001')
    expect(dateMap).toBeDefined()
    expect(dateMap!.get('2026-02-01')).toEqual([rec])
  })

  it('複数店舗×複数日でインデックスが正しく構造化される', () => {
    const records = [
      makeRecord({ storeId: 'S001', day: 1 }),
      makeRecord({ storeId: 'S001', day: 2 }),
      makeRecord({ storeId: 'S002', day: 1 }),
      makeRecord({ storeId: 'S002', day: 3 }),
    ]
    const data: CategoryTimeSalesData = { records }
    const result = buildCategoryTimeSalesIndex(data)

    expect(result.recordCount).toBe(4)
    expect(result.storeIds).toEqual(new Set(['S001', 'S002']))
    expect(result.allDateKeys).toEqual(new Set(['2026-02-01', '2026-02-02', '2026-02-03']))

    // S001 は day=1, day=2 にレコードあり
    const s001 = result.byStoreDate.get('S001')!
    expect(s001.get('2026-02-01')!.length).toBe(1)
    expect(s001.get('2026-02-02')!.length).toBe(1)
    expect(s001.has('2026-02-03')).toBe(false)

    // S002 は day=1, day=3 にレコードあり
    const s002 = result.byStoreDate.get('S002')!
    expect(s002.get('2026-02-01')!.length).toBe(1)
    expect(s002.get('2026-02-03')!.length).toBe(1)
  })

  it('同一 (storeId, day) の複数レコードが同じ配列にまとまる', () => {
    const records = [
      makeRecord({ storeId: 'S001', day: 1, department: { code: 'D01', name: '食品' } }),
      makeRecord({ storeId: 'S001', day: 1, department: { code: 'D02', name: '雑貨' } }),
    ]
    const data: CategoryTimeSalesData = { records }
    const result = buildCategoryTimeSalesIndex(data)

    expect(result.recordCount).toBe(2)
    const dateRecords = result.byStoreDate.get('S001')!.get('2026-02-01')!
    expect(dateRecords.length).toBe(2)
  })
})
