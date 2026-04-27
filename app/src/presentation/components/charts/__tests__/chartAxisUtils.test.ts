/**
 * chartAxisUtils — niceAxisMax tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { niceAxisMax } from '../chartAxisUtils'

describe('niceAxisMax', () => {
  it('0 以下で fallback 100', () => {
    expect(niceAxisMax(0)).toBe(100)
    expect(niceAxisMax(-5)).toBe(100)
  })

  it('最大値 1234 → 2100 （mag=1000, ceil*1.05）', () => {
    expect(niceAxisMax(1234)).toBe(2100)
  })

  it('最大値 47 → 52.5 （mag=10, ceil(47/10)=5, 5*10*1.05=52.5）', () => {
    expect(niceAxisMax(47)).toBeCloseTo(52.5, 5)
  })

  it('最大値 1000000 → 1_050_000（mag=1000000, ceil=1, 1*1e6*1.05）', () => {
    expect(niceAxisMax(1000000)).toBeCloseTo(1050000, 0)
  })

  it('padding カスタム指定', () => {
    expect(niceAxisMax(100, 1.1)).toBeCloseTo(110, 5)
  })

  it('小数値 0.5 → mag=1（10^0）, ceil=1, 1*1*1.05=1.05 … ではなく mag=0.1 扱いなので注意', () => {
    // Math.log10(0.5) = -0.301, floor = -1, mag = 0.1
    // ceil(0.5/0.1) = 5, 5 * 0.1 * 1.05 = 0.525
    expect(niceAxisMax(0.5)).toBeCloseTo(0.525, 5)
  })

  it('結果は元の値以上（padding=1.0 の場合でも ceiling）', () => {
    expect(niceAxisMax(123, 1.0)).toBeGreaterThanOrEqual(123)
    expect(niceAxisMax(999, 1.0)).toBeGreaterThanOrEqual(999)
  })
})
