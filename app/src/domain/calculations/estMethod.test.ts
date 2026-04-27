/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  calculateEstMethod,
  calculateEstMethodWithStatus,
  calculateCoreSales,
  calculateDiscountRate,
} from './estMethod'

describe('calculateEstMethod', () => {
  it('基本的な推定計算', () => {
    const result = calculateEstMethod({
      coreSales: 5_000_000,
      discountRate: 0.02,
      markupRate: 0.26,
      costInclusionCost: 50_000,
      openingInventory: 1_000_000,
      inventoryPurchaseCost: 4_000_000,
    })
    // 粗売上   = 5,000,000 / (1 - 0.02) = 5,102,040.816...
    // 推定原価 = 5,102,040.816... × (1 - 0.26) + 50,000 = 3,825,510.204... ≈ 3,825,510.20
    // 推定マージン = 5,000,000 - 3,825,510.20... = 1,174,489.79...
    // 推定マージン率 = 1,174,489.79... / 5,000,000 ≈ 0.2349
    expect(result.grossSales).toBeCloseTo(5_102_040.816, 0)
    expect(result.cogs).toBeCloseTo(3_825_510.204, 0)
    expect(result.margin).toBeCloseTo(1_174_489.796, 0)
    expect(result.marginRate).toBeCloseTo(0.2349, 4)
  })

  it('売変率0の場合', () => {
    const result = calculateEstMethod({
      coreSales: 1_000_000,
      discountRate: 0,
      markupRate: 0.25,
      costInclusionCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    // 粗売上 = 1,000,000 / 1 = 1,000,000
    // 推定原価 = 1,000,000 × 0.75 = 750,000
    // 推定マージン = 1,000,000 - 750,000 = 250,000
    expect(result.grossSales).toBe(1_000_000)
    expect(result.cogs).toBe(750_000)
    expect(result.margin).toBe(250_000)
    expect(result.marginRate).toBe(0.25)
    expect(result.closingInventory).toBeNull()
  })

  it('推定期末在庫を計算', () => {
    const result = calculateEstMethod({
      coreSales: 1_000_000,
      discountRate: 0,
      markupRate: 0.25,
      costInclusionCost: 0,
      openingInventory: 500_000,
      inventoryPurchaseCost: 800_000,
    })
    // 推定原価 = 750,000
    // 推定期末在庫 = 500,000 + 800,000 - 750,000 = 550,000
    expect(result.closingInventory).toBe(550_000)
  })

  it('コア売上0の場合', () => {
    const result = calculateEstMethod({
      coreSales: 0,
      discountRate: 0,
      markupRate: 0.26,
      costInclusionCost: 10_000,
      openingInventory: 100_000,
      inventoryPurchaseCost: 50_000,
    })
    // 粗売上 = 0
    // 推定原価 = 0 + 10,000 = 10,000
    // 推定マージン = 0 - 10,000 = -10,000
    // 推定マージン率 = -10,000 / 0 → 0 (ゼロ除算)
    expect(result.grossSales).toBe(0)
    expect(result.cogs).toBe(10_000)
    expect(result.margin).toBe(-10_000)
    expect(result.marginRate).toBe(0)
    expect(result.closingInventory).toBe(140_000) // 100,000 + 50,000 - 10,000
  })

  it('売変率が1の場合（フォールバック）', () => {
    const result = calculateEstMethod({
      coreSales: 1_000_000,
      discountRate: 1.0,
      markupRate: 0.25,
      costInclusionCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    // 1 - 1.0 = 0 → フォールバック: 粗売上 = コア売上
    expect(result.grossSales).toBe(1_000_000)
  })

  it('値入率0の場合（原価=粗売上）', () => {
    const result = calculateEstMethod({
      coreSales: 1_000_000,
      discountRate: 0,
      markupRate: 0,
      costInclusionCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    // 推定原価 = 1,000,000 × 1.0 = 1,000,000
    expect(result.cogs).toBe(1_000_000)
    expect(result.margin).toBe(0)
    expect(result.marginRate).toBe(0)
  })

  it('値入率1の場合（原価=0+原価算入費）', () => {
    const result = calculateEstMethod({
      coreSales: 1_000_000,
      discountRate: 0,
      markupRate: 1.0,
      costInclusionCost: 20_000,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    // 推定原価 = 1,000,000 × 0 + 20,000 = 20,000
    expect(result.cogs).toBe(20_000)
    expect(result.margin).toBe(980_000)
  })

  it('原価算入費のみのケース', () => {
    const result = calculateEstMethod({
      coreSales: 2_000_000,
      discountRate: 0.03,
      markupRate: 0.26,
      costInclusionCost: 100_000,
      openingInventory: 1_000_000,
      inventoryPurchaseCost: 1_500_000,
    })
    // 原価算入費が推定原価に含まれることを確認
    expect(result.cogs).toBeGreaterThan(100_000)
    // 推定期末在庫が計算されることを確認
    expect(result.closingInventory).not.toBeNull()
  })

  it('高い売変率のケース', () => {
    const result = calculateEstMethod({
      coreSales: 3_000_000,
      discountRate: 0.1,
      markupRate: 0.26,
      costInclusionCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    // 粗売上 = 3,000,000 / 0.9 = 3,333,333.33...
    expect(result.grossSales).toBeCloseTo(3_333_333.33, 0)
  })

  it('openingInventoryがnullの場合のclosingInventory', () => {
    const result = calculateEstMethod({
      coreSales: 1_000_000,
      discountRate: 0,
      markupRate: 0.25,
      costInclusionCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 500_000,
    })
    expect(result.closingInventory).toBeNull()
  })
})

describe('calculateEstMethodWithStatus', () => {
  it('正常範囲 → ok', () => {
    const result = calculateEstMethodWithStatus({
      coreSales: 5_000_000,
      discountRate: 0.02,
      markupRate: 0.26,
      costInclusionCost: 50_000,
      openingInventory: 1_000_000,
      inventoryPurchaseCost: 4_000_000,
    })
    expect(result.status).toBe('ok')
    expect(result.value).not.toBeNull()
    expect(result.value!.grossSales).toBeCloseTo(5_102_040.816, 0)
    expect(result.warnings).toHaveLength(0)
  })

  it('売変率1.0 → invalid', () => {
    const result = calculateEstMethodWithStatus({
      coreSales: 1_000_000,
      discountRate: 1.0,
      markupRate: 0.25,
      costInclusionCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    expect(result.status).toBe('invalid')
    expect(result.value).toBeNull()
    expect(result.warnings).toContain('calc_discount_rate_out_of_domain')
  })

  it('売変率 < 0 → invalid', () => {
    const result = calculateEstMethodWithStatus({
      coreSales: 1_000_000,
      discountRate: -0.05,
      markupRate: 0.25,
      costInclusionCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    expect(result.status).toBe('invalid')
    expect(result.value).toBeNull()
    expect(result.warnings).toContain('calc_discount_rate_negative')
  })

  it('値入率 > 1 → ok with warning', () => {
    const result = calculateEstMethodWithStatus({
      coreSales: 1_000_000,
      discountRate: 0,
      markupRate: 1.5,
      costInclusionCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    // markupRate > 1 は invalid ではなく warning 付き ok
    expect(result.status).toBe('ok')
    expect(result.value).not.toBeNull()
    expect(result.warnings).toContain('calc_markup_rate_exceeds_one')
  })

  it('値入率 < 0 → ok with warning', () => {
    const result = calculateEstMethodWithStatus({
      coreSales: 1_000_000,
      discountRate: 0,
      markupRate: -0.1,
      costInclusionCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    expect(result.status).toBe('ok')
    expect(result.value).not.toBeNull()
    expect(result.warnings).toContain('calc_markup_rate_negative')
  })

  it('openingInventory null → closingInventory null in ok result', () => {
    const result = calculateEstMethodWithStatus({
      coreSales: 1_000_000,
      discountRate: 0,
      markupRate: 0.25,
      costInclusionCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 500_000,
    })
    expect(result.status).toBe('ok')
    expect(result.value!.closingInventory).toBeNull()
  })

  it('売変率0.99（有効だが高い） → ok', () => {
    const result = calculateEstMethodWithStatus({
      coreSales: 1_000_000,
      discountRate: 0.99,
      markupRate: 0.26,
      costInclusionCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    expect(result.status).toBe('ok')
    expect(result.value).not.toBeNull()
    // 粗売上 = 1,000,000 / 0.01 = 100,000,000
    expect(result.value!.grossSales).toBeCloseTo(100_000_000, 0)
  })
})

describe('calculateCoreSales', () => {
  it('正常なコア売上算出', () => {
    const result = calculateCoreSales(10_000_000, 500_000, 300_000)
    expect(result.coreSales).toBe(9_200_000)
    expect(result.isOverDelivery).toBe(false)
    expect(result.overDeliveryAmount).toBe(0)
  })

  it('花・産直がないケース', () => {
    const result = calculateCoreSales(5_000_000, 0, 0)
    expect(result.coreSales).toBe(5_000_000)
    expect(result.isOverDelivery).toBe(false)
  })

  it('売上納品が総売上を超過するケース', () => {
    const result = calculateCoreSales(1_000_000, 800_000, 500_000)
    // 1,000,000 - 800,000 - 500,000 = -300,000 → クランプ
    expect(result.coreSales).toBe(0)
    expect(result.isOverDelivery).toBe(true)
    expect(result.overDeliveryAmount).toBe(300_000)
  })

  it('売上0のケース', () => {
    const result = calculateCoreSales(0, 0, 0)
    expect(result.coreSales).toBe(0)
    expect(result.isOverDelivery).toBe(false)
  })

  it('花・産直がちょうど売上と同額', () => {
    const result = calculateCoreSales(1_000_000, 600_000, 400_000)
    expect(result.coreSales).toBe(0)
    expect(result.isOverDelivery).toBe(false)
  })
})

describe('calculateDiscountRate', () => {
  it('正常な売変率算出', () => {
    // 売変率 = 20,000 / (980,000 + 20,000) = 0.02
    expect(calculateDiscountRate(980_000, 20_000)).toBeCloseTo(0.02, 6)
  })

  it('売変額0の場合', () => {
    expect(calculateDiscountRate(1_000_000, 0)).toBe(0)
  })

  it('売上0・売変0の場合', () => {
    expect(calculateDiscountRate(0, 0)).toBe(0)
  })

  it('売上0・売変ありの場合', () => {
    // 分母 = 0 + 100 = 100
    expect(calculateDiscountRate(0, 100)).toBe(1) // 100/100
  })
})

/* ── calculateDiscountRate 不変条件 ── */

describe('calculateDiscountRate 不変条件', () => {
  /**
   * 売変率 = d / (s + d)  の数学的性質。
   * s = 売上（値引き後）, d = 売変額, s + d = 原売上（値引き前）。
   *
   * NOTE(pragmatic): 現在の実装は数学的に正しい定義だが、
   * シャープリー恒等式のような体系的な不変条件群を持たない。
   * ここで証明する性質は、実装が壊れた場合の検出用。
   */
  const scenarios = [
    { label: '標準2%', sales: 980_000, discount: 20_000 },
    { label: '高売変10%', sales: 900_000, discount: 100_000 },
    { label: '微小', sales: 999, discount: 1 },
    { label: '大規模', sales: 45_000_000, discount: 5_000_000 },
    { label: '等額', sales: 500_000, discount: 500_000 },
  ]

  // 不変条件 1: 再構成 — result × (s + d) = d
  for (const sc of scenarios) {
    it(`再構成: rate × (s + d) = d [${sc.label}]`, () => {
      const rate = calculateDiscountRate(sc.sales, sc.discount)
      const reconstructed = rate * (sc.sales + sc.discount)
      expect(reconstructed).toBeCloseTo(sc.discount, 5)
    })
  }

  // 不変条件 2: 値域 — 0 ≤ result ≤ 1  (s ≥ 0, d ≥ 0)
  for (const sc of scenarios) {
    it(`値域: 0 ≤ rate ≤ 1 [${sc.label}]`, () => {
      const rate = calculateDiscountRate(sc.sales, sc.discount)
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(1)
    })
  }

  // 不変条件 3: 相補性 — coreSalesRate + discountRate = 1
  // s/(s+d) + d/(s+d) = 1
  for (const sc of scenarios) {
    it(`相補性: salesRate + discountRate = 1 [${sc.label}]`, () => {
      const discountRate = calculateDiscountRate(sc.sales, sc.discount)
      const salesRate = sc.sales / (sc.sales + sc.discount)
      expect(salesRate + discountRate).toBeCloseTo(1, 10)
    })
  }

  // 不変条件 4: 単調性 — d₁ > d₂ ⇒ rate₁ > rate₂  (s 固定, s > 0)
  it('単調性: 売変額が大きいほど売変率が大きい', () => {
    const s = 1_000_000
    const r1 = calculateDiscountRate(s, 10_000)
    const r2 = calculateDiscountRate(s, 50_000)
    const r3 = calculateDiscountRate(s, 200_000)
    expect(r1).toBeLessThan(r2)
    expect(r2).toBeLessThan(r3)
  })

  // 不変条件 5: ゼロ安全性
  it('ゼロ安全性: both=0 は 0（発散しない）', () => {
    expect(calculateDiscountRate(0, 0)).toBe(0)
  })
})
