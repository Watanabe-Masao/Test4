/**
 * timeSlotCalculations — domain pure tests
 *
 * 検証対象:
 * - findCoreTime: 3連続時間ウィンドウの最大合計
 * - findTurnaroundHour: 累積 50% 到達時刻
 * - buildHourlyMap: 配列 → Map 集約
 */
import { describe, it, expect } from 'vitest'
import {
  findCoreTime,
  findTurnaroundHour,
  buildHourlyMap,
  CoreTimeResultSchema,
  TurnaroundHourResultSchema,
} from '../timeSlotCalculations'

describe('findCoreTime', () => {
  it('空 Map で null', () => {
    expect(findCoreTime(new Map())).toBeNull()
  })

  it('時間帯が 3 未満（時間幅 < 2）なら全範囲を返す', () => {
    const m = new Map<number, number>([
      [10, 100],
      [11, 200],
    ])
    expect(findCoreTime(m)).toEqual({ startHour: 10, endHour: 11, total: 300 })
  })

  it('単一時間帯でも全範囲扱い', () => {
    const m = new Map<number, number>([[12, 500]])
    expect(findCoreTime(m)).toEqual({ startHour: 12, endHour: 12, total: 500 })
  })

  it('3 連続のうち合計最大のウィンドウを返す', () => {
    const m = new Map<number, number>([
      [10, 100],
      [11, 200],
      [12, 300],
      [13, 100],
    ])
    // 10-12: 600, 11-13: 600 → 同点なら最初の bestStart=10
    const r = findCoreTime(m)!
    expect(r.startHour).toBe(10)
    expect(r.endHour).toBe(12)
    expect(r.total).toBe(600)
  })

  it('明確に最大の 3 連続ウィンドウ', () => {
    const m = new Map<number, number>([
      [9, 50],
      [10, 100],
      [11, 200],
      [12, 500], // ピーク
      [13, 400],
      [14, 100],
    ])
    // 11-13: 200+500+400=1100 が最大
    expect(findCoreTime(m)).toEqual({ startHour: 11, endHour: 13, total: 1100 })
  })

  it('値が全 0 でも startHour=minHour で結果オブジェクト返す', () => {
    const m = new Map<number, number>([
      [10, 0],
      [11, 0],
      [12, 0],
    ])
    const r = findCoreTime(m)!
    expect(r.startHour).toBe(10)
    expect(r.total).toBe(0)
  })

  it('Zod schema に適合する', () => {
    const m = new Map<number, number>([[10, 100]])
    expect(CoreTimeResultSchema.safeParse(findCoreTime(m)).success).toBe(true)
    expect(CoreTimeResultSchema.safeParse(findCoreTime(new Map())).success).toBe(true)
  })
})

describe('findTurnaroundHour', () => {
  it('空 Map で null', () => {
    expect(findTurnaroundHour(new Map())).toBeNull()
  })

  it('全値 0 で null', () => {
    expect(findTurnaroundHour(new Map([[10, 0]]))).toBeNull()
  })

  it('単一時間帯の場合はその時間を返す', () => {
    expect(findTurnaroundHour(new Map([[10, 100]]))).toBe(10)
  })

  it('累積が 50% に到達する最初の時間を返す', () => {
    // total=400, half=200
    // 10:100 (cum 100) / 11:100 (cum 200, =half) → 11 で到達
    const m = new Map<number, number>([
      [10, 100],
      [11, 100],
      [12, 200],
    ])
    expect(findTurnaroundHour(m)).toBe(11)
  })

  it('時間順にソートされる（Map 挿入順に依存しない）', () => {
    const m = new Map<number, number>([
      [12, 100],
      [10, 50],
      [11, 50],
    ])
    // total=200, half=100, sorted: 10:50→11:50→12:100
    // cum 50, 100(=half) → 11
    expect(findTurnaroundHour(m)).toBe(11)
  })

  it('Zod schema に適合する', () => {
    expect(
      TurnaroundHourResultSchema.safeParse(findTurnaroundHour(new Map([[10, 100]]))).success,
    ).toBe(true)
    expect(TurnaroundHourResultSchema.safeParse(null).success).toBe(true)
  })
})

describe('buildHourlyMap', () => {
  it('空配列で空 Map', () => {
    expect(buildHourlyMap([]).size).toBe(0)
  })

  it('単一エントリを Map 化', () => {
    const m = buildHourlyMap([{ hour: 10, amount: 500 }])
    expect(m.get(10)).toBe(500)
  })

  it('同じ hour の重複を加算', () => {
    const m = buildHourlyMap([
      { hour: 10, amount: 100 },
      { hour: 10, amount: 200 },
      { hour: 10, amount: 50 },
    ])
    expect(m.get(10)).toBe(350)
  })

  it('複数 hour を独立に集約', () => {
    const m = buildHourlyMap([
      { hour: 10, amount: 100 },
      { hour: 11, amount: 200 },
      { hour: 10, amount: 50 },
    ])
    expect(m.get(10)).toBe(150)
    expect(m.get(11)).toBe(200)
  })
})
