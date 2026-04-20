/**
 * observationPeriodWasm — normalizeObservationPeriodInput tests
 *
 * Adapter function：ReadonlyMap → Float64Array 正規化の動作を固定する。
 */
import { describe, it, expect } from 'vitest'
import { normalizeObservationPeriodInput } from '../observationPeriodWasm'

describe('normalizeObservationPeriodInput', () => {
  it('空 Map で全日 0 埋めの Float64Array', () => {
    const r = normalizeObservationPeriodInput(new Map(), 5)
    expect(r).toBeInstanceOf(Float64Array)
    expect(r.length).toBe(5)
    expect([...r]).toEqual([0, 0, 0, 0, 0])
  })

  it('daysInMonth=0 で空配列', () => {
    const r = normalizeObservationPeriodInput(new Map(), 0)
    expect(r.length).toBe(0)
  })

  it('単一 day を index=day-1 に配置', () => {
    const r = normalizeObservationPeriodInput(new Map([[3, { sales: 500 }]]), 5)
    expect(r[0]).toBe(0)
    expect(r[1]).toBe(0)
    expect(r[2]).toBe(500) // day 3 → index 2
    expect(r[3]).toBe(0)
    expect(r[4]).toBe(0)
  })

  it('複数 day を全て反映', () => {
    const daily = new Map([
      [1, { sales: 100 }],
      [2, { sales: 200 }],
      [3, { sales: 300 }],
    ])
    const r = normalizeObservationPeriodInput(daily, 3)
    expect([...r]).toEqual([100, 200, 300])
  })

  it('daysInMonth > entry 数でも残り日は 0', () => {
    const daily = new Map([[1, { sales: 100 }]])
    const r = normalizeObservationPeriodInput(daily, 5)
    expect(r[0]).toBe(100)
    expect([...r.slice(1)]).toEqual([0, 0, 0, 0])
  })

  it('daysInMonth < entry day は対象外（範囲外 day は無視）', () => {
    // day=10 だが daysInMonth=5
    const daily = new Map([[10, { sales: 999 }]])
    const r = normalizeObservationPeriodInput(daily, 5)
    expect([...r]).toEqual([0, 0, 0, 0, 0])
  })

  it('sales=0 は 0 として反映', () => {
    const r = normalizeObservationPeriodInput(new Map([[1, { sales: 0 }]]), 3)
    expect(r[0]).toBe(0)
  })
})
