import { describe, it, expect } from 'vitest'
import { calculateDiscountImpact, calculateDiscountImpactWithStatus } from './discountImpact'

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
    expect(result.discountLossCost).toBeCloseTo(75_510.2, 0)
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

describe('calculateDiscountImpactWithStatus', () => {
  it('正常範囲の売変率 → ok', () => {
    const result = calculateDiscountImpactWithStatus({
      coreSales: 5_000_000,
      markupRate: 0.26,
      discountRate: 0.02,
    })
    expect(result.status).toBe('ok')
    expect(result.value).not.toBeNull()
    expect(result.value!.discountLossCost).toBeCloseTo(75_510.2, 0)
    expect(result.warnings).toHaveLength(0)
  })

  it('売変率0 → ok（ロスも0）', () => {
    const result = calculateDiscountImpactWithStatus({
      coreSales: 5_000_000,
      markupRate: 0.26,
      discountRate: 0,
    })
    expect(result.status).toBe('ok')
    expect(result.value!.discountLossCost).toBe(0)
  })

  it('売変率1.0 → invalid', () => {
    const result = calculateDiscountImpactWithStatus({
      coreSales: 1_000_000,
      markupRate: 0.26,
      discountRate: 1.0,
    })
    expect(result.status).toBe('invalid')
    expect(result.value).toBeNull()
    expect(result.warnings).toContain('discount_rate_out_of_domain')
  })

  it('売変率 > 1 → invalid', () => {
    const result = calculateDiscountImpactWithStatus({
      coreSales: 1_000_000,
      markupRate: 0.26,
      discountRate: 1.5,
    })
    expect(result.status).toBe('invalid')
    expect(result.value).toBeNull()
    expect(result.warnings).toContain('discount_rate_out_of_domain')
  })

  it('売変率 < 0 → invalid', () => {
    const result = calculateDiscountImpactWithStatus({
      coreSales: 1_000_000,
      markupRate: 0.26,
      discountRate: -0.1,
    })
    expect(result.status).toBe('invalid')
    expect(result.value).toBeNull()
    expect(result.warnings).toContain('discount_rate_negative')
  })

  it('売変率0.99（1に近いが有効） → ok', () => {
    const result = calculateDiscountImpactWithStatus({
      coreSales: 1_000_000,
      markupRate: 0.26,
      discountRate: 0.99,
    })
    expect(result.status).toBe('ok')
    expect(result.value).not.toBeNull()
    // (1 - 0.26) × 1,000,000 × 0.99 / 0.01 = 73,260,000
    expect(result.value!.discountLossCost).toBeCloseTo(73_260_000, 0)
  })
})
