/**
 * timeSlotBridge — findCoreTime / findTurnaroundHour smoke tests
 *
 * WASM 未 ready 環境での TS fallback path を検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { findCoreTime, findTurnaroundHour, buildHourlyMap } from '../timeSlotBridge'

describe('findCoreTime', () => {
  it('空 Map で null', () => {
    expect(findCoreTime(new Map())).toBeNull()
  })

  it('3 連続時間帯で最大合計の window を返す', () => {
    const m = new Map([
      [10, 100],
      [11, 200],
      [12, 500],
      [13, 400],
      [14, 100],
    ])
    const r = findCoreTime(m)
    expect(r).not.toBeNull()
    expect(r!.startHour).toBe(11)
    expect(r!.endHour).toBe(13)
    expect(r!.total).toBe(200 + 500 + 400)
  })

  it('時間幅が 2 未満（2 時間未満）でも全範囲を返す', () => {
    const r = findCoreTime(new Map([[10, 100]]))
    expect(r).toEqual({ startHour: 10, endHour: 10, total: 100 })
  })
})

describe('findTurnaroundHour', () => {
  it('空 Map で null', () => {
    expect(findTurnaroundHour(new Map())).toBeNull()
  })

  it('累積 50% 到達時刻を返す', () => {
    const m = new Map([
      [10, 100],
      [11, 100],
      [12, 200],
    ])
    // total=400, half=200, cum 10=100, cum 11=200(=half) → 11
    expect(findTurnaroundHour(m)).toBe(11)
  })

  it('全値 0 で null', () => {
    expect(findTurnaroundHour(new Map([[10, 0]]))).toBeNull()
  })
})

describe('buildHourlyMap (re-export)', () => {
  it('配列から Map を構築', () => {
    const m = buildHourlyMap([
      { hour: 10, amount: 100 },
      { hour: 11, amount: 200 },
    ])
    expect(m.get(10)).toBe(100)
    expect(m.get(11)).toBe(200)
  })

  it('同じ hour は合算', () => {
    const m = buildHourlyMap([
      { hour: 10, amount: 100 },
      { hour: 10, amount: 200 },
    ])
    expect(m.get(10)).toBe(300)
  })

  it('空配列で空 Map', () => {
    expect(buildHourlyMap([]).size).toBe(0)
  })
})
