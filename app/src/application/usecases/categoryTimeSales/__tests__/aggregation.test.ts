import { describe, it, expect } from 'vitest'
import {
  aggregateHourly,
  aggregateByLevel,
  aggregateHourDow,
  aggregateByStore,
} from '../aggregation'
import type { CategoryTimeSalesRecord } from '@/domain/models'

function makeRecord(overrides: Partial<CategoryTimeSalesRecord> = {}): CategoryTimeSalesRecord {
  return {
    day: 1,
    storeId: 'S001',
    department: { code: 'D01', name: '食品' },
    line: { code: 'L01', name: '生鮮' },
    klass: { code: 'K01', name: '青果' },
    timeSlots: [
      { hour: 10, quantity: 5, amount: 1000 },
      { hour: 11, quantity: 3, amount: 600 },
    ],
    totalQuantity: 8,
    totalAmount: 1600,
    ...overrides,
  }
}

describe('aggregateHourly', () => {
  it('空レコードで 0 を返す', () => {
    const result = aggregateHourly([])
    expect(result.totalAmount).toBe(0)
    expect(result.totalQuantity).toBe(0)
    expect(result.recordCount).toBe(0)
    expect(result.hourly.size).toBe(0)
  })

  it('単一レコードの時間帯を正しく集約', () => {
    const result = aggregateHourly([makeRecord()])
    expect(result.totalAmount).toBe(1600)
    expect(result.totalQuantity).toBe(8)
    expect(result.recordCount).toBe(1)
    expect(result.hourly.get(10)).toEqual({ amount: 1000, quantity: 5 })
    expect(result.hourly.get(11)).toEqual({ amount: 600, quantity: 3 })
  })

  it('複数レコードの同一時間帯を合算', () => {
    const records = [
      makeRecord({ timeSlots: [{ hour: 10, quantity: 5, amount: 1000 }], totalQuantity: 5, totalAmount: 1000 }),
      makeRecord({ timeSlots: [{ hour: 10, quantity: 3, amount: 500 }], totalQuantity: 3, totalAmount: 500 }),
    ]
    const result = aggregateHourly(records)
    expect(result.totalAmount).toBe(1500)
    expect(result.totalQuantity).toBe(8)
    expect(result.hourly.get(10)).toEqual({ amount: 1500, quantity: 8 })
  })

  it('異なる時間帯は別々に集約', () => {
    const records = [
      makeRecord({ timeSlots: [{ hour: 10, quantity: 5, amount: 1000 }], totalQuantity: 5, totalAmount: 1000 }),
      makeRecord({ timeSlots: [{ hour: 14, quantity: 2, amount: 400 }], totalQuantity: 2, totalAmount: 400 }),
    ]
    const result = aggregateHourly(records)
    expect(result.hourly.size).toBe(2)
    expect(result.hourly.get(10)).toEqual({ amount: 1000, quantity: 5 })
    expect(result.hourly.get(14)).toEqual({ amount: 400, quantity: 2 })
  })
})

describe('aggregateByLevel', () => {
  const records: CategoryTimeSalesRecord[] = [
    makeRecord({
      department: { code: 'D01', name: '食品' },
      line: { code: 'L01', name: '生鮮' },
      klass: { code: 'K01', name: '青果' },
      totalAmount: 1000,
      totalQuantity: 10,
      timeSlots: [{ hour: 10, quantity: 10, amount: 1000 }],
    }),
    makeRecord({
      department: { code: 'D01', name: '食品' },
      line: { code: 'L02', name: '加工' },
      klass: { code: 'K02', name: '缶詰' },
      totalAmount: 500,
      totalQuantity: 5,
      timeSlots: [{ hour: 10, quantity: 5, amount: 500 }],
    }),
    makeRecord({
      department: { code: 'D02', name: '雑貨' },
      line: { code: 'L03', name: '日用品' },
      klass: { code: 'K03', name: '洗剤' },
      totalAmount: 300,
      totalQuantity: 3,
      timeSlots: [{ hour: 11, quantity: 3, amount: 300 }],
    }),
  ]

  it('department レベルで正しくグルーピング', () => {
    const result = aggregateByLevel(records, 'department')
    expect(result.size).toBe(2)

    const d01 = result.get('D01')!
    expect(d01.name).toBe('食品')
    expect(d01.amount).toBe(1500)
    expect(d01.quantity).toBe(15)
    expect(d01.childCount).toBe(2) // L01, L02

    const d02 = result.get('D02')!
    expect(d02.amount).toBe(300)
    expect(d02.childCount).toBe(1) // L03
  })

  it('line レベルで正しくグルーピング', () => {
    const result = aggregateByLevel(records, 'line')
    expect(result.size).toBe(3) // L01, L02, L03

    const l01 = result.get('L01')!
    expect(l01.name).toBe('生鮮')
    expect(l01.amount).toBe(1000)
    expect(l01.childCount).toBe(1) // K01
  })

  it('klass レベルで正しくグルーピング', () => {
    const result = aggregateByLevel(records, 'klass')
    expect(result.size).toBe(3) // K01, K02, K03

    const k01 = result.get('K01')!
    expect(k01.name).toBe('青果')
    expect(k01.amount).toBe(1000)
    expect(k01.childCount).toBe(0) // klass は最下層
  })

  it('時間帯データが hour ごとに集約される', () => {
    const result = aggregateByLevel(records, 'department')
    const d01 = result.get('D01')!
    expect(d01.hours.get(10)).toBe(1500) // 1000 + 500
    expect(d01.hours.has(11)).toBe(false)

    const d02 = result.get('D02')!
    expect(d02.hours.get(11)).toBe(300)
  })

  it('空レコードで空マップ', () => {
    const result = aggregateByLevel([], 'department')
    expect(result.size).toBe(0)
  })
})

describe('aggregateHourDow', () => {
  // 2026年2月: 1日=日曜, 2日=月曜, 8日=日曜
  const records: CategoryTimeSalesRecord[] = [
    makeRecord({
      day: 1, // 日曜
      timeSlots: [{ hour: 10, quantity: 5, amount: 1000 }],
      totalQuantity: 5,
      totalAmount: 1000,
    }),
    makeRecord({
      day: 8, // 日曜
      timeSlots: [{ hour: 10, quantity: 3, amount: 600 }],
      totalQuantity: 3,
      totalAmount: 600,
    }),
    makeRecord({
      day: 2, // 月曜
      timeSlots: [{ hour: 11, quantity: 2, amount: 400 }],
      totalQuantity: 2,
      totalAmount: 400,
    }),
  ]

  it('hour × dow マトリクスを正しく構築', () => {
    const result = aggregateHourDow(records, 2026, 2)

    // hour=10, dow=0 (日曜) → 1000 + 600 = 1600
    expect(result.matrix.get(10)!.get(0)).toBe(1600)

    // hour=11, dow=1 (月曜) → 400
    expect(result.matrix.get(11)!.get(1)).toBe(400)
  })

  it('dowDaySets が曜日別の日セットを返す', () => {
    const result = aggregateHourDow(records, 2026, 2)

    // 日曜 → day=1, day=8 の 2日
    expect(result.dowDaySets.get(0)!.size).toBe(2)

    // 月曜 → day=2 の 1日
    expect(result.dowDaySets.get(1)!.size).toBe(1)
  })

  it('allDays が全日付を含む', () => {
    const result = aggregateHourDow(records, 2026, 2)
    expect(result.allDays).toEqual(new Set([1, 2, 8]))
  })
})

describe('aggregateByStore', () => {
  const records: CategoryTimeSalesRecord[] = [
    makeRecord({
      storeId: 'S001',
      timeSlots: [{ hour: 10, quantity: 5, amount: 1000 }],
      totalAmount: 1000,
    }),
    makeRecord({
      storeId: 'S001',
      timeSlots: [{ hour: 11, quantity: 3, amount: 600 }],
      totalAmount: 600,
    }),
    makeRecord({
      storeId: 'S002',
      timeSlots: [{ hour: 10, quantity: 2, amount: 400 }],
      totalAmount: 400,
    }),
  ]

  it('店舗別に集約される', () => {
    const result = aggregateByStore(records)
    expect(result.size).toBe(2)

    const s001 = result.get('S001')!
    expect(s001.totalAmount).toBe(1600)
    expect(s001.hours.get(10)).toBe(1000)
    expect(s001.hours.get(11)).toBe(600)

    const s002 = result.get('S002')!
    expect(s002.totalAmount).toBe(400)
    expect(s002.hours.get(10)).toBe(400)
  })

  it('空レコードで空マップ', () => {
    const result = aggregateByStore([])
    expect(result.size).toBe(0)
  })
})
