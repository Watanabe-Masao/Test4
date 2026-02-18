import { describe, it, expect } from 'vitest'
import { calculatePinIntervals } from './pinIntervals'
import type { DailyRecord } from '@/domain/models'

function makeDailyRecord(day: number, sales: number, purchaseCost: number): DailyRecord {
  return {
    day,
    sales,
    coreSales: sales,
    grossSales: sales,
    purchase: { cost: purchaseCost, price: purchaseCost * 1.3 },
    deliverySales: { cost: 0, price: 0 },
    interStoreIn: { cost: 0, price: 0 },
    interStoreOut: { cost: 0, price: 0 },
    interDepartmentIn: { cost: 0, price: 0 },
    interDepartmentOut: { cost: 0, price: 0 },
    flowers: { cost: 0, price: 0 },
    directProduce: { cost: 0, price: 0 },
    consumable: { cost: 0, items: [] },
    discountAmount: 0,
    discountAbsolute: 0,
    supplierBreakdown: new Map(),
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
  }
}

describe('calculatePinIntervals', () => {
  it('空のピンなら空配列', () => {
    const daily = new Map<number, DailyRecord>()
    expect(calculatePinIntervals(daily, 100000, [])).toEqual([])
  })

  it('単一ピンの区間計算', () => {
    const daily = new Map<number, DailyRecord>()
    daily.set(1, makeDailyRecord(1, 50000, 30000))
    daily.set(2, makeDailyRecord(2, 60000, 35000))

    // 期首在庫 100000, 2日目にピン (期末在庫 120000)
    const intervals = calculatePinIntervals(daily, 100000, [[2, 120000]])

    expect(intervals).toHaveLength(1)
    expect(intervals[0].startDay).toBe(1)
    expect(intervals[0].endDay).toBe(2)
    expect(intervals[0].openingInventory).toBe(100000)
    expect(intervals[0].closingInventory).toBe(120000)
    expect(intervals[0].totalSales).toBe(110000) // 50000 + 60000
    expect(intervals[0].totalPurchaseCost).toBe(65000) // 30000 + 35000
    // COGS = 100000 + 65000 - 120000 = 45000
    expect(intervals[0].cogs).toBe(45000)
    // 粗利 = 110000 - 45000 = 65000
    expect(intervals[0].grossProfit).toBe(65000)
    // 粗利率 = 65000 / 110000
    expect(intervals[0].grossProfitRate).toBeCloseTo(65000 / 110000)
  })

  it('複数ピンの連続区間計算', () => {
    const daily = new Map<number, DailyRecord>()
    daily.set(1, makeDailyRecord(1, 50000, 30000))
    daily.set(2, makeDailyRecord(2, 60000, 35000))
    daily.set(3, makeDailyRecord(3, 70000, 40000))

    // 2日目と3日目にピン
    const intervals = calculatePinIntervals(daily, 100000, [[2, 120000], [3, 130000]])

    expect(intervals).toHaveLength(2)

    // 第1区間: 1-2日
    expect(intervals[0].startDay).toBe(1)
    expect(intervals[0].endDay).toBe(2)
    expect(intervals[0].openingInventory).toBe(100000)
    expect(intervals[0].closingInventory).toBe(120000)

    // 第2区間: 3日 (前区間の期末在庫が期首になる)
    expect(intervals[1].startDay).toBe(3)
    expect(intervals[1].endDay).toBe(3)
    expect(intervals[1].openingInventory).toBe(120000) // 前区間の期末
    expect(intervals[1].closingInventory).toBe(130000)
    expect(intervals[1].totalSales).toBe(70000)
    expect(intervals[1].totalPurchaseCost).toBe(40000)
    // COGS = 120000 + 40000 - 130000 = 30000
    expect(intervals[1].cogs).toBe(30000)
  })

  it('期首在庫がnullの場合は0として扱う', () => {
    const daily = new Map<number, DailyRecord>()
    daily.set(1, makeDailyRecord(1, 50000, 30000))

    const intervals = calculatePinIntervals(daily, null, [[1, 20000]])

    expect(intervals[0].openingInventory).toBe(0)
    // COGS = 0 + 30000 - 20000 = 10000
    expect(intervals[0].cogs).toBe(10000)
  })

  it('売上がない区間の粗利率は0', () => {
    const daily = new Map<number, DailyRecord>()
    // データなし日のピン
    const intervals = calculatePinIntervals(daily, 100000, [[1, 100000]])

    expect(intervals[0].totalSales).toBe(0)
    expect(intervals[0].grossProfitRate).toBe(0)
  })
})
