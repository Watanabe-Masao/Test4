/**
 * piValueBridge — mode switch + calculate tests
 *
 * PI値 = (数量 / 客数) × 1000
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  setPiValueBridgeMode,
  getPiValueBridgeMode,
  calculateQuantityPI,
  calculateAmountPI,
  calculatePIValues,
  rollbackToCurrentOnly,
  getLastDualRunResult,
} from '../piValueBridge'

describe('piValueBridge mode switch', () => {
  beforeEach(() => {
    rollbackToCurrentOnly()
  })

  it("デフォルトは 'current-only'", () => {
    expect(getPiValueBridgeMode()).toBe('current-only')
  })

  it('setPiValueBridgeMode で mode 切替', () => {
    setPiValueBridgeMode('fallback-to-current')
    expect(getPiValueBridgeMode()).toBe('fallback-to-current')
  })

  it('rollbackToCurrentOnly でリセット', () => {
    setPiValueBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getPiValueBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})

describe('calculateQuantityPI', () => {
  beforeEach(() => {
    setPiValueBridgeMode('current-only')
  })

  it('PI値 = 数量 / 客数 × 1000', () => {
    expect(calculateQuantityPI(100, 50)).toBe((100 / 50) * 1000)
  })

  it('客数=0 で 0（ゼロ除算ガード）', () => {
    expect(calculateQuantityPI(100, 0)).toBe(0)
  })

  it('数量=0 で 0', () => {
    expect(calculateQuantityPI(0, 100)).toBe(0)
  })
})

describe('calculateAmountPI', () => {
  beforeEach(() => {
    setPiValueBridgeMode('current-only')
  })

  it('PI値 = 売上 / 客数 × 1000', () => {
    expect(calculateAmountPI(10000, 50)).toBe((10000 / 50) * 1000)
  })

  it('客数=0 で 0', () => {
    expect(calculateAmountPI(10000, 0)).toBe(0)
  })
})

describe('calculatePIValues', () => {
  beforeEach(() => {
    setPiValueBridgeMode('current-only')
  })

  it('一括計算で両 PI 値を返す', () => {
    const r = calculatePIValues({ totalSales: 10000, totalQuantity: 100, customers: 50 })
    expect(r.amountPI).toBe((10000 / 50) * 1000)
    expect(r.quantityPI).toBe((100 / 50) * 1000)
  })

  it('客数=0 で両方 0', () => {
    const r = calculatePIValues({ totalSales: 10000, totalQuantity: 100, customers: 0 })
    expect(r.amountPI).toBe(0)
    expect(r.quantityPI).toBe(0)
  })
})

describe('calculatePIValues (fallback-to-current)', () => {
  beforeEach(() => {
    setPiValueBridgeMode('fallback-to-current')
  })

  it('WASM 未 ready でも current path で結果', () => {
    const r = calculatePIValues({ totalSales: 10000, totalQuantity: 100, customers: 50 })
    expect(r.amountPI).toBeGreaterThan(0)
  })
})
