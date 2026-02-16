import { describe, it, expect } from 'vitest'
import { calculateEstMethod, calculateCoreSales, calculateDiscountRate } from './estMethod'

describe('calculateEstMethod', () => {
  it('基本的な推定計算', () => {
    const result = calculateEstMethod({
      coreSales: 5_000_000,
      discountRate: 0.02,
      markupRate: 0.26,
      consumableCost: 50_000,
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
      consumableCost: 0,
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
      consumableCost: 0,
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
      consumableCost: 10_000,
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
      consumableCost: 0,
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
      consumableCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    // 推定原価 = 1,000,000 × 1.0 = 1,000,000
    expect(result.cogs).toBe(1_000_000)
    expect(result.margin).toBe(0)
    expect(result.marginRate).toBe(0)
  })

  it('値入率1の場合（原価=0+消耗品費）', () => {
    const result = calculateEstMethod({
      coreSales: 1_000_000,
      discountRate: 0,
      markupRate: 1.0,
      consumableCost: 20_000,
      openingInventory: null,
      inventoryPurchaseCost: 0,
    })
    // 推定原価 = 1,000,000 × 0 + 20,000 = 20,000
    expect(result.cogs).toBe(20_000)
    expect(result.margin).toBe(980_000)
  })

  it('消耗品費のみのケース', () => {
    const result = calculateEstMethod({
      coreSales: 2_000_000,
      discountRate: 0.03,
      markupRate: 0.26,
      consumableCost: 100_000,
      openingInventory: 1_000_000,
      inventoryPurchaseCost: 1_500_000,
    })
    // 消耗品費が推定原価に含まれることを確認
    expect(result.cogs).toBeGreaterThan(100_000)
    // 推定期末在庫が計算されることを確認
    expect(result.closingInventory).not.toBeNull()
  })

  it('高い売変率のケース', () => {
    const result = calculateEstMethod({
      coreSales: 3_000_000,
      discountRate: 0.1,
      markupRate: 0.26,
      consumableCost: 0,
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
      consumableCost: 0,
      openingInventory: null,
      inventoryPurchaseCost: 500_000,
    })
    expect(result.closingInventory).toBeNull()
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
