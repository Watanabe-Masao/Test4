/**
 * PerformanceIndexChart.builders.ts — buildPerformanceData pure function test
 *
 * 検証対象 branch:
 * - 日次ループ内の条件分岐: customers>0 / grossSales>0 / sales>0
 * - prev year lookup: prev 有無 / prevCustomers>0 / prevCtsQty>0
 * - dailyQuantity 有無: qtyPi 計算経路
 * - stdDev=0 時の salesZ/custZ/txZ/discZ/gpZ: null 分岐
 * - salesDev / custDev 等 toDevScore 変換
 * - piMa7 partial MA: ウィンドウ不足時の段階的平均
 * - chartData.length === daysInMonth 契約
 */
import { describe, it, expect } from 'vitest'
import { buildPerformanceData } from '../PerformanceIndexChart.builders'
import type { DailyRecord } from '@/domain/models/record'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'

/**
 * 最小 DailyRecord を作成する helper
 * PerformanceIndexChart が参照するのは sales / grossSales / customers /
 * discountAbsolute / totalCost / costInclusion.cost のみ
 */
function makeRec(
  overrides: {
    sales?: number
    grossSales?: number
    customers?: number
    discountAbsolute?: number
    totalCost?: number
    costInclusionCost?: number
  } = {},
): DailyRecord {
  return {
    day: 1,
    sales: overrides.sales ?? 0,
    grossSales: overrides.grossSales ?? overrides.sales ?? 0,
    customers: overrides.customers ?? 0,
    discountAbsolute: overrides.discountAbsolute ?? 0,
    totalCost: overrides.totalCost ?? 0,
    costInclusion: {
      cost: overrides.costInclusionCost ?? 0,
      items: [],
    },
  } as unknown as DailyRecord
}

describe('buildPerformanceData — 基本契約', () => {
  it('空 daily map でも daysInMonth 分の row を返す', () => {
    const result = buildPerformanceData(new Map(), 30, 2026, 4, new Map(), undefined)
    expect(result.chartData.length).toBe(30)
    // stdDev=0 → Z は null
    expect(result.chartData[0].salesZ).toBeNull()
    expect(result.chartData[0].custZ).toBeNull()
  })

  it('daysInMonth に応じた row 数 (31日)', () => {
    const result = buildPerformanceData(new Map(), 31, 2026, 1, new Map())
    expect(result.chartData.length).toBe(31)
    expect(result.chartData[30].day).toBe(31)
  })

  it('daysInMonth=28 (2月) で 28 row', () => {
    const result = buildPerformanceData(new Map(), 28, 2026, 2, new Map())
    expect(result.chartData.length).toBe(28)
  })
})

describe('buildPerformanceData — customers>0 分岐', () => {
  it('customers>0: pi / txValue が計算される', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeRec({ sales: 10000, customers: 100, grossSales: 10000 })],
    ])
    const result = buildPerformanceData(daily, 1, 2026, 4, new Map())
    const row = result.chartData[0]
    expect(row.pi).not.toBeNull()
    expect(row.txValue).not.toBeNull()
    // PI = sales / customers * 1000 = 100 * 1000 = 100000
    expect(row.pi).toBeCloseTo(100000, 0)
    expect(row.txValue).toBeCloseTo(100, 0)
  })

  it('customers=0: pi / txValue / qtyPi が null', () => {
    const daily = new Map<number, DailyRecord>([[1, makeRec({ sales: 10000, customers: 0 })]])
    const result = buildPerformanceData(daily, 1, 2026, 4, new Map(), new Map([[1, 50]]))
    expect(result.chartData[0].pi).toBeNull()
    expect(result.chartData[0].txValue).toBeNull()
    expect(result.chartData[0].qtyPi).toBeNull()
  })
})

describe('buildPerformanceData — dailyQuantity (qtyPi)', () => {
  it('qty>0 && customers>0: qtyPi が計算される', () => {
    const daily = new Map<number, DailyRecord>([[1, makeRec({ sales: 10000, customers: 100 })]])
    const dailyQty = new Map<number, number>([[1, 500]])
    const result = buildPerformanceData(daily, 1, 2026, 4, new Map(), dailyQty)
    expect(result.chartData[0].qtyPi).not.toBeNull()
  })

  it('qty=0: qtyPi は null', () => {
    const daily = new Map<number, DailyRecord>([[1, makeRec({ sales: 10000, customers: 100 })]])
    const dailyQty = new Map<number, number>([[1, 0]])
    const result = buildPerformanceData(daily, 1, 2026, 4, new Map(), dailyQty)
    expect(result.chartData[0].qtyPi).toBeNull()
  })

  it('dailyQuantity 未指定: qtyPi は null', () => {
    const daily = new Map<number, DailyRecord>([[1, makeRec({ sales: 10000, customers: 100 })]])
    const result = buildPerformanceData(daily, 1, 2026, 4, new Map())
    expect(result.chartData[0].qtyPi).toBeNull()
  })
})

describe('buildPerformanceData — prev year', () => {
  it('prev 有 && customers>0: prevPi が計算される', () => {
    const daily = new Map<number, DailyRecord>([[1, makeRec({ sales: 10000, customers: 100 })]])
    const prev = new Map<
      string,
      { sales: number; discount: number; customers?: number; ctsQuantity?: number }
    >([[toDateKeyFromParts(2026, 4, 1), { sales: 8000, discount: 0, customers: 80 }]])
    const result = buildPerformanceData(daily, 1, 2026, 4, prev)
    // prevPi = 8000 / 80 * 1000 = 100000
    expect(result.chartData[0].prevPi).toBeCloseTo(100000, 0)
  })

  it('prev なし: prevPi / prevQtyPi は null', () => {
    const daily = new Map<number, DailyRecord>([[1, makeRec({ sales: 10000, customers: 100 })]])
    const result = buildPerformanceData(daily, 1, 2026, 4, new Map())
    expect(result.chartData[0].prevPi).toBeNull()
    expect(result.chartData[0].prevQtyPi).toBeNull()
  })

  it('prev.customers=0: prevPi は null', () => {
    const daily = new Map<number, DailyRecord>([[1, makeRec({ sales: 10000, customers: 100 })]])
    const prev = new Map([
      [toDateKeyFromParts(2026, 4, 1), { sales: 8000, discount: 0, customers: 0 }],
    ])
    const result = buildPerformanceData(daily, 1, 2026, 4, prev)
    expect(result.chartData[0].prevPi).toBeNull()
  })

  it('prev.ctsQuantity 有: prevQtyPi が計算される', () => {
    const daily = new Map<number, DailyRecord>([[1, makeRec({ sales: 10000, customers: 100 })]])
    const prev = new Map([
      [
        toDateKeyFromParts(2026, 4, 1),
        { sales: 8000, discount: 0, customers: 80, ctsQuantity: 240 },
      ],
    ])
    const result = buildPerformanceData(daily, 1, 2026, 4, prev)
    expect(result.chartData[0].prevQtyPi).not.toBeNull()
  })
})

describe('buildPerformanceData — stats / Z 計算', () => {
  it('変動のあるデータで stdDev>0 → Z が計算される', () => {
    const daily = new Map<number, DailyRecord>()
    for (let d = 1; d <= 7; d++) {
      daily.set(d, makeRec({ sales: 1000 * d, customers: 10 * d, grossSales: 1000 * d }))
    }
    const result = buildPerformanceData(daily, 7, 2026, 4, new Map())
    // 変動のあるデータなので salesZ / custZ が計算される
    const validZ = result.chartData.filter((r) => r.salesZ != null)
    expect(validZ.length).toBeGreaterThan(0)
    // salesDev = toDevScore(salesZ)
    expect(result.chartData[6].salesDev).not.toBeNull()
  })

  it('stats が 5 カテゴリ返される', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeRec({ sales: 1000, customers: 10, grossSales: 1000 })],
      [2, makeRec({ sales: 2000, customers: 20, grossSales: 2000 })],
    ])
    const result = buildPerformanceData(daily, 2, 2026, 4, new Map())
    expect(result.stats.sales).toBeDefined()
    expect(result.stats.cust).toBeDefined()
    expect(result.stats.tx).toBeDefined()
    expect(result.stats.disc).toBeDefined()
    expect(result.stats.gp).toBeDefined()
    expect(result.stats.sales.mean).toBeCloseTo(1500, 0)
  })
})

describe('buildPerformanceData — piMa7 partial MA', () => {
  it('ウィンドウ不足 (1 日目) でも partial MA を計算', () => {
    const daily = new Map<number, DailyRecord>([[1, makeRec({ sales: 1000, customers: 10 })]])
    const result = buildPerformanceData(daily, 1, 2026, 4, new Map())
    // 1日分でも null ではなく平均値を返す
    expect(result.piMa7[0]).not.toBeNull()
    // PI = 1000/10*1000 = 100000
    expect(result.piMa7[0]).toBeCloseTo(100000, 0)
  })

  it('全日 sales=0 なら piMa7 は全 null', () => {
    const daily = new Map<number, DailyRecord>()
    const result = buildPerformanceData(daily, 5, 2026, 4, new Map())
    expect(result.piMa7.every((v) => v === null)).toBe(true)
  })

  it('piMa7 / prevPiMa7 / qtyPiMa7 / prevQtyPiMa7 の 4 系列を返す', () => {
    const daily = new Map<number, DailyRecord>([[1, makeRec({ sales: 1000, customers: 10 })]])
    const result = buildPerformanceData(daily, 1, 2026, 4, new Map())
    expect(result.piMa7).toHaveLength(1)
    expect(result.prevPiMa7).toHaveLength(1)
    expect(result.qtyPiMa7).toHaveLength(1)
    expect(result.prevQtyPiMa7).toHaveLength(1)
  })
})

describe('buildPerformanceData — discount / gp rate', () => {
  it('grossSales>0: discountRate が計算される', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeRec({ sales: 9000, grossSales: 10000, discountAbsolute: 1000, customers: 10 })],
    ])
    const result = buildPerformanceData(daily, 1, 2026, 4, new Map())
    expect(result.chartData[0].discountRate).toBeCloseTo(0.1, 2)
  })

  it('grossSales=0: discountRate=0', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeRec({ sales: 0, grossSales: 0, discountAbsolute: 0 })],
    ])
    const result = buildPerformanceData(daily, 1, 2026, 4, new Map())
    expect(result.chartData[0].discountRate).toBe(0)
  })

  it('sales>0: gpRate が計算される', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeRec({ sales: 10000, totalCost: 7000, customers: 10 })],
    ])
    const result = buildPerformanceData(daily, 1, 2026, 4, new Map())
    // gpRate = (10000 - 7000 - 0) / 10000 = 0.3
    expect(result.chartData[0].gpRate).toBeCloseTo(0.3, 2)
  })
})
