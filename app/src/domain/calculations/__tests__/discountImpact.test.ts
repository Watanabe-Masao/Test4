/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { calculateDiscountImpactWithStatus, calculateDiscountImpact } from '../discountImpact'

describe('calculateDiscountImpactWithStatus', () => {
  it('正常: 売変ロス原価を計算', () => {
    const result = calculateDiscountImpactWithStatus({
      coreSales: 1000000,
      markupRate: 0.25,
      discountRate: 0.02,
    })
    expect(result.status).toBe('ok')
    expect(result.value!.discountLossCost).toBeGreaterThan(0)
  })

  it('売変率 0 → ロス原価 0', () => {
    const result = calculateDiscountImpactWithStatus({
      coreSales: 1000000,
      markupRate: 0.25,
      discountRate: 0,
    })
    expect(result.value!.discountLossCost).toBe(0)
  })

  it('売変率 >= 1 → invalid', () => {
    const result = calculateDiscountImpactWithStatus({
      coreSales: 1000000,
      markupRate: 0.25,
      discountRate: 1.0,
    })
    expect(result.status).toBe('invalid')
  })

  it('売変率 < 0 → invalid', () => {
    const result = calculateDiscountImpactWithStatus({
      coreSales: 1000000,
      markupRate: 0.25,
      discountRate: -0.1,
    })
    expect(result.status).toBe('invalid')
  })

  it('値入率 1.0 → ロス原価 0（原価ゼロ）', () => {
    const result = calculateDiscountImpactWithStatus({
      coreSales: 1000000,
      markupRate: 1.0,
      discountRate: 0.02,
    })
    expect(result.value!.discountLossCost).toBe(0)
  })
})

describe('calculateDiscountImpact (後方互換)', () => {
  it('invalid でもクラッシュしない', () => {
    const result = calculateDiscountImpact({
      coreSales: 1000000,
      markupRate: 0.25,
      discountRate: 1.0,
    })
    expect(Number.isFinite(result.discountLossCost)).toBe(true)
  })
})
