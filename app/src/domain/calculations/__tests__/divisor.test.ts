import { describe, it, expect } from 'vitest'
import { computeDivisor, countDistinctDays, filterByStore } from '../divisor'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

function makeRecord(day: number, storeId = 's1'): CategoryTimeSalesRecord {
  return { day, storeId, timeSlots: [] } as unknown as CategoryTimeSalesRecord
}

describe('computeDivisor', () => {
  it('total モード → 1', () => expect(computeDivisor(15, 'total')).toBe(1))
  it('daily モード → distinctDayCount', () => expect(computeDivisor(15, 'dailyAvg')).toBe(15))
  it('0日 → 1（ゼロ除算防止）', () => expect(computeDivisor(0, 'dailyAvg')).toBe(1))
})

describe('countDistinctDays', () => {
  it('3日分のレコード → 3', () => {
    const recs = [makeRecord(1), makeRecord(2), makeRecord(3)]
    expect(countDistinctDays(recs)).toBe(3)
  })
  it('同一日の重複 → 1', () => {
    const recs = [makeRecord(1), makeRecord(1), makeRecord(1)]
    expect(countDistinctDays(recs)).toBe(1)
  })
  it('空配列 → 0', () => expect(countDistinctDays([])).toBe(0))
})

describe('filterByStore', () => {
  const recs = [makeRecord(1, 's1'), makeRecord(2, 's2'), makeRecord(3, 's1')]

  it('空集合 → 全件返却', () => {
    expect(filterByStore(recs, new Set())).toHaveLength(3)
  })
  it('s1 のみ → 2件', () => {
    expect(filterByStore(recs, new Set(['s1']))).toHaveLength(2)
  })
  it('存在しない store → 0件', () => {
    expect(filterByStore(recs, new Set(['s99']))).toHaveLength(0)
  })
})
