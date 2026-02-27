import { describe, it, expect } from 'vitest'
import { computeDivisor, countDistinctDays, computeDowDivisorMap } from '../divisor'
import type { CategoryTimeSalesRecord } from '@/domain/models'

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

describe('computeDivisor', () => {
  it('total モードは常に 1 を返す', () => {
    expect(computeDivisor(0, 'total')).toBe(1)
    expect(computeDivisor(10, 'total')).toBe(1)
    expect(computeDivisor(100, 'total')).toBe(1)
  })

  it('dailyAvg モードは distinctDayCount を返す', () => {
    expect(computeDivisor(5, 'dailyAvg')).toBe(5)
    expect(computeDivisor(28, 'dailyAvg')).toBe(28)
  })

  it('dowAvg モードは distinctDayCount を返す', () => {
    expect(computeDivisor(4, 'dowAvg')).toBe(4)
  })

  it('0 日でも 1 を返す（0除算防止）', () => {
    expect(computeDivisor(0, 'dailyAvg')).toBe(1)
    expect(computeDivisor(0, 'dowAvg')).toBe(1)
  })
})

describe('countDistinctDays', () => {
  it('空レコードで 0', () => {
    expect(countDistinctDays([])).toBe(0)
  })

  it('異なる日のレコードをカウント', () => {
    const records = [makeRecord({ day: 1 }), makeRecord({ day: 2 }), makeRecord({ day: 3 })]
    expect(countDistinctDays(records)).toBe(3)
  })

  it('同一日の重複レコードは 1 としてカウント', () => {
    const records = [
      makeRecord({ day: 1, department: { code: 'D01', name: '食品' } }),
      makeRecord({ day: 1, department: { code: 'D02', name: '雑貨' } }),
      makeRecord({ day: 2 }),
    ]
    expect(countDistinctDays(records)).toBe(2)
  })
})

describe('computeDowDivisorMap', () => {
  it('空レコードで空マップ', () => {
    const result = computeDowDivisorMap([], 2026, 2)
    expect(result.size).toBe(0)
  })

  it('曜日別の distinct day 数を返す', () => {
    // 2026年2月: 1日=日曜, 2日=月曜, 8日=日曜, 9日=月曜
    const records = [
      makeRecord({ day: 1 }), // 日曜
      makeRecord({ day: 2 }), // 月曜
      makeRecord({ day: 8 }), // 日曜
      makeRecord({ day: 9 }), // 月曜
    ]
    const result = computeDowDivisorMap(records, 2026, 2)
    expect(result.get(0)).toBe(2) // 日曜: 2日
    expect(result.get(1)).toBe(2) // 月曜: 2日
  })

  it('同一日の複数レコードは 1日 としてカウント', () => {
    // day=1 に2レコードあっても日曜は 1日
    const records = [
      makeRecord({ day: 1, department: { code: 'D01', name: '食品' } }),
      makeRecord({ day: 1, department: { code: 'D02', name: '雑貨' } }),
    ]
    const result = computeDowDivisorMap(records, 2026, 2)
    expect(result.get(0)).toBe(1) // 日曜: 1日
  })
})
