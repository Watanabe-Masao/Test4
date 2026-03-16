import { describe, it, expect } from 'vitest'
import { comparePeriods, hasReferenceData, compareYoY, hasYoYData } from '../yoyComparison'

describe('comparePeriods 不変条件', () => {
  const cases = [
    { current: 1200, reference: 1000 },
    { current: 800, reference: 1000 },
    { current: 1000, reference: 1000 },
    { current: 0, reference: 1000 },
    { current: 1000, reference: 0 },
    { current: 0, reference: 0 },
    { current: 500000, reference: 450000 },
    { current: 123, reference: 456 },
  ]

  it.each(cases)(
    'difference === current - reference (cur=$current, ref=$reference)',
    ({ current, reference }) => {
      const result = comparePeriods(current, reference)
      expect(result.difference).toBe(current - reference)
    },
  )

  it.each(cases.filter((c) => c.reference !== 0))(
    'ratio === current / reference when reference≠0 (cur=$current, ref=$reference)',
    ({ current, reference }) => {
      const result = comparePeriods(current, reference)
      expect(result.ratio).toBeCloseTo(current / reference)
    },
  )

  it.each(cases.filter((c) => c.reference !== 0))(
    'growthRate === ratio - 1 when reference≠0 (cur=$current, ref=$reference)',
    ({ current, reference }) => {
      const result = comparePeriods(current, reference)
      expect(result.growthRate).toBeCloseTo(result.ratio - 1)
    },
  )

  it('reference=0 の場合 ratio と growthRate は 0', () => {
    const result = comparePeriods(1000, 0)
    expect(result.ratio).toBe(0)
    expect(result.growthRate).toBe(0)
  })

  it('hasReferenceData は reference≠0 の場合 true', () => {
    expect(hasReferenceData(comparePeriods(1000, 500))).toBe(true)
    expect(hasReferenceData(comparePeriods(1000, 0))).toBe(false)
  })
})

describe('YoY 互換エイリアス', () => {
  it('compareYoY は comparePeriods と同じ結果を返す', () => {
    const yoy = compareYoY(1200, 1000)
    const period = comparePeriods(1200, 1000)
    expect(yoy).toEqual(period)
  })

  it('hasYoYData は hasReferenceData と同じ結果を返す', () => {
    const comparison = comparePeriods(1000, 500)
    expect(hasYoYData(comparison)).toBe(hasReferenceData(comparison))
  })
})
