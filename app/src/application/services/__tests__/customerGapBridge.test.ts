/**
 * customerGapBridge — mode switch + calculation tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  setCustomerGapBridgeMode,
  getCustomerGapBridgeMode,
  calculateCustomerGap,
  rollbackToCurrentOnly,
  getLastDualRunResult,
} from '../customerGapBridge'

const sampleInput = {
  curCustomers: 1000,
  prevCustomers: 900,
  curQuantity: 3000,
  prevQuantity: 2700,
  curSales: 500000,
  prevSales: 450000,
}

describe('customerGapBridge mode switch', () => {
  beforeEach(() => {
    rollbackToCurrentOnly()
  })

  it("デフォルトは 'current-only'", () => {
    expect(getCustomerGapBridgeMode()).toBe('current-only')
  })

  it('setCustomerGapBridgeMode で mode 切替', () => {
    setCustomerGapBridgeMode('fallback-to-current')
    expect(getCustomerGapBridgeMode()).toBe('fallback-to-current')
  })

  it('rollbackToCurrentOnly で current-only + dualRunResult=null', () => {
    setCustomerGapBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getCustomerGapBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})

describe('calculateCustomerGap (current-only)', () => {
  beforeEach(() => {
    setCustomerGapBridgeMode('current-only')
  })

  it('正常な入力で結果を返す', () => {
    const r = calculateCustomerGap(sampleInput)
    expect(r).not.toBeNull()
    expect(r).toHaveProperty('customerYoY')
    expect(r).toHaveProperty('quantityYoY')
    expect(r).toHaveProperty('salesYoY')
  })

  it('customerYoY = 当期客数 / 前期客数', () => {
    const r = calculateCustomerGap(sampleInput)
    expect(r!.customerYoY).toBeCloseTo(1000 / 900, 5)
  })

  it('quantityYoY = 当期点数 / 前期点数', () => {
    const r = calculateCustomerGap(sampleInput)
    expect(r!.quantityYoY).toBeCloseTo(3000 / 2700, 5)
  })

  it('salesYoY = 当期売上 / 前期売上', () => {
    const r = calculateCustomerGap(sampleInput)
    expect(r!.salesYoY).toBeCloseTo(500000 / 450000, 5)
  })

  it('quantityCustomerGap = quantityYoY - customerYoY', () => {
    const r = calculateCustomerGap(sampleInput)
    expect(r!.quantityCustomerGap).toBeCloseTo(r!.quantityYoY - r!.customerYoY, 5)
  })

  it('amountCustomerGap = salesYoY - customerYoY', () => {
    const r = calculateCustomerGap(sampleInput)
    expect(r!.amountCustomerGap).toBeCloseTo(r!.salesYoY - r!.customerYoY, 5)
  })

  it('前期客数=0 は null（0除算ガード）', () => {
    const r = calculateCustomerGap({ ...sampleInput, prevCustomers: 0 })
    expect(r).toBeNull()
  })
})

describe('calculateCustomerGap (fallback-to-current)', () => {
  beforeEach(() => {
    setCustomerGapBridgeMode('fallback-to-current')
  })

  it('WASM candidate 未 ready でも current path で返る', () => {
    const r = calculateCustomerGap(sampleInput)
    expect(r).not.toBeNull()
  })
})
