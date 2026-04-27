/**
 * estMethod.ts — 推定法計算の単体テスト
 *
 * 粗売上・推定原価・推定マージン・推定期末在庫の計算を検証。
 * 金銭計算のため境界値を重点的にテスト。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  calculateEstMethodWithStatus,
  calculateEstMethod,
  calculateCoreSales,
  calculateDiscountRate,
  type EstMethodInput,
} from '../estMethod'

const BASE_INPUT: EstMethodInput = {
  coreSales: 1000000,
  discountRate: 0.02,
  markupRate: 0.25,
  costInclusionCost: 5000,
  openingInventory: 500000,
  inventoryPurchaseCost: 800000,
}

describe('calculateEstMethodWithStatus', () => {
  it('正常ケース: 粗売上 = コア売上 / (1 - 売変率)', () => {
    const { value, status } = calculateEstMethodWithStatus(BASE_INPUT)
    expect(status).toBe('ok')
    expect(value).not.toBeNull()
    // grossSales = 1000000 / (1 - 0.02) ≈ 1020408
    expect(value!.grossSales).toBeCloseTo(1020408, -1)
  })

  it('推定原価 = 粗売上 × (1 - 値入率) + 原価算入費', () => {
    const { value } = calculateEstMethodWithStatus(BASE_INPUT)
    const expectedCogs = value!.grossSales * (1 - 0.25) + 5000
    expect(value!.cogs).toBeCloseTo(expectedCogs, 0)
  })

  it('推定マージン = コア売上 - 推定原価', () => {
    const { value } = calculateEstMethodWithStatus(BASE_INPUT)
    expect(value!.margin).toBeCloseTo(BASE_INPUT.coreSales - value!.cogs, 0)
  })

  it('推定期末在庫 = 期首在庫 + 仕入原価 - 推定原価', () => {
    const { value } = calculateEstMethodWithStatus(BASE_INPUT)
    expect(value!.closingInventory).toBeCloseTo(500000 + 800000 - value!.cogs, 0)
  })

  it('期首在庫 null → 推定期末在庫 null', () => {
    const input = { ...BASE_INPUT, openingInventory: null }
    const { value } = calculateEstMethodWithStatus(input)
    expect(value!.closingInventory).toBeNull()
  })

  it('売変率 >= 1 → invalid', () => {
    const input = { ...BASE_INPUT, discountRate: 1.0 }
    const result = calculateEstMethodWithStatus(input)
    expect(result.status).toBe('invalid')
    expect(result.value).toBeNull()
  })

  it('売変率 < 0 → invalid', () => {
    const input = { ...BASE_INPUT, discountRate: -0.1 }
    const result = calculateEstMethodWithStatus(input)
    expect(result.status).toBe('invalid')
  })

  it('値入率 > 1 → ok with warnings', () => {
    const input = { ...BASE_INPUT, markupRate: 1.1 }
    const result = calculateEstMethodWithStatus(input)
    expect(result.status).toBe('ok')
    expect(result.warnings).toContain('calc_markup_rate_exceeds_one')
  })

  it('売変率 0 → 粗売上 = コア売上', () => {
    const input = { ...BASE_INPUT, discountRate: 0 }
    const { value } = calculateEstMethodWithStatus(input)
    expect(value!.grossSales).toBe(1000000)
  })
})

describe('calculateEstMethod (後方互換)', () => {
  it('正常ケースで calculateEstMethodWithStatus と同じ結果', () => {
    const withStatus = calculateEstMethodWithStatus(BASE_INPUT).value!
    const legacy = calculateEstMethod(BASE_INPUT)
    expect(legacy.grossSales).toBeCloseTo(withStatus.grossSales)
    expect(legacy.cogs).toBeCloseTo(withStatus.cogs)
    expect(legacy.margin).toBeCloseTo(withStatus.margin)
  })

  it('invalid ケースでもクラッシュしない（フォールバック）', () => {
    const input = { ...BASE_INPUT, discountRate: 1.0 }
    const result = calculateEstMethod(input)
    expect(Number.isFinite(result.grossSales)).toBe(true)
  })
})

describe('calculateCoreSales', () => {
  it('コア売上 = 総売上 - 花 - 産直', () => {
    const { coreSales } = calculateCoreSales(1000000, 50000, 30000)
    expect(coreSales).toBe(920000)
  })

  it('花+産直 > 総売上 → コア売上 0 + 過剰納品フラグ', () => {
    const result = calculateCoreSales(100000, 60000, 50000)
    expect(result.coreSales).toBe(0)
    expect(result.isOverDelivery).toBe(true)
    expect(result.overDeliveryAmount).toBe(10000)
  })

  it('花=0, 産直=0 → コア売上 = 総売上', () => {
    const { coreSales } = calculateCoreSales(500000, 0, 0)
    expect(coreSales).toBe(500000)
  })
})

describe('calculateDiscountRate', () => {
  it('売変率 = 売変額 / (売上 + 売変額)', () => {
    expect(calculateDiscountRate(980000, 20000)).toBeCloseTo(0.02, 4)
  })

  it('売変額 0 → 0', () => {
    expect(calculateDiscountRate(1000000, 0)).toBe(0)
  })

  it('売上+売変=0 → 0', () => {
    expect(calculateDiscountRate(0, 0)).toBe(0)
  })
})
