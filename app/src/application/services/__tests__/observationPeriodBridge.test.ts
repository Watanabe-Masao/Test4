/**
 * observationPeriodBridge — mode switch + evaluate tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  setObservationPeriodBridgeMode,
  getObservationPeriodBridgeMode,
  evaluateObservationPeriod,
  rollbackToCurrentOnly,
  getLastDualRunResult,
} from '../observationPeriodBridge'

describe('observationPeriodBridge mode switch', () => {
  beforeEach(() => {
    rollbackToCurrentOnly()
  })

  it("デフォルトは 'current-only'", () => {
    expect(getObservationPeriodBridgeMode()).toBe('current-only')
  })

  it('setObservationPeriodBridgeMode で mode 切替', () => {
    setObservationPeriodBridgeMode('fallback-to-current')
    expect(getObservationPeriodBridgeMode()).toBe('fallback-to-current')
  })

  it('rollbackToCurrentOnly でリセット', () => {
    setObservationPeriodBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getObservationPeriodBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})

describe('evaluateObservationPeriod (current-only)', () => {
  beforeEach(() => {
    setObservationPeriodBridgeMode('current-only')
  })

  it('空 daily で status=undefined（売上計上なし）', () => {
    const r = evaluateObservationPeriod(new Map(), 31, 15)
    expect(r.lastRecordedSalesDay).toBe(0)
    expect(r.salesDays).toBe(0)
    expect(r.status).toBe('undefined')
  })

  it('連続売上でデータ観測 ok', () => {
    const daily = new Map<number, { sales: number }>()
    for (let d = 1; d <= 20; d++) daily.set(d, { sales: 100 })
    const r = evaluateObservationPeriod(daily, 31, 20)
    expect(r.lastRecordedSalesDay).toBe(20)
    expect(r.salesDays).toBe(20)
    expect(r.status).toBe('ok')
  })

  it('lastRecordedSalesDay = 最大 sales>0 の day', () => {
    const daily = new Map<number, { sales: number }>([
      [1, { sales: 100 }],
      [5, { sales: 200 }],
      [10, { sales: 0 }],
    ])
    const r = evaluateObservationPeriod(daily, 31, 15)
    expect(r.lastRecordedSalesDay).toBe(5)
  })

  it('salesDays は sales>0 の日数', () => {
    const daily = new Map<number, { sales: number }>([
      [1, { sales: 100 }],
      [2, { sales: 0 }],
      [3, { sales: 200 }],
    ])
    const r = evaluateObservationPeriod(daily, 31, 5)
    expect(r.salesDays).toBe(2)
  })

  it('remainingDays = daysInMonth - elapsedDays（elapsedDays = lastRecordedSalesDay）', () => {
    const daily = new Map<number, { sales: number }>([
      [1, { sales: 100 }],
      [5, { sales: 200 }],
    ])
    const r = evaluateObservationPeriod(daily, 31, 15)
    // elapsedDays = lastRecordedSalesDay = 5
    expect(r.elapsedDays).toBe(5)
    expect(r.remainingDays).toBe(31 - 5)
  })

  it('daysInMonth はそのまま反映', () => {
    const r = evaluateObservationPeriod(new Map(), 28, 10)
    expect(r.daysInMonth).toBe(28)
  })
})

describe('evaluateObservationPeriod (fallback-to-current)', () => {
  beforeEach(() => {
    setObservationPeriodBridgeMode('fallback-to-current')
  })

  it('WASM 未 ready でも current path で結果', () => {
    const r = evaluateObservationPeriod(new Map(), 31, 10)
    expect(r).toHaveProperty('status')
  })
})
