/**
 * piCanonicalInput.ts — pure builder test
 *
 * 検証対象:
 * - buildGrandTotalPI: customers=0 → { piQty: null, piAmount: null }
 * - buildGrandTotalPI: 正常値 → calculateQuantityPI / calculateAmountPI
 * - buildStorePIResults: salesFact.daily を storeId で集約
 * - buildStorePIResults: customers=0 の店舗は piQty / piAmount=null
 */
import { describe, it, expect } from 'vitest'
import { buildGrandTotalPI, buildStorePIResults } from '../piCanonicalInput'
import type { SalesFactReadModel } from '@/application/readModels/salesFact'
import type { CustomerFactReadModel } from '@/application/readModels/customerFact'

function makeSalesFact(
  grandTotalQuantity: number,
  grandTotalAmount: number,
  daily: { storeId: string; totalQuantity: number; totalAmount: number }[] = [],
): SalesFactReadModel {
  return {
    grandTotalAmount,
    grandTotalQuantity,
    daily,
  } as unknown as SalesFactReadModel
}

function makeCustomerFact(
  grandTotalCustomers: number,
  dailyRows: { storeId: string; customers: number }[] = [],
): CustomerFactReadModel {
  // toStoreCustomerRows は customerFact.daily を iterate する
  return {
    grandTotalCustomers,
    daily: dailyRows,
  } as unknown as CustomerFactReadModel
}

// ─── buildGrandTotalPI ───────────────────────────────

describe('buildGrandTotalPI', () => {
  it('customers=0 → { piQty: null, piAmount: null }', () => {
    const result = buildGrandTotalPI(makeSalesFact(100, 10000), makeCustomerFact(0))
    expect(result.piQty).toBeNull()
    expect(result.piAmount).toBeNull()
  })

  it('customers>0 → piQty / piAmount が計算される', () => {
    const result = buildGrandTotalPI(makeSalesFact(500, 100000), makeCustomerFact(100))
    // calculateQuantityPI(500, 100) = 500/100*1000 = 5000
    expect(result.piQty).toBe(5000)
    // calculateAmountPI(100000, 100) = 100000/100*1000 = 1000000
    expect(result.piAmount).toBe(1000000)
  })
})

// ─── buildStorePIResults ─────────────────────────────

describe('buildStorePIResults', () => {
  it('単一 store: salesFact.daily を storeId で集約', () => {
    const salesFact = makeSalesFact(0, 0, [
      { storeId: 's1', totalQuantity: 100, totalAmount: 10000 },
      { storeId: 's1', totalQuantity: 50, totalAmount: 5000 },
    ])
    const customerFact = makeCustomerFact(0, [{ storeId: 's1', customers: 100 }])
    const results = buildStorePIResults(salesFact, customerFact)
    expect(results).toHaveLength(1)
    expect(results[0].storeId).toBe('s1')
    expect(results[0].totalQuantity).toBe(150)
    expect(results[0].totalAmount).toBe(15000)
  })

  it('複数 store: 店舗ごとに集約される', () => {
    const salesFact = makeSalesFact(0, 0, [
      { storeId: 's1', totalQuantity: 100, totalAmount: 10000 },
      { storeId: 's2', totalQuantity: 200, totalAmount: 20000 },
    ])
    const customerFact = makeCustomerFact(0, [
      { storeId: 's1', customers: 100 },
      { storeId: 's2', customers: 200 },
    ])
    const results = buildStorePIResults(salesFact, customerFact)
    expect(results).toHaveLength(2)
    const s1 = results.find((r) => r.storeId === 's1')!
    const s2 = results.find((r) => r.storeId === 's2')!
    expect(s1.totalAmount).toBe(10000)
    expect(s2.totalAmount).toBe(20000)
  })

  it('customers=0 の store → piQty / piAmount=null', () => {
    const salesFact = makeSalesFact(0, 0, [
      { storeId: 's1', totalQuantity: 100, totalAmount: 10000 },
    ])
    const customerFact = makeCustomerFact(0, [{ storeId: 's1', customers: 0 }])
    const results = buildStorePIResults(salesFact, customerFact)
    expect(results[0].piQty).toBeNull()
    expect(results[0].piAmount).toBeNull()
  })

  it('customerMap に無い store → customers=0 扱い', () => {
    const salesFact = makeSalesFact(0, 0, [
      { storeId: 'unknown', totalQuantity: 100, totalAmount: 10000 },
    ])
    const customerFact = makeCustomerFact(0, [])
    const results = buildStorePIResults(salesFact, customerFact)
    expect(results[0].customers).toBe(0)
    expect(results[0].piQty).toBeNull()
  })

  it('customers>0 → piQty / piAmount が計算される', () => {
    const salesFact = makeSalesFact(0, 0, [
      { storeId: 's1', totalQuantity: 500, totalAmount: 100000 },
    ])
    const customerFact = makeCustomerFact(0, [{ storeId: 's1', customers: 100 }])
    const results = buildStorePIResults(salesFact, customerFact)
    expect(results[0].piQty).toBe(5000)
    expect(results[0].piAmount).toBe(1000000)
  })
})
