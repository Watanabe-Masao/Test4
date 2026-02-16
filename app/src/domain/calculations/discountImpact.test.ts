import { describe, it, expect } from 'vitest'
import { calculateDiscountImpact } from './discountImpact'

describe('calculateDiscountImpact', () => {
  it('基本的な売変ロス原価計算', () => {
    const result = calculateDiscountImpact({
      coreSales: 5_000_000,
      markupRate: 0.26,
      discountRate: 0.02,
    })
    // 売変ロス原価 = (1 - 0.26) × 5,000,000 × 0.02 / (1 - 0.02)
    //             = 0.74 × 5,000,000 × 0.02 / 0.98
    //             = 74,000 / 0.98
    //             ≈ 75,510.20
    expect(result.discountLossCost).toBeCloseTo(75_510.20, 0)
  })

  it('売変率0の場合、ロスも0', () => {
    const result = calculateDiscountImpact({
      coreSales: 5_000_000,
      markupRate: 0.26,
      discountRate: 0,
    })
    expect(result.discountLossCost).toBe(0)
  })

  it('値入率0の場合', () => {
    const result = calculateDiscountImpact({
      coreSales: 1_000_000,
      markupRate: 0,
      discountRate: 0.05,
    })
    // (1 - 0) × 1,000,000 × 0.05 / 0.95 ≈ 52,631.58
    expect(result.discountLossCost).toBeCloseTo(52_631.58, 0)
  })

  it('コア売上0の場合', () => {
    const result = calculateDiscountImpact({
      coreSales: 0,
      markupRate: 0.26,
      discountRate: 0.05,
    })
    expect(result.discountLossCost).toBe(0)
  })

  it('売変率1の場合（フォールバック）', () => {
    const result = calculateDiscountImpact({
      coreSales: 1_000_000,
      markupRate: 0.26,
      discountRate: 1.0,
    })
    // 1 - 1.0 = 0 → フォールバック divisor=1
    // (1 - 0.26) × 1,000,000 × 1.0 / 1 = 740,000
    expect(result.discountLossCost).toBeCloseTo(740_000, 0)
  })

  it('高い売変率のケース', () => {
    const result = calculateDiscountImpact({
      coreSales: 10_000_000,
      markupRate: 0.25,
      discountRate: 0.1,
    })
    // (1 - 0.25) × 10,000,000 × 0.1 / 0.9
    // = 0.75 × 10,000,000 × 0.1111...
    // = 833,333.33...
    expect(result.discountLossCost).toBeCloseTo(833_333.33, 0)
  })
})
