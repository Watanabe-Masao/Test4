/**
 * calculateGrossProfit — 計算正本テスト
 *
 * 4種の粗利 × フォールバック × Zod 検証を検証。
 */
import { describe, it, expect } from 'vitest'
import { calculateGrossProfit, calculateGrossProfitWithFallback } from './calculateGrossProfit'
import { GrossProfitReadModel } from './GrossProfitTypes'

describe('calculateGrossProfit', () => {
  // ── 在庫法 ──

  describe('在庫法・原価算入費前', () => {
    it('正常計算: 粗利 = 売上 - COGS', () => {
      const result = calculateGrossProfit({
        sales: 10_000_000,
        purchaseCost: 7_000_000,
        openingInventory: 3_000_000,
        closingInventory: 2_500_000,
        method: 'inventory',
        inclusionMode: 'before_cost_inclusion',
      })
      // COGS = 3,000,000 + 7,000,000 - 2,500,000 = 7,500,000
      // GP = 10,000,000 - 7,500,000 = 2,500,000
      expect(result.grossProfit).toBe(2_500_000)
      expect(result.grossProfitRate).toBeCloseTo(0.25, 4)
      expect(result.method).toBe('inventory')
      expect(result.inclusionMode).toBe('before_cost_inclusion')
      expect(result.meta.inclusionApplied).toBe(false)
      expect(result.meta.usedFallback).toBe(false)
    })

    it('在庫データなし → ゼロ', () => {
      const result = calculateGrossProfit({
        sales: 10_000_000,
        purchaseCost: 7_000_000,
        method: 'inventory',
        inclusionMode: 'before_cost_inclusion',
      })
      expect(result.grossProfit).toBe(0)
      expect(result.grossProfitRate).toBe(0)
    })
  })

  describe('在庫法・原価算入費後', () => {
    it('粗利から原価算入費を事後控除', () => {
      const result = calculateGrossProfit({
        sales: 10_000_000,
        purchaseCost: 7_000_000,
        openingInventory: 3_000_000,
        closingInventory: 2_500_000,
        costInclusion: 100_000,
        method: 'inventory',
        inclusionMode: 'after_cost_inclusion',
      })
      // GP before = 2,500,000
      // GP after = 2,500,000 - 100,000 = 2,400,000
      expect(result.grossProfit).toBe(2_400_000)
      expect(result.grossProfitRate).toBeCloseTo(0.24, 4)
      expect(result.meta.inclusionApplied).toBe(true)
    })
  })

  // ── 推定法 ──

  describe('推定法', () => {
    it('推定原価 = 粗売上 × (1 - 値入率) + 原価算入費', () => {
      const result = calculateGrossProfit({
        sales: 5_000_000, // コア売上
        purchaseCost: 4_000_000, // 期中仕入原価
        costInclusion: 50_000,
        method: 'estimated',
        inclusionMode: 'before_cost_inclusion',
        discountRate: 0.02,
        markupRate: 0.26,
      })
      // 粗売上 = 5,000,000 / (1 - 0.02) ≈ 5,102,041
      // 推定原価 = 5,102,041 × (1 - 0.26) + 50,000 ≈ 3,825,510
      // 推定マージン = 5,000,000 - 3,825,510 ≈ 1,174,490
      expect(result.grossProfit).toBeCloseTo(1_174_490, -2)
      expect(result.method).toBe('estimated')
      // 推定法は COGS に原価算入費が内包済み
      expect(result.meta.inclusionApplied).toBe(true)
    })

    it('before と after は同値（追加控除不要）', () => {
      const input = {
        sales: 5_000_000,
        purchaseCost: 4_000_000,
        costInclusion: 50_000,
        method: 'estimated' as const,
        discountRate: 0.02,
        markupRate: 0.26,
      }
      const before = calculateGrossProfit({ ...input, inclusionMode: 'before_cost_inclusion' })
      const after = calculateGrossProfit({ ...input, inclusionMode: 'after_cost_inclusion' })
      expect(before.grossProfit).toBe(after.grossProfit)
      expect(before.grossProfitRate).toBe(after.grossProfitRate)
    })
  })

  // ── Zod 検証 ──

  describe('Zod 契約', () => {
    it('正常な結果を受け入れる', () => {
      const result = calculateGrossProfit({
        sales: 10_000_000,
        purchaseCost: 7_000_000,
        openingInventory: 3_000_000,
        closingInventory: 2_500_000,
        method: 'inventory',
        inclusionMode: 'before_cost_inclusion',
      })
      expect(() => GrossProfitReadModel.parse(result)).not.toThrow()
    })
  })
})

describe('calculateGrossProfitWithFallback', () => {
  it('在庫法が使える場合は在庫法を使用', () => {
    const result = calculateGrossProfitWithFallback({
      sales: 10_000_000,
      totalPurchaseCost: 7_000_000,
      inventoryPurchaseCost: 6_000_000,
      openingInventory: 3_000_000,
      closingInventory: 2_500_000,
      costInclusion: 100_000,
      inclusionMode: 'before_cost_inclusion',
      coreSales: 8_000_000,
      discountRate: 0.02,
      markupRate: 0.26,
    })
    expect(result.meta.source).toBe('inventory')
    expect(result.meta.usedFallback).toBe(false)
  })

  it('在庫データなし → 推定法にフォールバック', () => {
    const result = calculateGrossProfitWithFallback({
      sales: 10_000_000,
      totalPurchaseCost: 7_000_000,
      inventoryPurchaseCost: 6_000_000,
      openingInventory: null,
      closingInventory: null,
      costInclusion: 100_000,
      inclusionMode: 'before_cost_inclusion',
      coreSales: 8_000_000,
      discountRate: 0.02,
      markupRate: 0.26,
    })
    expect(result.meta.source).toBe('estimated')
    expect(result.meta.usedFallback).toBe(true)
  })

  it('粗利がゼロでも在庫法を維持する（0 は fallback の理由にならない）', () => {
    // COGS = 3,000,000 + 7,000,000 - 0 = 10,000,000
    // GP = 10,000,000 - 10,000,000 = 0
    const result = calculateGrossProfitWithFallback({
      sales: 10_000_000,
      totalPurchaseCost: 7_000_000,
      inventoryPurchaseCost: 6_000_000,
      openingInventory: 3_000_000,
      closingInventory: 0,
      costInclusion: 0,
      inclusionMode: 'before_cost_inclusion',
      coreSales: 8_000_000,
      discountRate: 0.02,
      markupRate: 0.26,
    })
    expect(result.grossProfit).toBe(0)
    expect(result.meta.source).toBe('inventory')
    expect(result.meta.usedFallback).toBe(false)
  })
})
