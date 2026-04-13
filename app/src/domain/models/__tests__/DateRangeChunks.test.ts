/**
 * splitDateRangeByMonth のユニットテスト
 *
 * 同月・月跨ぎ・年跨ぎ・単日・長期間のケースを検証する。
 */
import { describe, it, expect } from 'vitest'
import { splitDateRangeByMonth } from '@/domain/models/DateRangeChunks'
import type { CalendarDate } from '@/domain/models/CalendarDate'

const cd = (year: number, month: number, day: number): CalendarDate => ({ year, month, day })

describe('splitDateRangeByMonth', () => {
  it('同月内の範囲を単一チャンクに分割する', () => {
    const chunks = splitDateRangeByMonth(cd(2026, 3, 1), cd(2026, 3, 15))
    expect(chunks).toHaveLength(1)
    expect(chunks[0].year).toBe(2026)
    expect(chunks[0].month).toBe(3)
    expect(chunks[0].days).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  it('単日の範囲も処理できる', () => {
    const chunks = splitDateRangeByMonth(cd(2026, 5, 10), cd(2026, 5, 10))
    expect(chunks).toHaveLength(1)
    expect(chunks[0].days).toEqual([10])
  })

  it('月跨ぎの範囲を2つのチャンクに分割する', () => {
    const chunks = splitDateRangeByMonth(cd(2026, 1, 29), cd(2026, 2, 3))
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toEqual({ year: 2026, month: 1, days: [29, 30, 31] })
    expect(chunks[1]).toEqual({ year: 2026, month: 2, days: [1, 2, 3] })
  })

  it('年跨ぎの範囲を正しく処理する', () => {
    const chunks = splitDateRangeByMonth(cd(2025, 12, 30), cd(2026, 1, 2))
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toEqual({ year: 2025, month: 12, days: [30, 31] })
    expect(chunks[1]).toEqual({ year: 2026, month: 1, days: [1, 2] })
  })

  it('3ヶ月以上の範囲を月ごとに分割する', () => {
    const chunks = splitDateRangeByMonth(cd(2026, 1, 30), cd(2026, 3, 2))
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toEqual({ year: 2026, month: 1, days: [30, 31] })
    // 2026-2: 28 days (non-leap)
    expect(chunks[1].year).toBe(2026)
    expect(chunks[1].month).toBe(2)
    expect(chunks[1].days).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
      27, 28,
    ])
    expect(chunks[2]).toEqual({ year: 2026, month: 3, days: [1, 2] })
  })

  it('閏年の2月を正しく分割する', () => {
    const chunks = splitDateRangeByMonth(cd(2024, 2, 28), cd(2024, 3, 1))
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toEqual({ year: 2024, month: 2, days: [28, 29] })
    expect(chunks[1]).toEqual({ year: 2024, month: 3, days: [1] })
  })

  it('from === to の境界日を返す', () => {
    const chunks = splitDateRangeByMonth(cd(2026, 6, 30), cd(2026, 6, 30))
    expect(chunks).toHaveLength(1)
    expect(chunks[0].days).toEqual([30])
  })
})
