import { describe, it, expect } from 'vitest'
import { queryIndex, filterByDow } from '../filters'
import { buildCategoryTimeSalesIndex } from '../indexBuilder'
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

function buildIndex(records: CategoryTimeSalesRecord[]) {
  const data: CategoryTimeSalesData = { records }
  return buildCategoryTimeSalesIndex(data)
}

describe('queryIndex', () => {
  const records = [
    makeRecord({ storeId: 'S001', day: 1 }),
    makeRecord({ storeId: 'S001', day: 2 }),
    makeRecord({ storeId: 'S001', day: 5 }),
    makeRecord({ storeId: 'S002', day: 1 }),
    makeRecord({ storeId: 'S002', day: 3 }),
  ]
  const index = buildIndex(records)

  it('全店舗・全日付範囲で全レコードを返す', () => {
    const result = queryIndex(index, new Set(), [1, 5])
    expect(result.length).toBe(5)
  })

  it('店舗フィルタで絞り込める', () => {
    const result = queryIndex(index, new Set(['S001']), [1, 5])
    expect(result.length).toBe(3)
    expect(result.every((r) => r.storeId === 'S001')).toBe(true)
  })

  it('日付範囲フィルタで絞り込める', () => {
    const result = queryIndex(index, new Set(), [2, 3])
    expect(result.length).toBe(2)
    expect(result.map((r) => r.day).sort()).toEqual([2, 3])
  })

  it('店舗 + 日付範囲の複合フィルタ', () => {
    const result = queryIndex(index, new Set(['S002']), [1, 2])
    expect(result.length).toBe(1)
    expect(result[0].storeId).toBe('S002')
    expect(result[0].day).toBe(1)
  })

  it('該当なしで空配列を返す', () => {
    const result = queryIndex(index, new Set(['S999']), [1, 5])
    expect(result.length).toBe(0)
  })

  describe('階層フィルタ', () => {
    const hierarchyRecords = [
      makeRecord({ day: 1, department: { code: 'D01', name: '食品' }, line: { code: 'L01', name: '生鮮' }, klass: { code: 'K01', name: '青果' } }),
      makeRecord({ day: 1, department: { code: 'D01', name: '食品' }, line: { code: 'L02', name: '加工' }, klass: { code: 'K02', name: '缶詰' } }),
      makeRecord({ day: 1, department: { code: 'D02', name: '雑貨' }, line: { code: 'L03', name: '日用品' }, klass: { code: 'K03', name: '洗剤' } }),
    ]
    const hIndex = buildIndex(hierarchyRecords)

    it('departmentCode でフィルタ', () => {
      const result = queryIndex(hIndex, new Set(), [1, 1], { departmentCode: 'D01' })
      expect(result.length).toBe(2)
    })

    it('lineCode でフィルタ', () => {
      const result = queryIndex(hIndex, new Set(), [1, 1], { lineCode: 'L02' })
      expect(result.length).toBe(1)
      expect(result[0].line.code).toBe('L02')
    })

    it('klassCode でフィルタ', () => {
      const result = queryIndex(hIndex, new Set(), [1, 1], { klassCode: 'K03' })
      expect(result.length).toBe(1)
      expect(result[0].klass.code).toBe('K03')
    })

    it('階層条件なしで全レコード返す', () => {
      const result = queryIndex(hIndex, new Set(), [1, 1], {})
      expect(result.length).toBe(3)
    })
  })
})

describe('filterByDow', () => {
  // 2026年2月: 1日=日曜, 2日=月曜, ...
  const records = [
    makeRecord({ day: 1 }),  // 日曜 (0)
    makeRecord({ day: 2 }),  // 月曜 (1)
    makeRecord({ day: 3 }),  // 火曜 (2)
    makeRecord({ day: 8 }),  // 日曜 (0)
  ]

  it('空の曜日セットで全レコード返す', () => {
    const result = filterByDow(records, new Set(), 2026, 2)
    expect(result.length).toBe(4)
  })

  it('日曜のみフィルタ', () => {
    const result = filterByDow(records, new Set([0]), 2026, 2)
    expect(result.length).toBe(2)
    expect(result.every((r) => r.day === 1 || r.day === 8)).toBe(true)
  })

  it('月曜+火曜フィルタ', () => {
    const result = filterByDow(records, new Set([1, 2]), 2026, 2)
    expect(result.length).toBe(2)
    expect(result.map((r) => r.day).sort()).toEqual([2, 3])
  })

  it('該当なしで空配列', () => {
    const result = filterByDow(records, new Set([6]), 2026, 2) // 土曜
    expect(result.length).toBe(0)
  })
})
