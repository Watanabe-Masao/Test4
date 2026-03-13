import { describe, it, expect } from 'vitest'
import {
  calculateTransferTotals,
  calculateInventoryCost,
  type TransferTotalsInput,
} from '../costAggregation'

describe('calculateTransferTotals', () => {
  it('全ゼロ → ゼロ', () => {
    const input: TransferTotalsInput = {
      interStoreInPrice: 0,
      interStoreInCost: 0,
      interStoreOutPrice: 0,
      interStoreOutCost: 0,
      interDepartmentInPrice: 0,
      interDepartmentInCost: 0,
      interDepartmentOutPrice: 0,
      interDepartmentOutCost: 0,
    }
    const result = calculateTransferTotals(input)
    expect(result.transferPrice).toBe(0)
    expect(result.transferCost).toBe(0)
  })

  it('4方向の合計を正しく計算する', () => {
    const input: TransferTotalsInput = {
      interStoreInPrice: 100,
      interStoreInCost: 70,
      interStoreOutPrice: 200,
      interStoreOutCost: 140,
      interDepartmentInPrice: 50,
      interDepartmentInCost: 35,
      interDepartmentOutPrice: 80,
      interDepartmentOutCost: 56,
    }
    const result = calculateTransferTotals(input)
    expect(result.transferPrice).toBe(430)
    expect(result.transferCost).toBe(301)
  })

  it('storeAssembler 互換: CostPricePair 構造からの変換で同じ結果', () => {
    // storeAssembler の旧 calculateTransferTotals が受けていた値を再現
    const transferTotals = {
      interStoreIn: { cost: 100, price: 150 },
      interStoreOut: { cost: 200, price: 300 },
      interDepartmentIn: { cost: 50, price: 75 },
      interDepartmentOut: { cost: 80, price: 120 },
    }

    // 旧実装の計算
    const oldTransferPrice =
      transferTotals.interStoreIn.price +
      transferTotals.interStoreOut.price +
      transferTotals.interDepartmentIn.price +
      transferTotals.interDepartmentOut.price
    const oldTransferCost =
      transferTotals.interStoreIn.cost +
      transferTotals.interStoreOut.cost +
      transferTotals.interDepartmentIn.cost +
      transferTotals.interDepartmentOut.cost

    // 新実装
    const result = calculateTransferTotals({
      interStoreInPrice: transferTotals.interStoreIn.price,
      interStoreInCost: transferTotals.interStoreIn.cost,
      interStoreOutPrice: transferTotals.interStoreOut.price,
      interStoreOutCost: transferTotals.interStoreOut.cost,
      interDepartmentInPrice: transferTotals.interDepartmentIn.price,
      interDepartmentInCost: transferTotals.interDepartmentIn.cost,
      interDepartmentOutPrice: transferTotals.interDepartmentOut.price,
      interDepartmentOutCost: transferTotals.interDepartmentOut.cost,
    })

    expect(result.transferPrice).toBe(oldTransferPrice)
    expect(result.transferCost).toBe(oldTransferCost)
  })
})

describe('calculateInventoryCost', () => {
  it('totalCost - deliverySalesCost', () => {
    expect(calculateInventoryCost(1000, 300)).toBe(700)
  })

  it('売上納品ゼロ → totalCost がそのまま', () => {
    expect(calculateInventoryCost(500, 0)).toBe(500)
  })

  it('両方ゼロ → 0', () => {
    expect(calculateInventoryCost(0, 0)).toBe(0)
  })
})
