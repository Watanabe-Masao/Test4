import { describe, it, expect } from 'vitest'
import { stddevPop, zScore, coefficientOfVariation } from './statisticalFunctions'

describe('stddevPop', () => {
  it('returns 0 for empty array', () => {
    expect(stddevPop([])).toBe(0)
  })

  it('returns 0 for constant series', () => {
    expect(stddevPop([5, 5, 5, 5])).toBe(0)
  })

  it('computes population standard deviation for [1,2,3,4,5]', () => {
    // mean=3, variance=((4)+(1)+(0)+(1)+(4))/5 = 2, stddev=sqrt(2)
    expect(stddevPop([1, 2, 3, 4, 5])).toBeCloseTo(Math.sqrt(2), 10)
  })

  it('handles single element', () => {
    expect(stddevPop([42])).toBe(0)
  })

  it('handles two equal values', () => {
    expect(stddevPop([10, 10])).toBe(0)
  })

  it('computes correct value for two differing values', () => {
    // mean=5, variance=((5-0)^2+(5-10)^2)/2 = 25, stddev=5
    expect(stddevPop([0, 10])).toBe(5)
  })
})

describe('zScore', () => {
  it('returns 0 when stddev is 0', () => {
    expect(zScore(5, 5, 0)).toBe(0)
    expect(zScore(10, 5, 0)).toBe(0)
  })

  it('returns 0 at the mean', () => {
    expect(zScore(5, 5, 2)).toBe(0)
  })

  it('returns positive z-score above mean', () => {
    expect(zScore(10, 5, 2.5)).toBe(2)
  })

  it('returns negative z-score below mean', () => {
    expect(zScore(0, 5, 2.5)).toBe(-2)
  })

  it('handles fractional deviations', () => {
    expect(zScore(7.5, 5, 2.5)).toBe(1)
  })
})

describe('coefficientOfVariation', () => {
  it('returns 0 for empty array', () => {
    expect(coefficientOfVariation([])).toBe(0)
  })

  it('returns 0 for constant series (stddev=0)', () => {
    expect(coefficientOfVariation([5, 5, 5])).toBe(0)
  })

  it('returns 0 when mean is 0', () => {
    // mean=0, safeDivide → 0
    expect(coefficientOfVariation([-5, 5])).toBe(0)
  })

  it('computes stddev / mean ratio', () => {
    // [1,2,3,4,5]: mean=3, stddev=sqrt(2) → CV = sqrt(2)/3
    expect(coefficientOfVariation([1, 2, 3, 4, 5])).toBeCloseTo(Math.sqrt(2) / 3, 10)
  })

  it('returns positive value for positive series', () => {
    expect(coefficientOfVariation([10, 20, 30])).toBeGreaterThan(0)
  })
})
