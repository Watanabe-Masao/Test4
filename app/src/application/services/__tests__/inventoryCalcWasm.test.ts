/**
 * inventoryCalcWasm — normalizeInventoryCalcInput tests
 *
 * ReadonlyMap<DailyRecord> → 6 Float64Array への正規化を固定する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { normalizeInventoryCalcInput } from '../inventoryCalcWasm'
import type { DailyRecord } from '@/domain/models/record'

function rec(day: number, overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    day,
    sales: 0,
    purchase: { cost: 0, price: 0 },
    interStoreIn: { cost: 0, price: 0 },
    interStoreOut: { cost: 0, price: 0 },
    interDepartmentIn: { cost: 0, price: 0 },
    interDepartmentOut: { cost: 0, price: 0 },
    flowers: { cost: 0, price: 0 },
    directProduce: { cost: 0, price: 0 },
    costInclusion: { cost: 0, items: [] },
    discountAmount: 0,
    discountEntries: [],
    supplierBreakdown: new Map(),
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
    coreSales: 0,
    grossSales: 0,
    totalCost: 0,
    deliverySales: { cost: 0, price: 0 },
    discountAbsolute: 0,
    ...overrides,
  } as unknown as DailyRecord
}

describe('normalizeInventoryCalcInput', () => {
  it('空 Map で全配列 0 埋め', () => {
    const r = normalizeInventoryCalcInput(new Map(), 5)
    expect(r.dailySales.length).toBe(5)
    expect([...r.dailySales]).toEqual([0, 0, 0, 0, 0])
    expect([...r.dailyFlowersPrice]).toEqual([0, 0, 0, 0, 0])
    expect([...r.dailyCostInclusionCost]).toEqual([0, 0, 0, 0, 0])
  })

  it('6 配列の長さが全て daysInMonth', () => {
    const r = normalizeInventoryCalcInput(new Map(), 10)
    expect(r.dailySales.length).toBe(10)
    expect(r.dailyFlowersPrice.length).toBe(10)
    expect(r.dailyDirectProducePrice.length).toBe(10)
    expect(r.dailyCostInclusionCost.length).toBe(10)
    expect(r.dailyTotalCost.length).toBe(10)
    expect(r.dailyDeliverySalesCost.length).toBe(10)
  })

  it('全て Float64Array', () => {
    const r = normalizeInventoryCalcInput(new Map(), 5)
    expect(r.dailySales).toBeInstanceOf(Float64Array)
    expect(r.dailyFlowersPrice).toBeInstanceOf(Float64Array)
    expect(r.dailyDirectProducePrice).toBeInstanceOf(Float64Array)
    expect(r.dailyCostInclusionCost).toBeInstanceOf(Float64Array)
    expect(r.dailyTotalCost).toBeInstanceOf(Float64Array)
    expect(r.dailyDeliverySalesCost).toBeInstanceOf(Float64Array)
  })

  it('day フィールドを正しい index に配置', () => {
    const daily = new Map<number, DailyRecord>([[2, rec(2, { sales: 500 })]])
    const r = normalizeInventoryCalcInput(daily, 5)
    expect(r.dailySales[0]).toBe(0)
    expect(r.dailySales[1]).toBe(500) // day 2 → index 1
    expect(r.dailySales[2]).toBe(0)
  })

  it('flowers.price / directProduce.price を取得', () => {
    const daily = new Map<number, DailyRecord>([
      [
        1,
        rec(1, {
          flowers: { cost: 100, price: 200 },
          directProduce: { cost: 50, price: 90 },
        }),
      ],
    ])
    const r = normalizeInventoryCalcInput(daily, 3)
    expect(r.dailyFlowersPrice[0]).toBe(200)
    expect(r.dailyDirectProducePrice[0]).toBe(90)
  })

  it('deliverySales.cost を取得', () => {
    const daily = new Map<number, DailyRecord>([
      [1, rec(1, { deliverySales: { cost: 150, price: 0 } })],
    ])
    const r = normalizeInventoryCalcInput(daily, 2)
    expect(r.dailyDeliverySalesCost[0]).toBe(150)
  })

  it('daysInMonth=0 で全配列 空', () => {
    const r = normalizeInventoryCalcInput(new Map(), 0)
    expect(r.dailySales.length).toBe(0)
    expect(r.dailyTotalCost.length).toBe(0)
  })
})
