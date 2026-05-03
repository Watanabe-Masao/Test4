/**
 * 前年比客数GAP テスト
 *
 * @see references/01-foundation/customer-gap-definition.md
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { calculateCustomerGap, CustomerGapResultSchema } from '../customerGap'

describe('calculateCustomerGap', () => {
  it('客数100%、点数95% → 点数客数GAP = ▲5%', () => {
    const result = calculateCustomerGap({
      curCustomers: 5_000,
      prevCustomers: 5_000, // 100%
      curQuantity: 9_500,
      prevQuantity: 10_000, // 95%
      curSales: 10_000_000,
      prevSales: 10_000_000, // 100%
    })
    expect(result).not.toBeNull()
    expect(result!.customerYoY).toBeCloseTo(1.0, 5)
    expect(result!.quantityYoY).toBeCloseTo(0.95, 5)
    expect(result!.quantityCustomerGap).toBeCloseTo(-0.05, 5)
  })

  it('客数110%、点数100% → 点数客数GAP = ▲10%', () => {
    const result = calculateCustomerGap({
      curCustomers: 5_500,
      prevCustomers: 5_000, // 110%
      curQuantity: 10_000,
      prevQuantity: 10_000, // 100%
      curSales: 10_000_000,
      prevSales: 10_000_000,
    })
    expect(result).not.toBeNull()
    // 客数が増えたのに点数が同じ → 1人あたり買上点数が減少
    expect(result!.quantityCustomerGap).toBeCloseTo(-0.1, 5)
  })

  it('客数100%、金額120% → 金額客数GAP = +20%', () => {
    const result = calculateCustomerGap({
      curCustomers: 5_000,
      prevCustomers: 5_000,
      curQuantity: 10_000,
      prevQuantity: 10_000,
      curSales: 12_000_000,
      prevSales: 10_000_000, // 120%
    })
    expect(result).not.toBeNull()
    expect(result!.amountCustomerGap).toBeCloseTo(0.2, 5)
  })

  it('点数と金額の客数GAPが独立して計算される', () => {
    const result = calculateCustomerGap({
      curCustomers: 5_500,
      prevCustomers: 5_000, // 客数110%
      curQuantity: 12_000,
      prevQuantity: 10_000, // 点数120%
      curSales: 13_000_000,
      prevSales: 10_000_000, // 金額130%
    })
    expect(result).not.toBeNull()
    expect(result!.quantityCustomerGap).toBeCloseTo(0.1, 5) // 120% - 110%
    expect(result!.amountCustomerGap).toBeCloseTo(0.2, 5) // 130% - 110%
  })

  it('前期客数 0 → null', () => {
    const result = calculateCustomerGap({
      curCustomers: 5_000,
      prevCustomers: 0,
      curQuantity: 10_000,
      prevQuantity: 10_000,
      curSales: 10_000_000,
      prevSales: 10_000_000,
    })
    expect(result).toBeNull()
  })

  it('前期点数 0 → null', () => {
    const result = calculateCustomerGap({
      curCustomers: 5_000,
      prevCustomers: 5_000,
      curQuantity: 10_000,
      prevQuantity: 0,
      curSales: 10_000_000,
      prevSales: 10_000_000,
    })
    expect(result).toBeNull()
  })

  it('前期売上 0 → null', () => {
    const result = calculateCustomerGap({
      curCustomers: 5_000,
      prevCustomers: 5_000,
      curQuantity: 10_000,
      prevQuantity: 10_000,
      curSales: 10_000_000,
      prevSales: 0,
    })
    expect(result).toBeNull()
  })

  it('Zod parse が正常データを受け入れる', () => {
    const result = calculateCustomerGap({
      curCustomers: 5_000,
      prevCustomers: 5_000,
      curQuantity: 9_500,
      prevQuantity: 10_000,
      curSales: 10_000_000,
      prevSales: 10_000_000,
    })
    expect(result).not.toBeNull()
    expect(() => CustomerGapResultSchema.parse(result)).not.toThrow()
  })

  it('客数GAPが0のケース（全指標が同率）', () => {
    const result = calculateCustomerGap({
      curCustomers: 5_500,
      prevCustomers: 5_000, // 全て110%
      curQuantity: 11_000,
      prevQuantity: 10_000,
      curSales: 11_000_000,
      prevSales: 10_000_000,
    })
    expect(result).not.toBeNull()
    expect(result!.quantityCustomerGap).toBeCloseTo(0, 5)
    expect(result!.amountCustomerGap).toBeCloseTo(0, 5)
  })
})
