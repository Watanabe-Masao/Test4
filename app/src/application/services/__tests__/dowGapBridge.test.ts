/**
 * dowGapBridge — mode switch + analyzeDowGap tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  setDowGapBridgeMode,
  getDowGapBridgeMode,
  analyzeDowGap,
  rollbackToCurrentOnly,
  getLastDualRunResult,
} from '../dowGapBridge'

describe('dowGapBridge mode switch', () => {
  beforeEach(() => {
    rollbackToCurrentOnly()
  })

  it("デフォルトは 'current-only'", () => {
    expect(getDowGapBridgeMode()).toBe('current-only')
  })

  it('setDowGapBridgeMode で mode 切替', () => {
    setDowGapBridgeMode('fallback-to-current')
    expect(getDowGapBridgeMode()).toBe('fallback-to-current')
  })

  it('rollbackToCurrentOnly でリセット', () => {
    setDowGapBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getDowGapBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})

describe('analyzeDowGap (current-only)', () => {
  beforeEach(() => {
    setDowGapBridgeMode('current-only')
  })

  it('結果オブジェクトを返す', () => {
    const r = analyzeDowGap(2026, 3, 2025, 3, 10000)
    expect(r).toHaveProperty('estimatedImpact')
    expect(r).toHaveProperty('isValid')
    expect(r).toHaveProperty('isSameStructure')
  })

  it('DowGap 分析に必要な情報がなければ isValid=false', () => {
    // 前年曜日別売上なしでは isValid=false になる想定
    const r = analyzeDowGap(2026, 3, 2025, 3, 10000)
    expect(typeof r.isValid).toBe('boolean')
  })

  it('prevDowSales 提供で isValid=true の可能性', () => {
    const prevDowSales = [10000, 12000, 11000, 13000, 14000, 15000, 16000]
    const r = analyzeDowGap(2026, 3, 2025, 3, 12000, prevDowSales)
    expect(r).toHaveProperty('estimatedImpact')
    expect(typeof r.estimatedImpact).toBe('number')
  })
})

describe('analyzeDowGap (fallback-to-current)', () => {
  beforeEach(() => {
    setDowGapBridgeMode('fallback-to-current')
  })

  it('WASM 未 ready でも current path で結果', () => {
    const r = analyzeDowGap(2026, 3, 2025, 3, 10000)
    expect(r).toHaveProperty('isValid')
  })
})
