import { describe, it, expect } from 'vitest'
import { splitDateRangeByMonth } from '../DateRangeChunks'

describe('splitDateRangeByMonth', () => {
  it('同月の場合はチャンク1つ', () => {
    const result = splitDateRangeByMonth(
      { year: 2026, month: 3, day: 1 },
      { year: 2026, month: 3, day: 15 },
    )
    expect(result).toEqual([
      { year: 2026, month: 3, days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
    ])
  })

  it('月跨ぎ: 1月末→2月初', () => {
    const result = splitDateRangeByMonth(
      { year: 2026, month: 1, day: 29 },
      { year: 2026, month: 2, day: 3 },
    )
    expect(result).toEqual([
      { year: 2026, month: 1, days: [29, 30, 31] },
      { year: 2026, month: 2, days: [1, 2, 3] },
    ])
  })

  it('年跨ぎ: 12月末→1月初', () => {
    const result = splitDateRangeByMonth(
      { year: 2025, month: 12, day: 30 },
      { year: 2026, month: 1, day: 2 },
    )
    expect(result).toEqual([
      { year: 2025, month: 12, days: [30, 31] },
      { year: 2026, month: 1, days: [1, 2] },
    ])
  })

  it('閏年2月: 2024年は29日まで', () => {
    const result = splitDateRangeByMonth(
      { year: 2024, month: 2, day: 28 },
      { year: 2024, month: 3, day: 1 },
    )
    expect(result).toEqual([
      { year: 2024, month: 2, days: [28, 29] },
      { year: 2024, month: 3, days: [1] },
    ])
  })

  it('非閏年2月: 2025年は28日まで', () => {
    const result = splitDateRangeByMonth(
      { year: 2025, month: 2, day: 27 },
      { year: 2025, month: 3, day: 1 },
    )
    expect(result).toEqual([
      { year: 2025, month: 2, days: [27, 28] },
      { year: 2025, month: 3, days: [1] },
    ])
  })

  it('同一日の場合はチャンク1つ・日1つ', () => {
    const result = splitDateRangeByMonth(
      { year: 2026, month: 3, day: 15 },
      { year: 2026, month: 3, day: 15 },
    )
    expect(result).toEqual([{ year: 2026, month: 3, days: [15] }])
  })

  it('3ヶ月跨ぎ', () => {
    const result = splitDateRangeByMonth(
      { year: 2026, month: 1, day: 30 },
      { year: 2026, month: 3, day: 2 },
    )
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ year: 2026, month: 1, days: [30, 31] })
    expect(result[1].year).toBe(2026)
    expect(result[1].month).toBe(2)
    expect(result[1].days[0]).toBe(1)
    expect(result[1].days[result[1].days.length - 1]).toBe(28)
    expect(result[2]).toEqual({ year: 2026, month: 3, days: [1, 2] })
  })
})
