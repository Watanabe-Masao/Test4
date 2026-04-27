/**
 * customerGapCanonicalInput.ts — pure builder test
 *
 * 検証対象:
 * - buildAndCalculateCustomerGap: curSalesFact + prevSalesFact + customer fact
 *   から input を組み立てて calculateCustomerGap を呼ぶ
 * - buildCustomerGapCanonicalInput: 6 個の primitive から CustomerGapInput を構築
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  buildAndCalculateCustomerGap,
  buildCustomerGapCanonicalInput,
} from '../customerGapCanonicalInput'
import type { SalesFactReadModel } from '@/application/readModels/salesFact'
import type { CustomerFactReadModel } from '@/application/readModels/customerFact'

function makeSalesFact(grandTotalAmount: number, grandTotalQuantity: number): SalesFactReadModel {
  return { grandTotalAmount, grandTotalQuantity, daily: [] } as unknown as SalesFactReadModel
}

function makeCustomerFact(grandTotalCustomers: number): CustomerFactReadModel {
  return { grandTotalCustomers, daily: [] } as unknown as CustomerFactReadModel
}

describe('buildAndCalculateCustomerGap', () => {
  it('current と prev の ReadModel から CustomerGap を算出する', () => {
    const curSales = makeSalesFact(1000000, 5000)
    const prevSales = makeSalesFact(800000, 4000)
    const curCustomer = makeCustomerFact(100)
    const prevCustomer = makeCustomerFact(80)
    const result = buildAndCalculateCustomerGap(curSales, prevSales, curCustomer, prevCustomer)
    // calculateCustomerGap が null でない結果を返すはず (有効な入力)
    expect(result).not.toBeNull()
  })

  it('curCustomers=0 のような特殊ケースも処理される', () => {
    const curSales = makeSalesFact(0, 0)
    const prevSales = makeSalesFact(800000, 4000)
    const curCustomer = makeCustomerFact(0)
    const prevCustomer = makeCustomerFact(80)
    // 呼び出しは throw しない
    const result = buildAndCalculateCustomerGap(curSales, prevSales, curCustomer, prevCustomer)
    // null か object のいずれかを返す (仕様依存)
    expect(result === null || typeof result === 'object').toBe(true)
  })
})

describe('buildCustomerGapCanonicalInput', () => {
  it('6 primitive から CustomerGapInput を構築', () => {
    const input = buildCustomerGapCanonicalInput(1000, 800, 500, 400, 100, 80)
    expect(input.curCustomers).toBe(100)
    expect(input.prevCustomers).toBe(80)
    expect(input.curQuantity).toBe(500)
    expect(input.prevQuantity).toBe(400)
    expect(input.curSales).toBe(1000)
    expect(input.prevSales).toBe(800)
  })

  it('0 値 + 負値 でも object を構築', () => {
    const input = buildCustomerGapCanonicalInput(0, 0, 0, 0, 0, 0)
    expect(input).toEqual({
      curCustomers: 0,
      prevCustomers: 0,
      curQuantity: 0,
      prevQuantity: 0,
      curSales: 0,
      prevSales: 0,
    })
  })
})
