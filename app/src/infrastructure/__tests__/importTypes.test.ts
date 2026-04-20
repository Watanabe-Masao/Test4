/**
 * importTypes — createEmptyMonthPartitions / mergeRecordPartitions / mergeMapPartitions
 */
import { describe, it, expect } from 'vitest'
import {
  createEmptyMonthPartitions,
  mergeRecordPartitions,
  mergeMapPartitions,
  detectYearMonthFromPartitionsOrRecords,
} from '../importTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'

describe('createEmptyMonthPartitions', () => {
  it('全フィールドが空オブジェクト', () => {
    const mp = createEmptyMonthPartitions()
    expect(mp.purchase).toEqual({})
    expect(mp.flowers).toEqual({})
    expect(mp.directProduce).toEqual({})
    expect(mp.interStoreIn).toEqual({})
    expect(mp.interStoreOut).toEqual({})
    expect(mp.consumables).toEqual({})
    expect(mp.budget).toEqual({})
  })
})

describe('mergeRecordPartitions', () => {
  it('空同士で空', () => {
    expect(mergeRecordPartitions({}, {})).toEqual({})
  })

  it('existing のみ', () => {
    const r = mergeRecordPartitions({ '2026-3': { records: [1, 2] } }, {})
    expect(r['2026-3'].records).toEqual([1, 2])
  })

  it('incoming のみ', () => {
    const r = mergeRecordPartitions({}, { '2026-3': { records: [3] } })
    expect(r['2026-3'].records).toEqual([3])
  })

  it('同月キーは concat', () => {
    const r = mergeRecordPartitions(
      { '2026-3': { records: [1, 2] } },
      { '2026-3': { records: [3, 4] } },
    )
    expect(r['2026-3'].records).toEqual([1, 2, 3, 4])
  })

  it('異なる月キーは両方保持', () => {
    const r = mergeRecordPartitions({ '2026-3': { records: [1] } }, { '2026-4': { records: [2] } })
    expect(r['2026-3'].records).toEqual([1])
    expect(r['2026-4'].records).toEqual([2])
  })
})

describe('mergeMapPartitions', () => {
  it('空同士で空', () => {
    expect(mergeMapPartitions({}, {})).toEqual({})
  })

  it('同月 Map はマージ（incoming 優先）', () => {
    const existing = { '2026-3': new Map([['k1', 'v1']]) }
    const incoming = { '2026-3': new Map([['k2', 'v2']]) }
    const r = mergeMapPartitions(existing, incoming)
    expect(r['2026-3'].get('k1')).toBe('v1')
    expect(r['2026-3'].get('k2')).toBe('v2')
  })

  it('同一キーは incoming で上書き', () => {
    const existing = { '2026-3': new Map([['k1', 'old']]) }
    const incoming = { '2026-3': new Map([['k1', 'new']]) }
    const r = mergeMapPartitions(existing, incoming)
    expect(r['2026-3'].get('k1')).toBe('new')
  })

  it('異なる月キーは両方保持', () => {
    const r = mergeMapPartitions(
      { '2026-3': new Map([['k1', 'v1']]) },
      { '2026-4': new Map([['k2', 'v2']]) },
    )
    expect(r['2026-3'].get('k1')).toBe('v1')
    expect(r['2026-4'].get('k2')).toBe('v2')
  })
})

describe('detectYearMonthFromPartitionsOrRecords', () => {
  function emptyData(): MonthlyData {
    return {
      classifiedSales: { records: [] },
      categoryTimeSales: { records: [] },
      departmentKpi: { records: [] },
      purchase: { records: [] },
      flowers: { records: [] },
      directProduce: { records: [] },
      consumables: { records: [] },
      interStoreIn: { records: [] },
      interStoreOut: { records: [] },
      stores: new Map(),
      suppliers: new Map(),
      budget: new Map(),
      settings: new Map(),
    } as unknown as MonthlyData
  }

  it('何もなければ undefined', () => {
    const r = detectYearMonthFromPartitionsOrRecords(emptyData(), createEmptyMonthPartitions())
    expect(r).toBeUndefined()
  })

  it('purchase partition キーから検出', () => {
    const mp = { ...createEmptyMonthPartitions(), purchase: { '2026-3': { records: [] } } }
    const r = detectYearMonthFromPartitionsOrRecords(emptyData(), mp)
    expect(r).toEqual({ year: 2026, month: 3 })
  })

  it('複数月あれば最古を返す', () => {
    const mp = {
      ...createEmptyMonthPartitions(),
      purchase: { '2026-3': { records: [] }, '2025-12': { records: [] } },
    }
    const r = detectYearMonthFromPartitionsOrRecords(emptyData(), mp)
    expect(r).toEqual({ year: 2025, month: 12 })
  })

  it('classifiedSales records からも検出', () => {
    const data = emptyData()
    ;(data.classifiedSales.records as unknown as Array<{ year: number; month: number }>).push({
      year: 2026,
      month: 5,
    })
    const r = detectYearMonthFromPartitionsOrRecords(data, createEmptyMonthPartitions())
    expect(r).toEqual({ year: 2026, month: 5 })
  })
})
