import { describe, it, expect } from 'vitest'
import { wowPrevRange, comparisonLabels } from '../types'

describe('wowPrevRange', () => {
  it('shifts range by -7 days', () => {
    const result = wowPrevRange(15, 21)
    expect(result).toEqual({ prevStart: 8, prevEnd: 14, isValid: true })
  })

  it('handles single-day range', () => {
    const result = wowPrevRange(23, 23)
    expect(result).toEqual({ prevStart: 16, prevEnd: 16, isValid: true })
  })

  it('returns isValid=false when prevStart < 1', () => {
    const result = wowPrevRange(7, 10)
    expect(result).toEqual({ prevStart: 0, prevEnd: 3, isValid: false })
  })

  it('returns isValid=false when dayStart is exactly 7', () => {
    const result = wowPrevRange(7, 7)
    expect(result).toEqual({ prevStart: 0, prevEnd: 0, isValid: false })
  })

  it('returns isValid=true when dayStart is 8 (boundary)', () => {
    const result = wowPrevRange(8, 8)
    expect(result).toEqual({ prevStart: 1, prevEnd: 1, isValid: true })
  })

  it('handles full-week range starting at day 8', () => {
    const result = wowPrevRange(8, 14)
    expect(result).toEqual({ prevStart: 1, prevEnd: 7, isValid: true })
  })

  it('preserves range width (always 7-day shift)', () => {
    const result = wowPrevRange(10, 20)
    const curWidth = 20 - 10 + 1
    const prevWidth = result.prevEnd - result.prevStart + 1
    expect(prevWidth).toBe(curWidth)
  })

  it('handles month-end range', () => {
    const result = wowPrevRange(25, 31)
    expect(result).toEqual({ prevStart: 18, prevEnd: 24, isValid: true })
  })

  it('returns isValid=false for very early days', () => {
    expect(wowPrevRange(1, 1).isValid).toBe(false)
    expect(wowPrevRange(3, 5).isValid).toBe(false)
    expect(wowPrevRange(6, 7).isValid).toBe(false)
  })

  it('returns isValid=true for all days >= 8', () => {
    for (let d = 8; d <= 31; d++) {
      expect(wowPrevRange(d, d).isValid).toBe(true)
    }
  })
})

describe('comparisonLabels', () => {
  describe('yoy mode', () => {
    it('returns year-based labels', () => {
      const labels = comparisonLabels('yoy', 2025, 1, 31)
      expect(labels).toEqual({ curLabel: '2025年', prevLabel: '2024年' })
    })

    it('ignores day range in yoy mode', () => {
      const a = comparisonLabels('yoy', 2025, 1, 10)
      const b = comparisonLabels('yoy', 2025, 15, 20)
      expect(a).toEqual(b)
    })

    it('returns correct labels for different years', () => {
      expect(comparisonLabels('yoy', 2026, 1, 28)).toEqual({
        curLabel: '2026年', prevLabel: '2025年',
      })
      expect(comparisonLabels('yoy', 2024, 1, 31)).toEqual({
        curLabel: '2024年', prevLabel: '2023年',
      })
    })
  })

  describe('wow mode', () => {
    it('returns day-range labels for multi-day range', () => {
      const labels = comparisonLabels('wow', 2025, 15, 21)
      expect(labels).toEqual({ curLabel: '15-21日', prevLabel: '8-14日' })
    })

    it('returns single-day labels when start equals end', () => {
      const labels = comparisonLabels('wow', 2025, 23, 23)
      expect(labels).toEqual({ curLabel: '23日', prevLabel: '16日' })
    })

    it('returns correct shifted labels for boundary case', () => {
      const labels = comparisonLabels('wow', 2025, 8, 14)
      expect(labels).toEqual({ curLabel: '8-14日', prevLabel: '1-7日' })
    })

    it('ignores year parameter in wow mode labels', () => {
      const a = comparisonLabels('wow', 2024, 15, 21)
      const b = comparisonLabels('wow', 2025, 15, 21)
      expect(a).toEqual(b)
    })

    it('correctly formats even when prev range crosses zero (edge case)', () => {
      // When dayStart=5, prevStart=-2 — labels still computed correctly
      const labels = comparisonLabels('wow', 2025, 5, 7)
      expect(labels.curLabel).toBe('5-7日')
      expect(labels.prevLabel).toBe('-2-0日') // wowPrevRange.isValid=false, but labels still computed
    })
  })

  describe('mode consistency invariants', () => {
    it('wow range labels preserve width', () => {
      const labels = comparisonLabels('wow', 2025, 15, 22)
      // curLabel: "15-22日", prevLabel: "8-15日" — both 8-day ranges
      expect(labels.curLabel).toBe('15-22日')
      expect(labels.prevLabel).toBe('8-15日')
    })
  })
})
