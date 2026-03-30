/**
 * PI値（Purchase Incidence）計算テスト
 *
 * @see references/01-principles/pi-value-definition.md
 */
import { describe, it, expect } from 'vitest'
import {
  calculateQuantityPI,
  calculateAmountPI,
  calculatePIValues,
  PIValueResultSchema,
} from '../piValue'
import { calculateItemsPerCustomer, calculateAveragePricePerItem } from '../utils'

describe('calculateQuantityPI', () => {
  it('点数PI値 = (販売点数 ÷ 来店客数) × 1,000', () => {
    expect(calculateQuantityPI(500, 100)).toBe(5_000)
  })

  it('客数 0 → 0', () => {
    expect(calculateQuantityPI(500, 0)).toBe(0)
  })

  it('点数 0 → 0', () => {
    expect(calculateQuantityPI(0, 100)).toBe(0)
  })
})

describe('calculateAmountPI', () => {
  it('金額PI値 = (売上金額 ÷ 来店客数) × 1,000', () => {
    expect(calculateAmountPI(10_000_000, 5_000)).toBe(2_000_000)
  })

  it('客数 0 → 0', () => {
    expect(calculateAmountPI(10_000_000, 0)).toBe(0)
  })
})

describe('calculatePIValues', () => {
  it('一括計算', () => {
    const result = calculatePIValues({
      totalQuantity: 15_000,
      totalSales: 10_000_000,
      customers: 5_000,
    })
    expect(result.quantityPI).toBe(3_000)
    expect(result.amountPI).toBe(2_000_000)
  })

  it('Zod parse', () => {
    const result = calculatePIValues({
      totalQuantity: 15_000,
      totalSales: 10_000_000,
      customers: 5_000,
    })
    expect(() => PIValueResultSchema.parse(result)).not.toThrow()
  })
})

describe('PI値と既存指標の不変条件', () => {
  it('客単価 = (点数PI値 / 1,000) × 点単価', () => {
    const qty = 15_000
    const sales = 10_000_000
    const customers = 5_000

    const qtyPI = calculateQuantityPI(qty, customers)
    const ppu = calculateAveragePricePerItem(sales, qty)
    const transactionValue = sales / customers

    // 客単価 = (点数PI / 1000) × 点単価
    expect((qtyPI / 1_000) * ppu).toBeCloseTo(transactionValue, 5)
  })

  it('点数PI値 / 1,000 = calculateItemsPerCustomer', () => {
    const qty = 15_000
    const customers = 5_000

    const qtyPI = calculateQuantityPI(qty, customers)
    const itemsPerCustomer = calculateItemsPerCustomer(qty, customers)

    expect(qtyPI / 1_000).toBe(itemsPerCustomer)
  })
})
