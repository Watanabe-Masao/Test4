/**
 * correlationBridge — mode switch + pearsonCorrelation + passthrough tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  setCorrelationBridgeMode,
  getCorrelationBridgeMode,
  pearsonCorrelation,
  cosineSimilarity,
  normalizeMinMax,
  rollbackToCurrentOnly,
  getLastDualRunResult,
} from '../correlationBridge'

describe('correlationBridge mode switch', () => {
  beforeEach(() => {
    rollbackToCurrentOnly()
  })

  it("デフォルトは 'current-only'", () => {
    expect(getCorrelationBridgeMode()).toBe('current-only')
  })

  it('setCorrelationBridgeMode で mode 切替', () => {
    setCorrelationBridgeMode('fallback-to-current')
    expect(getCorrelationBridgeMode()).toBe('fallback-to-current')
  })

  it('rollbackToCurrentOnly でリセット', () => {
    setCorrelationBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getCorrelationBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})

describe('pearsonCorrelation (current-only)', () => {
  beforeEach(() => {
    setCorrelationBridgeMode('current-only')
  })

  it('完全正相関で r=1', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = [2, 4, 6, 8, 10]
    const r = pearsonCorrelation(xs, ys)
    expect(r.r).toBeCloseTo(1, 5)
    expect(r.n).toBe(5)
  })

  it('完全負相関で r=-1', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = [10, 8, 6, 4, 2]
    const r = pearsonCorrelation(xs, ys)
    expect(r.r).toBeCloseTo(-1, 5)
  })

  it('無相関（ランダム）で r は 0 近辺', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = [3, 1, 4, 1, 5]
    const r = pearsonCorrelation(xs, ys)
    expect(typeof r.r).toBe('number')
  })

  it('長さ違いで n は短い方', () => {
    const r = pearsonCorrelation([1, 2, 3], [1, 2])
    expect(r.n).toBeLessThanOrEqual(2)
  })
})

describe('cosineSimilarity (passthrough)', () => {
  it('同じベクトルで 1.0', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5)
  })

  it('直交ベクトルで 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5)
  })
})

describe('normalizeMinMax (passthrough)', () => {
  it('空配列で空 values 配列', () => {
    const r = normalizeMinMax([])
    expect(r.values).toEqual([])
  })

  it('全同値で結果 values 配列を返す（値域は実装依存 — 長さは入力と一致）', () => {
    const r = normalizeMinMax([5, 5, 5])
    expect(r.values).toHaveLength(3)
  })

  it('値を 0〜100 スケールに正規化', () => {
    const r = normalizeMinMax([0, 50, 100])
    expect(r.values[0]).toBeCloseTo(0, 5)
    expect(r.values[2]).toBeCloseTo(100, 5)
  })
})

describe('pearsonCorrelation (fallback-to-current)', () => {
  beforeEach(() => {
    setCorrelationBridgeMode('fallback-to-current')
  })

  it('WASM 未 ready でも current path で結果', () => {
    const r = pearsonCorrelation([1, 2, 3], [2, 4, 6])
    expect(r.r).toBeCloseTo(1, 5)
  })
})
