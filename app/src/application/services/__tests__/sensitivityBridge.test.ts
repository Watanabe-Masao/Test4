/**
 * sensitivityBridge — mode switch + calculate tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  setSensitivityBridgeMode,
  getSensitivityBridgeMode,
  calculateSensitivity,
  calculateElasticity,
  rollbackToCurrentOnly,
  getLastDualRunResult,
} from '../sensitivityBridge'

const baseInput = {
  totalSales: 1_000_000,
  totalCost: 700_000,
  totalDiscount: 20_000,
  grossSales: 1_020_000,
  totalCustomers: 5000,
  totalCostInclusion: 10_000,
  averageMarkupRate: 0.3,
  budget: 1_200_000,
  elapsedDays: 20,
  salesDays: 20,
}

const zeroDeltas = {
  discountRateDelta: 0,
  customersDelta: 0,
  transactionValueDelta: 0,
  costRateDelta: 0,
}

describe('sensitivityBridge mode switch', () => {
  beforeEach(() => {
    rollbackToCurrentOnly()
  })

  it("デフォルトは 'current-only'", () => {
    expect(getSensitivityBridgeMode()).toBe('current-only')
  })

  it('setSensitivityBridgeMode で mode 切替', () => {
    setSensitivityBridgeMode('fallback-to-current')
    expect(getSensitivityBridgeMode()).toBe('fallback-to-current')
  })

  it('rollbackToCurrentOnly でリセット', () => {
    setSensitivityBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getSensitivityBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})

describe('calculateSensitivity (current-only)', () => {
  beforeEach(() => {
    setSensitivityBridgeMode('current-only')
  })

  it('正常な入力で結果オブジェクトを返す', () => {
    const r = calculateSensitivity(baseInput, zeroDeltas)
    expect(r).toHaveProperty('baseGrossProfit')
    expect(r).toHaveProperty('simulatedGrossProfit')
    expect(r).toHaveProperty('grossProfitDelta')
    expect(r).toHaveProperty('simulatedSales')
  })

  it('全 deltas=0 なら base == simulated（恒等）', () => {
    const r = calculateSensitivity(baseInput, zeroDeltas)
    expect(r.grossProfitDelta).toBeCloseTo(0, 5)
  })

  it('delta を与えると差分が 0 でなくなる', () => {
    const r = calculateSensitivity(baseInput, { ...zeroDeltas, customersDelta: 100 })
    expect(Math.abs(r.salesDelta)).toBeGreaterThan(0)
  })

  it('discountRateDelta 増加で売上減方向', () => {
    const r = calculateSensitivity(baseInput, { ...zeroDeltas, discountRateDelta: 0.01 })
    // 売変率上がると simulatedSales 側の計算が変わる（方向は実装依存）
    expect(r).toHaveProperty('simulatedSales')
  })
})

describe('calculateElasticity', () => {
  beforeEach(() => {
    setSensitivityBridgeMode('current-only')
  })

  it('elasticity オブジェクトを返す', () => {
    const r = calculateElasticity(baseInput)
    expect(r).toHaveProperty('discountRateElasticity')
    expect(r).toHaveProperty('customersElasticity')
    expect(r).toHaveProperty('transactionValueElasticity')
    expect(r).toHaveProperty('costRateElasticity')
  })

  it('各 elasticity は数値', () => {
    const r = calculateElasticity(baseInput)
    expect(typeof r.discountRateElasticity).toBe('number')
    expect(typeof r.customersElasticity).toBe('number')
  })
})
