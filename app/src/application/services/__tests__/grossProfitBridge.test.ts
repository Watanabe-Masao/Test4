/**
 * grossProfitBridge — public API smoke + passthrough tests
 *
 * 8 business-authoritative core 関数の TS fallback path を検証する。
 */
import { describe, it, expect } from 'vitest'
import {
  calculateCoreSales,
  calculateDiscountRate,
  calculateInventoryCost,
  calculateEstMethodWithStatus,
  calculateMarkupRates,
  calculateTransferTotals,
} from '../grossProfitBridge'

describe('calculateCoreSales', () => {
  it('コア売上 = 総売上 - 花売価 - 産直売価', () => {
    const r = calculateCoreSales(1000, 100, 50)
    expect(r.coreSales).toBe(850)
  })

  it('花/産直 0 ならコア売上 = 総売上', () => {
    const r = calculateCoreSales(1000, 0, 0)
    expect(r.coreSales).toBe(1000)
  })

  it('計算結果は isOverDelivery を含む', () => {
    const r = calculateCoreSales(1000, 100, 50)
    expect(r).toHaveProperty('isOverDelivery')
  })
})

describe('calculateDiscountRate', () => {
  // 引数順: (salesAmount, discountAmount)
  // 式: discountAmount / (salesAmount + discountAmount)
  it('売変率 = 売変額 / (売上 + 売変額)', () => {
    expect(calculateDiscountRate(900, 100)).toBeCloseTo(0.1, 5)
  })

  it('売上=0 + 売変=0 で 0（ゼロ除算ガード）', () => {
    expect(calculateDiscountRate(0, 0)).toBe(0)
  })

  it('売変=0 で 0', () => {
    expect(calculateDiscountRate(1000, 0)).toBe(0)
  })
})

describe('calculateInventoryCost', () => {
  it('在庫原価 = 総原価 - 売上納品原価', () => {
    expect(calculateInventoryCost(1000, 200)).toBe(800)
  })

  it('納品原価=0 で総原価がそのまま', () => {
    expect(calculateInventoryCost(1000, 0)).toBe(1000)
  })

  it('同値で 0', () => {
    expect(calculateInventoryCost(500, 500)).toBe(0)
  })
})

describe('calculateEstMethodWithStatus', () => {
  it('正常入力で CalculationResult 構造', () => {
    const r = calculateEstMethodWithStatus({
      coreSales: 1000,
      discountRate: 0.02,
      markupRate: 0.3,
      costInclusionCost: 10,
      openingInventory: 0,
      inventoryPurchaseCost: 700,
    })
    expect(r).toHaveProperty('value')
    expect(r).toHaveProperty('status')
  })

  it('warnings 属性を持つ', () => {
    const r = calculateEstMethodWithStatus({
      coreSales: 0,
      discountRate: 0,
      markupRate: 0,
      costInclusionCost: 0,
      openingInventory: 0,
      inventoryPurchaseCost: 0,
    })
    expect(r).toHaveProperty('warnings')
  })
})

describe('calculateMarkupRates', () => {
  it('値入率を返す', () => {
    const r = calculateMarkupRates({
      purchasePrice: 1000,
      purchaseCost: 700,
      deliveryPrice: 0,
      deliveryCost: 0,
      transferPrice: 0,
      transferCost: 0,
      defaultMarkupRate: 0.3,
    })
    expect(r).toHaveProperty('averageMarkupRate')
    expect(r).toHaveProperty('coreMarkupRate')
  })
})

describe('calculateTransferTotals', () => {
  it('移動原価・売価を合算', () => {
    const r = calculateTransferTotals({
      interStoreInPrice: 100,
      interStoreInCost: 70,
      interStoreOutPrice: 50,
      interStoreOutCost: 35,
      interDepartmentInPrice: 0,
      interDepartmentInCost: 0,
      interDepartmentOutPrice: 0,
      interDepartmentOutCost: 0,
    })
    expect(typeof r.transferCost).toBe('number')
    expect(typeof r.transferPrice).toBe('number')
  })
})
