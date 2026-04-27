/**
 * inventoryCalcBridge — mode switch + compute tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  setInventoryCalcBridgeMode,
  getInventoryCalcBridgeMode,
  computeEstimatedInventoryDetails,
  rollbackToCurrentOnly,
  getLastDualRunResult,
} from '../inventoryCalcBridge'
import type { DailyRecord } from '@/domain/models/record'

function rec(day: number, sales: number, cost: number): DailyRecord {
  return {
    day,
    sales,
    purchase: { cost, price: 0 },
    interStoreIn: { cost: 0, price: 0 },
    interStoreOut: { cost: 0, price: 0 },
    interDepartmentIn: { cost: 0, price: 0 },
    interDepartmentOut: { cost: 0, price: 0 },
    flowers: { cost: 0, price: 0 },
    directProduce: { cost: 0, price: 0 },
    costInclusion: { items: [] },
    discountAmount: 0,
    discountEntries: [],
    supplierBreakdown: new Map(),
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
    coreSales: sales,
    grossSales: sales,
    totalCost: cost,
    deliverySales: { cost: 0, price: 0 },
    discountAbsolute: 0,
  } as unknown as DailyRecord
}

describe('inventoryCalcBridge mode switch', () => {
  beforeEach(() => {
    rollbackToCurrentOnly()
  })

  it("デフォルトは 'current-only'", () => {
    expect(getInventoryCalcBridgeMode()).toBe('current-only')
  })

  it('setInventoryCalcBridgeMode で mode 切替', () => {
    setInventoryCalcBridgeMode('fallback-to-current')
    expect(getInventoryCalcBridgeMode()).toBe('fallback-to-current')
  })

  it('rollbackToCurrentOnly でリセット', () => {
    setInventoryCalcBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getInventoryCalcBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})

describe('computeEstimatedInventoryDetails (current-only)', () => {
  beforeEach(() => {
    setInventoryCalcBridgeMode('current-only')
  })

  it('空 daily でも配列を返す', () => {
    const r = computeEstimatedInventoryDetails(new Map(), 31, 1000, null, 0.3, 0.02)
    expect(Array.isArray(r)).toBe(true)
    expect(r.length).toBe(31)
  })

  it('各行は day / estimated / actual / estCogs を持つ', () => {
    const daily = new Map([[1, rec(1, 1000, 700)]])
    const r = computeEstimatedInventoryDetails(daily, 5, 1000, null, 0.3, 0.02)
    expect(r[0]).toHaveProperty('day')
    expect(r[0]).toHaveProperty('estimated')
    expect(r[0]).toHaveProperty('estCogs')
  })

  it('daysInMonth 分の行数を返す', () => {
    const r = computeEstimatedInventoryDetails(new Map(), 10, 1000, null, 0.3, 0.02)
    expect(r.length).toBe(10)
  })

  it('day は 1 から連番', () => {
    const r = computeEstimatedInventoryDetails(new Map(), 5, 1000, null, 0.3, 0.02)
    expect(r.map((x) => x.day)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('computeEstimatedInventoryDetails (fallback-to-current)', () => {
  beforeEach(() => {
    setInventoryCalcBridgeMode('fallback-to-current')
  })

  it('WASM 未 ready でも current path で配列を返す', () => {
    const r = computeEstimatedInventoryDetails(new Map(), 31, 1000, null, 0.3, 0.02)
    expect(Array.isArray(r)).toBe(true)
  })
})
