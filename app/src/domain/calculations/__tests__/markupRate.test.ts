import { describe, it, expect } from 'vitest'
import { calculateMarkupRates, type MarkupRateInput } from '../markupRate'

describe('calculateMarkupRates', () => {
  it('全仕入ゼロ → averageMarkupRate=0, coreMarkupRate=defaultMarkupRate', () => {
    const input: MarkupRateInput = {
      purchasePrice: 0,
      purchaseCost: 0,
      deliveryPrice: 0,
      deliveryCost: 0,
      transferPrice: 0,
      transferCost: 0,
      defaultMarkupRate: 0.25,
    }
    const result = calculateMarkupRates(input)
    expect(result.averageMarkupRate).toBe(0)
    expect(result.coreMarkupRate).toBe(0.25)
  })

  it('仕入のみ（売上納品・移動なし）→ average = core', () => {
    const input: MarkupRateInput = {
      purchasePrice: 1000,
      purchaseCost: 700,
      deliveryPrice: 0,
      deliveryCost: 0,
      transferPrice: 0,
      transferCost: 0,
      defaultMarkupRate: 0,
    }
    const result = calculateMarkupRates(input)
    // (1000 - 700) / 1000 = 0.3
    expect(result.averageMarkupRate).toBeCloseTo(0.3)
    expect(result.coreMarkupRate).toBeCloseTo(0.3)
  })

  it('売上納品あり → average はすべて含む、core は仕入+移動のみ', () => {
    const input: MarkupRateInput = {
      purchasePrice: 1000,
      purchaseCost: 700,
      deliveryPrice: 500,
      deliveryCost: 400,
      transferPrice: 0,
      transferCost: 0,
      defaultMarkupRate: 0,
    }
    const result = calculateMarkupRates(input)
    // average: (1500 - 1100) / 1500 = 400/1500 ≈ 0.2667
    expect(result.averageMarkupRate).toBeCloseTo(400 / 1500)
    // core: (1000 - 700) / 1000 = 0.3
    expect(result.coreMarkupRate).toBeCloseTo(0.3)
  })

  it('移動あり → average と core の両方に移動が含まれる', () => {
    const input: MarkupRateInput = {
      purchasePrice: 1000,
      purchaseCost: 700,
      deliveryPrice: 0,
      deliveryCost: 0,
      transferPrice: 200,
      transferCost: 150,
      defaultMarkupRate: 0,
    }
    const result = calculateMarkupRates(input)
    // average: (1200 - 850) / 1200 = 350/1200 ≈ 0.2917
    expect(result.averageMarkupRate).toBeCloseTo(350 / 1200)
    // core: (1200 - 850) / 1200 = 350/1200 ≈ 0.2917
    expect(result.coreMarkupRate).toBeCloseTo(350 / 1200)
  })

  it('全カテゴリ混在 → 正しく分離計算される', () => {
    const input: MarkupRateInput = {
      purchasePrice: 10000,
      purchaseCost: 7000,
      deliveryPrice: 3000,
      deliveryCost: 2400,
      transferPrice: 1000,
      transferCost: 800,
      defaultMarkupRate: 0.2,
    }
    const result = calculateMarkupRates(input)
    // average: allPrice=14000, allCost=10200, (14000-10200)/14000 = 3800/14000
    expect(result.averageMarkupRate).toBeCloseTo(3800 / 14000)
    // core: corePrice=11000, coreCost=7800, (11000-7800)/11000 = 3200/11000
    expect(result.coreMarkupRate).toBeCloseTo(3200 / 11000)
  })

  it('不変条件: averageMarkupRate は 0 以上 1 未満（正常データ）', () => {
    const input: MarkupRateInput = {
      purchasePrice: 5000,
      purchaseCost: 3000,
      deliveryPrice: 2000,
      deliveryCost: 1500,
      transferPrice: 500,
      transferCost: 400,
      defaultMarkupRate: 0,
    }
    const result = calculateMarkupRates(input)
    expect(result.averageMarkupRate).toBeGreaterThanOrEqual(0)
    expect(result.averageMarkupRate).toBeLessThan(1)
    expect(result.coreMarkupRate).toBeGreaterThanOrEqual(0)
    expect(result.coreMarkupRate).toBeLessThan(1)
  })

  it('storeAssembler 互換: 同じ入力で同じ結果', () => {
    // storeAssembler の calculateMarkupRates が受けていた値を再現
    const totalPurchasePrice = 8000
    const totalPurchaseCost = 5600
    const totalFlowerPrice = 2000
    const totalFlowerCost = 1600
    const totalDirectProducePrice = 1000
    const totalDirectProduceCost = 800
    const transferPrice = 500
    const transferCost = 400
    const defaultMarkupRate = 0.25

    // 旧実装の計算パス
    const allPurchasePrice =
      totalPurchasePrice + totalFlowerPrice + totalDirectProducePrice + transferPrice
    const allPurchaseCost =
      totalPurchaseCost + totalFlowerCost + totalDirectProduceCost + transferCost
    const oldAverage = (allPurchasePrice - allPurchaseCost) / allPurchasePrice
    const corePurchasePrice = totalPurchasePrice + transferPrice
    const corePurchaseCost = totalPurchaseCost + transferCost
    const oldCore = (corePurchasePrice - corePurchaseCost) / corePurchasePrice

    // 新実装
    const result = calculateMarkupRates({
      purchasePrice: totalPurchasePrice,
      purchaseCost: totalPurchaseCost,
      deliveryPrice: totalFlowerPrice + totalDirectProducePrice,
      deliveryCost: totalFlowerCost + totalDirectProduceCost,
      transferPrice,
      transferCost,
      defaultMarkupRate,
    })

    expect(result.averageMarkupRate).toBeCloseTo(oldAverage, 10)
    expect(result.coreMarkupRate).toBeCloseTo(oldCore, 10)
  })
})
