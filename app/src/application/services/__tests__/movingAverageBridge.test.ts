/**
 * movingAverageBridge — mode switch + current/rollback tests
 *
 * bridge は current-only / candidate-only / dual-run-compare / fallback-to-current
 * の 4 モードで computeMovingAverage の経路を切り替える。
 * WASM candidate が ready でない環境では current path のみをテストする。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  setMovingAverageBridgeMode,
  getMovingAverageBridgeMode,
  computeMovingAverage,
  rollbackToCurrentOnly,
  getLastDualRunResult,
} from '../movingAverageBridge'
import type { MovingAveragePoint } from '@/domain/calculations/temporal/computeMovingAverage'

const policy = {
  missingAs: 'ok-zero' as const,
  minRequired: 1,
}

const sampleSeries: readonly MovingAveragePoint[] = [
  { dateKey: '2026-03-01', value: 10, status: 'ok' as const },
  { dateKey: '2026-03-02', value: 20, status: 'ok' as const },
  { dateKey: '2026-03-03', value: 30, status: 'ok' as const },
]

describe('movingAverageBridge mode switch', () => {
  beforeEach(() => {
    rollbackToCurrentOnly()
  })

  it("デフォルトは 'current-only'", () => {
    expect(getMovingAverageBridgeMode()).toBe('current-only')
  })

  it('setMovingAverageBridgeMode で mode 切替', () => {
    setMovingAverageBridgeMode('fallback-to-current')
    expect(getMovingAverageBridgeMode()).toBe('fallback-to-current')
  })

  it('rollbackToCurrentOnly で current-only + dualRunResult=null', () => {
    setMovingAverageBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getMovingAverageBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})

describe('computeMovingAverage (current-only)', () => {
  beforeEach(() => {
    setMovingAverageBridgeMode('current-only')
  })

  it('current path で結果を返す', () => {
    const r = computeMovingAverage(sampleSeries, 3, policy)
    expect(r).toHaveLength(sampleSeries.length)
  })

  it('結果は value / status プロパティを持つ', () => {
    const r = computeMovingAverage(sampleSeries, 2, policy)
    expect(r[0]).toHaveProperty('value')
    expect(r[0]).toHaveProperty('status')
  })

  it('空系列で空配列', () => {
    const r = computeMovingAverage([], 3, policy)
    expect(r).toEqual([])
  })
})

describe('computeMovingAverage (fallback-to-current)', () => {
  beforeEach(() => {
    setMovingAverageBridgeMode('fallback-to-current')
  })

  it('WASM ready でなければ current path で結果を返す（fallback）', () => {
    // 本テスト環境では WASM は ready でない想定
    const r = computeMovingAverage(sampleSeries, 2, policy)
    expect(r).toHaveLength(sampleSeries.length)
  })
})

describe('computeMovingAverage (dual-run-compare)', () => {
  beforeEach(() => {
    rollbackToCurrentOnly()
    setMovingAverageBridgeMode('dual-run-compare')
  })

  it('candidate 未 ready なら dualRunResult は更新されない', () => {
    const before = getLastDualRunResult()
    computeMovingAverage(sampleSeries, 2, policy)
    const after = getLastDualRunResult()
    // 環境に依存するが、candidate 未 ready なら before と同じ（通常 null）
    expect(after).toBe(before)
  })

  it('current path の結果を戻り値として返す（dual モードでも current を返す）', () => {
    const r = computeMovingAverage(sampleSeries, 2, policy)
    expect(r.length).toBe(sampleSeries.length)
  })
})
