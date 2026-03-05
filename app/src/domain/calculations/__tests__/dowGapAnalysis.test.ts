/**
 * 曜日ギャップ分析テスト
 */
import { describe, it, expect } from 'vitest'
import { countDowsInMonth, analyzeDowGap, ZERO_DOW_GAP_ANALYSIS } from '../dowGapAnalysis'

describe('countDowsInMonth', () => {
  it('2026年3月は31日: 各曜日4〜5日', () => {
    const counts = countDowsInMonth(2026, 3)
    const total = counts.reduce((s, c) => s + c, 0)
    expect(total).toBe(31)
    // 2026-03-01 is Sunday(0), so Sunday has 5 days
    expect(counts[0]).toBe(5) // 日
  })

  it('2026年2月は28日: 各曜日ちょうど4日', () => {
    const counts = countDowsInMonth(2026, 2)
    const total = counts.reduce((s, c) => s + c, 0)
    expect(total).toBe(28)
    for (const c of counts) {
      expect(c).toBe(4)
    }
  })

  it('2024年2月は29日（うるう年）', () => {
    const counts = countDowsInMonth(2024, 2)
    const total = counts.reduce((s, c) => s + c, 0)
    expect(total).toBe(29)
  })
})

describe('analyzeDowGap', () => {
  it('同一年月なら差分ゼロ', () => {
    const result = analyzeDowGap(2026, 3, 2026, 3, 100000)
    expect(result.dowCounts).toHaveLength(7)
    for (const d of result.dowCounts) {
      expect(d.diff).toBe(0)
    }
    expect(result.estimatedImpact).toBe(0)
    expect(result.isValid).toBe(true)
  })

  it('日数が異なる月の差分を正しく計算する', () => {
    // 2026年3月(31日) vs 2025年3月(31日)
    const result = analyzeDowGap(2026, 3, 2025, 3, 400000)
    // 合計日数は同じ31日なので total diff は 0
    const totalDiff = result.dowCounts.reduce((s, d) => s + d.diff, 0)
    expect(totalDiff).toBe(0)
    expect(result.isValid).toBe(true)
  })

  it('28日 vs 31日なら合計差は -3', () => {
    // 2026年2月(28日) vs 2026年3月(31日)
    const result = analyzeDowGap(2026, 2, 2026, 3, 500000)
    const totalDiff = result.dowCounts.reduce((s, d) => s + d.diff, 0)
    expect(totalDiff).toBe(-3) // 28 - 31
    expect(result.estimatedImpact).toBe(-3 * 500000)
    expect(result.isValid).toBe(true)
  })

  it('日平均売上ゼロなら isValid: false', () => {
    const result = analyzeDowGap(2026, 3, 2025, 3, 0)
    expect(result.isValid).toBe(false)
    expect(result.estimatedImpact).toBe(0)
  })

  it('dowCounts は 日〜土の7要素', () => {
    const result = analyzeDowGap(2026, 3, 2025, 3, 100000)
    expect(result.dowCounts.map((d) => d.label)).toEqual(['日', '月', '火', '水', '木', '金', '土'])
    expect(result.dowCounts.map((d) => d.dow)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

describe('ZERO_DOW_GAP_ANALYSIS', () => {
  it('全フィールドがゼロ/false', () => {
    expect(ZERO_DOW_GAP_ANALYSIS.estimatedImpact).toBe(0)
    expect(ZERO_DOW_GAP_ANALYSIS.isValid).toBe(false)
    expect(ZERO_DOW_GAP_ANALYSIS.dowCounts).toHaveLength(7)
    for (const d of ZERO_DOW_GAP_ANALYSIS.dowCounts) {
      expect(d.currentCount).toBe(0)
      expect(d.previousCount).toBe(0)
      expect(d.diff).toBe(0)
    }
  })
})
