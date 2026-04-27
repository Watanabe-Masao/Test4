/**
 * pinIntervalsWasm — normalizePinIntervalsInput / normalizePins tests
 *
 * adapter 関数の正規化動作を固定する（WASM 呼び出しは対象外）。
 *
 * @taxonomyKind T:fallback-path
 */
import { describe, it, expect } from 'vitest'
import { normalizePinIntervalsInput, normalizePins } from '../pinIntervalsWasm'
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

describe('normalizePinIntervalsInput', () => {
  it('空 Map で全日 0 埋めの Float64Array', () => {
    const r = normalizePinIntervalsInput(new Map(), 5)
    expect(r.dailySales).toBeInstanceOf(Float64Array)
    expect(r.dailySales.length).toBe(5)
    expect([...r.dailySales]).toEqual([0, 0, 0, 0, 0])
    expect([...r.dailyTotalCost]).toEqual([0, 0, 0, 0, 0])
  })

  it('単一 day を正しい index (day-1) に配置', () => {
    const daily = new Map<number, DailyRecord>([[3, rec(3, 500, 200)]])
    const r = normalizePinIntervalsInput(daily, 5)
    expect(r.dailySales[0]).toBe(0)
    expect(r.dailySales[1]).toBe(0)
    expect(r.dailySales[2]).toBe(500) // index 2 = day 3
    expect(r.dailyTotalCost[2]).toBe(200)
  })

  it('複数 day を全て反映', () => {
    const daily = new Map<number, DailyRecord>([
      [1, rec(1, 100, 50)],
      [2, rec(2, 200, 80)],
      [3, rec(3, 300, 120)],
    ])
    const r = normalizePinIntervalsInput(daily, 3)
    expect([...r.dailySales]).toEqual([100, 200, 300])
    expect([...r.dailyTotalCost]).toEqual([50, 80, 120])
  })

  it('daysInMonth > entry 数でも残り日は 0 埋め', () => {
    const daily = new Map<number, DailyRecord>([[1, rec(1, 100, 50)]])
    const r = normalizePinIntervalsInput(daily, 5)
    expect(r.dailySales[0]).toBe(100)
    expect([...r.dailySales.slice(1)]).toEqual([0, 0, 0, 0])
  })

  it('daysInMonth=0 で空配列', () => {
    const r = normalizePinIntervalsInput(new Map(), 0)
    expect(r.dailySales.length).toBe(0)
    expect(r.dailyTotalCost.length).toBe(0)
  })
})

describe('normalizePins', () => {
  it('空配列で空 Int32Array / Float64Array', () => {
    const r = normalizePins([])
    expect(r.pinDays).toBeInstanceOf(Int32Array)
    expect(r.pinClosingInventory).toBeInstanceOf(Float64Array)
    expect(r.pinDays.length).toBe(0)
  })

  it('[day, closingInv] を 2 配列に分離', () => {
    const pins: [number, number][] = [
      [5, 1000],
      [15, 2000],
      [30, 3000],
    ]
    const r = normalizePins(pins)
    expect([...r.pinDays]).toEqual([5, 15, 30])
    expect([...r.pinClosingInventory]).toEqual([1000, 2000, 3000])
  })

  it('単一 pin', () => {
    const r = normalizePins([[31, 5000]])
    expect([...r.pinDays]).toEqual([31])
    expect([...r.pinClosingInventory]).toEqual([5000])
  })

  it('順序は入力順を保つ', () => {
    const r = normalizePins([
      [10, 100],
      [5, 200],
      [20, 300],
    ])
    expect([...r.pinDays]).toEqual([10, 5, 20])
  })
})
