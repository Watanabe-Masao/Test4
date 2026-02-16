import { describe, it, expect } from 'vitest'
import { calculateInvMethod } from './invMethod'

describe('calculateInvMethod', () => {
  it('基本的な粗利計算', () => {
    const result = calculateInvMethod({
      openingInventory: 1_000_000,
      closingInventory: 800_000,
      totalPurchaseCost: 5_000_000,
      totalSales: 7_000_000,
    })
    // 売上原価 = 1,000,000 + 5,000,000 - 800,000 = 5,200,000
    // 粗利益   = 7,000,000 - 5,200,000 = 1,800,000
    // 粗利率   = 1,800,000 / 7,000,000 ≈ 0.2571
    expect(result.cogs).toBe(5_200_000)
    expect(result.grossProfit).toBe(1_800_000)
    expect(result.grossProfitRate).toBeCloseTo(0.2571, 4)
  })

  it('期首在庫がnullの場合は計算不可', () => {
    const result = calculateInvMethod({
      openingInventory: null,
      closingInventory: 800_000,
      totalPurchaseCost: 5_000_000,
      totalSales: 7_000_000,
    })
    expect(result.cogs).toBeNull()
    expect(result.grossProfit).toBeNull()
    expect(result.grossProfitRate).toBeNull()
  })

  it('期末在庫がnullの場合は計算不可', () => {
    const result = calculateInvMethod({
      openingInventory: 1_000_000,
      closingInventory: null,
      totalPurchaseCost: 5_000_000,
      totalSales: 7_000_000,
    })
    expect(result.cogs).toBeNull()
    expect(result.grossProfit).toBeNull()
    expect(result.grossProfitRate).toBeNull()
  })

  it('両方nullの場合は計算不可', () => {
    const result = calculateInvMethod({
      openingInventory: null,
      closingInventory: null,
      totalPurchaseCost: 5_000_000,
      totalSales: 7_000_000,
    })
    expect(result.cogs).toBeNull()
  })

  it('売上が0の場合、粗利率は0', () => {
    const result = calculateInvMethod({
      openingInventory: 1_000_000,
      closingInventory: 800_000,
      totalPurchaseCost: 0,
      totalSales: 0,
    })
    // 売上原価 = 1,000,000 + 0 - 800,000 = 200,000
    // 粗利益   = 0 - 200,000 = -200,000
    // 粗利率   = -200,000 / 0 → 0 (ゼロ除算ガード)
    expect(result.cogs).toBe(200_000)
    expect(result.grossProfit).toBe(-200_000)
    expect(result.grossProfitRate).toBe(0)
  })

  it('粗利がマイナスになるケース', () => {
    const result = calculateInvMethod({
      openingInventory: 1_000_000,
      closingInventory: 500_000,
      totalPurchaseCost: 6_000_000,
      totalSales: 5_000_000,
    })
    // 売上原価 = 1,000,000 + 6,000,000 - 500,000 = 6,500,000
    // 粗利益   = 5,000,000 - 6,500,000 = -1,500,000
    expect(result.cogs).toBe(6_500_000)
    expect(result.grossProfit).toBe(-1_500_000)
    expect(result.grossProfitRate).toBe(-0.3)
  })

  it('在庫増加（仕入 > 売上）のケース', () => {
    const result = calculateInvMethod({
      openingInventory: 1_000_000,
      closingInventory: 3_000_000,
      totalPurchaseCost: 5_000_000,
      totalSales: 4_000_000,
    })
    // 売上原価 = 1,000,000 + 5,000,000 - 3,000,000 = 3,000,000
    // 粗利益   = 4,000,000 - 3,000,000 = 1,000,000
    expect(result.cogs).toBe(3_000_000)
    expect(result.grossProfit).toBe(1_000_000)
    expect(result.grossProfitRate).toBe(0.25)
  })

  it('期首在庫0・期末在庫0のケース', () => {
    const result = calculateInvMethod({
      openingInventory: 0,
      closingInventory: 0,
      totalPurchaseCost: 3_000_000,
      totalSales: 4_000_000,
    })
    // 売上原価 = 0 + 3,000,000 - 0 = 3,000,000
    // 粗利益   = 4,000,000 - 3,000,000 = 1,000,000
    expect(result.cogs).toBe(3_000_000)
    expect(result.grossProfit).toBe(1_000_000)
    expect(result.grossProfitRate).toBe(0.25)
  })

  it('全ての値が0のケース', () => {
    const result = calculateInvMethod({
      openingInventory: 0,
      closingInventory: 0,
      totalPurchaseCost: 0,
      totalSales: 0,
    })
    expect(result.cogs).toBe(0)
    expect(result.grossProfit).toBe(0)
    expect(result.grossProfitRate).toBe(0)
  })

  it('小数点精度の確認', () => {
    const result = calculateInvMethod({
      openingInventory: 100,
      closingInventory: 70,
      totalPurchaseCost: 300,
      totalSales: 400,
    })
    // 売上原価 = 100 + 300 - 70 = 330
    // 粗利益   = 400 - 330 = 70
    // 粗利率   = 70 / 400 = 0.175
    expect(result.cogs).toBe(330)
    expect(result.grossProfit).toBe(70)
    expect(result.grossProfitRate).toBe(0.175)
  })

  it('負の在庫値を許容', () => {
    const result = calculateInvMethod({
      openingInventory: -100_000,
      closingInventory: 200_000,
      totalPurchaseCost: 1_000_000,
      totalSales: 500_000,
    })
    // 売上原価 = -100,000 + 1,000,000 - 200,000 = 700,000
    // 粗利益   = 500,000 - 700,000 = -200,000
    expect(result.cogs).toBe(700_000)
    expect(result.grossProfit).toBe(-200_000)
  })
})
