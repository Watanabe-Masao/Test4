import { describe, it, expect } from 'vitest'
import { queryByDateRange } from '../filters'
import { buildCategoryTimeSalesIndex } from '../indexBuilder'
import type { CategoryTimeSalesData, CategoryTimeSalesRecord, DateRange } from '@/domain/models'

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

describe('queryByDateRange (basic)', () => {
  const records = [
    makeRecord({ storeId: 'S001', year: 2026, month: 2, day: 1 }),
    makeRecord({ storeId: 'S001', year: 2026, month: 2, day: 2 }),
    makeRecord({ storeId: 'S001', year: 2026, month: 2, day: 5 }),
    makeRecord({ storeId: 'S002', year: 2026, month: 2, day: 1 }),
    makeRecord({ storeId: 'S002', year: 2026, month: 2, day: 3 }),
  ]
  const index = buildIndex(records)
  const fullRange: DateRange = {
    from: { year: 2026, month: 2, day: 1 },
    to: { year: 2026, month: 2, day: 28 },
  }

  it('全店舗・全日付範囲で全レコードを返す', () => {
    const result = queryByDateRange(index, { dateRange: fullRange })
    expect(result.length).toBe(5)
  })

  it('店舗フィルタで絞り込める', () => {
    const result = queryByDateRange(index, { dateRange: fullRange, storeIds: new Set(['S001']) })
    expect(result.length).toBe(3)
    expect(result.every((r) => r.storeId === 'S001')).toBe(true)
  })

  it('日付範囲フィルタで絞り込める', () => {
    const range: DateRange = {
      from: { year: 2026, month: 2, day: 2 },
      to: { year: 2026, month: 2, day: 3 },
    }
    const result = queryByDateRange(index, { dateRange: range })
    expect(result.length).toBe(2)
    expect(result.map((r) => r.day).sort()).toEqual([2, 3])
  })

  it('店舗 + 日付範囲の複合フィルタ', () => {
    const range: DateRange = {
      from: { year: 2026, month: 2, day: 1 },
      to: { year: 2026, month: 2, day: 2 },
    }
    const result = queryByDateRange(index, { dateRange: range, storeIds: new Set(['S002']) })
    expect(result.length).toBe(1)
    expect(result[0].storeId).toBe('S002')
    expect(result[0].day).toBe(1)
  })

  it('該当なしで空配列を返す', () => {
    const result = queryByDateRange(index, { dateRange: fullRange, storeIds: new Set(['S999']) })
    expect(result.length).toBe(0)
  })

  describe('階層フィルタ', () => {
    const hierarchyRecords = [
      makeRecord({
        day: 1,
        department: { code: 'D01', name: '食品' },
        line: { code: 'L01', name: '生鮮' },
        klass: { code: 'K01', name: '青果' },
      }),
      makeRecord({
        day: 1,
        department: { code: 'D01', name: '食品' },
        line: { code: 'L02', name: '加工' },
        klass: { code: 'K02', name: '缶詰' },
      }),
      makeRecord({
        day: 1,
        department: { code: 'D02', name: '雑貨' },
        line: { code: 'L03', name: '日用品' },
        klass: { code: 'K03', name: '洗剤' },
      }),
    ]
    const hIndex = buildIndex(hierarchyRecords)
    const dayRange: DateRange = {
      from: { year: 2026, month: 2, day: 1 },
      to: { year: 2026, month: 2, day: 1 },
    }

    it('departmentCode でフィルタ', () => {
      const result = queryByDateRange(hIndex, {
        dateRange: dayRange,
        hierarchy: { departmentCode: 'D01' },
      })
      expect(result.length).toBe(2)
    })

    it('lineCode でフィルタ', () => {
      const result = queryByDateRange(hIndex, {
        dateRange: dayRange,
        hierarchy: { lineCode: 'L02' },
      })
      expect(result.length).toBe(1)
      expect(result[0].line.code).toBe('L02')
    })

    it('klassCode でフィルタ', () => {
      const result = queryByDateRange(hIndex, {
        dateRange: dayRange,
        hierarchy: { klassCode: 'K03' },
      })
      expect(result.length).toBe(1)
      expect(result[0].klass.code).toBe('K03')
    })

    it('階層条件なしで全レコード返す', () => {
      const result = queryByDateRange(hIndex, { dateRange: dayRange, hierarchy: {} })
      expect(result.length).toBe(3)
    })
  })
})

describe('queryByDateRange', () => {
  const records = [
    makeRecord({ storeId: 'S001', year: 2026, month: 2, day: 1 }),
    makeRecord({ storeId: 'S001', year: 2026, month: 2, day: 15 }),
    makeRecord({ storeId: 'S001', year: 2026, month: 2, day: 28 }),
    makeRecord({ storeId: 'S002', year: 2026, month: 2, day: 1 }),
    makeRecord({ storeId: 'S002', year: 2026, month: 2, day: 10 }),
  ]
  const index = buildIndex(records)

  it('全店舗・全日付範囲で全レコードを返す', () => {
    const range: DateRange = {
      from: { year: 2026, month: 2, day: 1 },
      to: { year: 2026, month: 2, day: 28 },
    }
    const result = queryByDateRange(index, { dateRange: range })
    expect(result.length).toBe(5)
  })

  it('店舗フィルタで絞り込める', () => {
    const range: DateRange = {
      from: { year: 2026, month: 2, day: 1 },
      to: { year: 2026, month: 2, day: 28 },
    }
    const result = queryByDateRange(index, {
      dateRange: range,
      storeIds: new Set(['S001']),
    })
    expect(result.length).toBe(3)
    expect(result.every((r) => r.storeId === 'S001')).toBe(true)
  })

  it('日付範囲フィルタで絞り込める', () => {
    const range: DateRange = {
      from: { year: 2026, month: 2, day: 10 },
      to: { year: 2026, month: 2, day: 15 },
    }
    const result = queryByDateRange(index, { dateRange: range })
    expect(result.length).toBe(2)
    expect(result.map((r) => r.day).sort()).toEqual([10, 15])
  })

  it('dateKey は YYYY-MM-DD 辞書順で比較される', () => {
    // day=1 → '2026-02-01', day=28 → '2026-02-28'
    // 辞書順で '2026-02-01' < '2026-02-15' < '2026-02-28'
    const range: DateRange = {
      from: { year: 2026, month: 2, day: 2 },
      to: { year: 2026, month: 2, day: 14 },
    }
    const result = queryByDateRange(index, { dateRange: range })
    expect(result.length).toBe(1) // S002 の day=10 のみ
    expect(result[0].day).toBe(10)
  })

  it('該当なしで空配列を返す', () => {
    const range: DateRange = {
      from: { year: 2025, month: 1, day: 1 },
      to: { year: 2025, month: 1, day: 31 },
    }
    const result = queryByDateRange(index, { dateRange: range })
    expect(result.length).toBe(0)
  })
})

describe('queryByDateRange (dow filter)', () => {
  // 2026年2月: 1日=日曜, 2日=月曜, 3日=火曜, 8日=日曜
  const records = [
    makeRecord({ year: 2026, month: 2, day: 1 }), // 日曜 (0)
    makeRecord({ year: 2026, month: 2, day: 2 }), // 月曜 (1)
    makeRecord({ year: 2026, month: 2, day: 3 }), // 火曜 (2)
    makeRecord({ year: 2026, month: 2, day: 8 }), // 日曜 (0)
  ]
  const index = buildIndex(records)
  const fullRange: DateRange = {
    from: { year: 2026, month: 2, day: 1 },
    to: { year: 2026, month: 2, day: 28 },
  }

  it('dow 未指定で全レコード返す', () => {
    const result = queryByDateRange(index, { dateRange: fullRange })
    expect(result.length).toBe(4)
  })

  it('日曜のみフィルタ', () => {
    const result = queryByDateRange(index, { dateRange: fullRange, dow: new Set([0]) })
    expect(result.length).toBe(2)
    expect(result.every((r) => r.day === 1 || r.day === 8)).toBe(true)
  })

  it('月曜+火曜フィルタ', () => {
    const result = queryByDateRange(index, { dateRange: fullRange, dow: new Set([1, 2]) })
    expect(result.length).toBe(2)
    expect(result.map((r) => r.day).sort()).toEqual([2, 3])
  })

  it('該当なしで空配列', () => {
    const result = queryByDateRange(index, { dateRange: fullRange, dow: new Set([6]) }) // 土曜
    expect(result.length).toBe(0)
  })
})
