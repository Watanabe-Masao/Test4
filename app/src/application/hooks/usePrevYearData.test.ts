import { describe, it, expect } from 'vitest'
import { calcSameDowOffset } from './usePrevYearData'

describe('calcSameDowOffset', () => {
  it('2026年2月: オフセット1（日曜 vs 前年土曜）', () => {
    // 2026-02-01(日=0), 2025-02-01(土=6)
    // offset = ((0 - 6) % 7 + 7) % 7 = 1
    expect(calcSameDowOffset(2026, 2)).toBe(1)
  })

  it('曜日差が正のケース', () => {
    // 2025-03-01(土=6), 2024-03-01(金=5)
    // offset = ((6 - 5) % 7 + 7) % 7 = 1
    expect(calcSameDowOffset(2025, 3)).toBe(1)
  })

  it('うるう年跨ぎでオフセット2', () => {
    // 2025-01-01(水=3), 2024-01-01(月=1)
    // offset = ((3 - 1) % 7 + 7) % 7 = 2
    expect(calcSameDowOffset(2025, 1)).toBe(2)
  })

  it('オフセットは常に 0〜6 の範囲', () => {
    for (let year = 2020; year <= 2030; year++) {
      for (let month = 1; month <= 12; month++) {
        const offset = calcSameDowOffset(year, month)
        expect(offset).toBeGreaterThanOrEqual(0)
        expect(offset).toBeLessThanOrEqual(6)
      }
    }
  })

  it('オフセットが曜日差と一致する', () => {
    // 任意の年月で、offset が当年と前年の月初曜日差に等しいことを確認
    for (let year = 2020; year <= 2030; year++) {
      for (let month = 1; month <= 12; month++) {
        const offset = calcSameDowOffset(year, month)
        const curDow = new Date(year, month - 1, 1).getDay()
        const prevDow = new Date(year - 1, month - 1, 1).getDay()
        const expected = ((curDow - prevDow) % 7 + 7) % 7
        expect(offset).toBe(expected)
      }
    }
  })

  it('連続年ではオフセットは1または2（0にはならない）', () => {
    // 連続する年では曜日が必ず1日か2日ずれる
    for (let year = 2020; year <= 2030; year++) {
      for (let month = 1; month <= 12; month++) {
        const offset = calcSameDowOffset(year, month)
        expect(offset).toBeGreaterThanOrEqual(1)
        expect(offset).toBeLessThanOrEqual(2)
      }
    }
  })
})
