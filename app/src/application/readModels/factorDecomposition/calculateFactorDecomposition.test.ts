/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { calculateFactorDecomposition } from './calculateFactorDecomposition'
import { FactorDecompositionReadModel } from './FactorDecompositionTypes'

describe('calculateFactorDecomposition', () => {
  describe('2要素分解', () => {
    it('Shapley 不変条件: custEffect + ticketEffect = salesDelta', () => {
      const result = calculateFactorDecomposition({
        prevSales: 10_000_000,
        curSales: 12_000_000,
        prevCustomers: 5_000,
        curCustomers: 5_500,
        level: 'two',
      })
      expect(result.invariantSatisfied).toBe(true)
      expect(result.effectsSum).toBeCloseTo(result.salesDelta, 0)
      expect(result.salesDelta).toBe(2_000_000)
    })

    it('Zod parse が正常データを受け入れる', () => {
      const result = calculateFactorDecomposition({
        prevSales: 10_000_000,
        curSales: 12_000_000,
        prevCustomers: 5_000,
        curCustomers: 5_500,
        level: 'two',
      })
      expect(() => FactorDecompositionReadModel.parse(result)).not.toThrow()
    })
  })

  describe('3要素分解', () => {
    it('Shapley 不変条件: custEffect + qtyEffect + pricePerItemEffect = salesDelta', () => {
      const result = calculateFactorDecomposition({
        prevSales: 10_000_000,
        curSales: 11_500_000,
        prevCustomers: 5_000,
        curCustomers: 5_200,
        prevQuantity: 15_000,
        curQuantity: 16_000,
        level: 'three',
      })
      expect(result.invariantSatisfied).toBe(true)
      expect(result.effectsSum).toBeCloseTo(result.salesDelta, 0)
    })
  })

  describe('5要素分解', () => {
    it('カテゴリデータなし → 3要素にフォールバック', () => {
      const result = calculateFactorDecomposition({
        prevSales: 10_000_000,
        curSales: 11_000_000,
        prevCustomers: 5_000,
        curCustomers: 5_100,
        prevQuantity: 15_000,
        curQuantity: 15_500,
        level: 'five',
      })
      // 5要素が成立しない → 3要素のキーが返る
      expect(result.effects).toHaveProperty('pricePerItemEffect')
      expect(result.invariantSatisfied).toBe(true)
    })

    it('カテゴリデータあり → 5要素分解', () => {
      const result = calculateFactorDecomposition({
        prevSales: 10_000_000,
        curSales: 11_000_000,
        prevCustomers: 5_000,
        curCustomers: 5_100,
        prevQuantity: 15_000,
        curQuantity: 15_500,
        level: 'five',
        curCategories: [
          { key: 'A', qty: 10_000, amt: 7_000_000 },
          { key: 'B', qty: 5_500, amt: 4_000_000 },
        ],
        prevCategories: [
          { key: 'A', qty: 9_500, amt: 6_500_000 },
          { key: 'B', qty: 5_500, amt: 3_500_000 },
        ],
      })
      expect(result.effects).toHaveProperty('priceEffect')
      expect(result.effects).toHaveProperty('mixEffect')
      expect(result.invariantSatisfied).toBe(true)
    })
  })

  describe('meta', () => {
    it('authoritative = true（Rust bridge 経由）', () => {
      const result = calculateFactorDecomposition({
        prevSales: 10_000_000,
        curSales: 12_000_000,
        prevCustomers: 5_000,
        curCustomers: 5_500,
        level: 'two',
      })
      expect(result.meta.authoritative).toBe(true)
      expect(result.meta.tolerance).toBe(1.0)
    })
  })
})
