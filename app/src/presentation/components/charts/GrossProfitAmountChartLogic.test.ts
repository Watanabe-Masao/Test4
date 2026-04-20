/**
 * GrossProfitAmountChartLogic — buildGpData テスト
 *
 * 検証対象:
 * - 当期 daily の累計売上 / 累計原価 / 累計粗利率
 * - 前年 daily + 前年原価 map を両方渡した場合の prevRate 算出
 * - 前年データが片方でも欠けると prevRate=null / hasComparison=false
 * - 前年売上=0 の初期区間で prevRate=null
 */
import { describe, it, expect } from 'vitest'
import { buildGpData } from './GrossProfitAmountChartLogic'
import type { DailyRecord } from '@/domain/models/record'

const YEAR = 2026
const MONTH = 3

function daily(
  entries: readonly [number, { sales: number; totalCost: number }][],
): ReadonlyMap<number, DailyRecord> {
  return new Map(entries.map(([d, v]) => [d, { ...v, day: d } as unknown as DailyRecord]))
}

function prevDaily(entries: readonly [number, number][]): ReadonlyMap<string, { sales: number }> {
  const dd = (d: number) => String(d).padStart(2, '0')
  const mm = String(MONTH).padStart(2, '0')
  return new Map(entries.map(([d, sales]) => [`${YEAR}-${mm}-${dd(d)}`, { sales }]))
}

describe('buildGpData', () => {
  it('daysInMonth 分の points を昇順で生成する', () => {
    const result = buildGpData(new Map(), 31, YEAR, MONTH)
    expect(result.points).toHaveLength(31)
    expect(result.points[0].day).toBe(1)
    expect(result.points[30].day).toBe(31)
  })

  it('当期の売上・原価を日別に累積する（粗利 = cumSales - cumCost）', () => {
    const cur = daily([
      [1, { sales: 100, totalCost: 60 }],
      [2, { sales: 200, totalCost: 140 }],
      [3, { sales: 300, totalCost: 180 }],
    ])
    const result = buildGpData(cur, 3, YEAR, MONTH)
    expect(result.points[0].grossProfit).toBe(40) // 100 - 60
    expect(result.points[1].grossProfit).toBe(100) // 300 - 200
    expect(result.points[2].grossProfit).toBe(220) // 600 - 380
  })

  it('累計粗利率 = grossProfit / cumSales（売上 0 のとき 0）', () => {
    const cur = daily([[1, { sales: 1000, totalCost: 700 }]])
    const result = buildGpData(cur, 2, YEAR, MONTH)
    expect(result.points[0].rate).toBeCloseTo(0.3, 10) // 300/1000
    expect(result.points[1].rate).toBeCloseTo(0.3, 10) // cumSales=1000 のまま（day2 は rec なし）
  })

  it('売上データがない日は累計を引き継ぐ', () => {
    const cur = daily([
      [1, { sales: 100, totalCost: 60 }],
      [3, { sales: 200, totalCost: 120 }],
    ])
    const result = buildGpData(cur, 3, YEAR, MONTH)
    expect(result.points.map((p) => p.grossProfit)).toEqual([40, 40, 120])
  })

  it('前年 daily + cost map が両方あるとき prevRate を算出する', () => {
    const cur = daily([[1, { sales: 100, totalCost: 60 }]])
    const prev = prevDaily([
      [1, 80],
      [2, 120],
    ])
    const prevCost = new Map<number, number>([
      [1, 48],
      [2, 72],
    ])
    const result = buildGpData(cur, 2, YEAR, MONTH, prev, prevCost)
    // day 1: prev 売上 80 / 原価 48 → rate = 32/80 = 0.4
    expect(result.points[0].prevRate).toBeCloseTo(0.4, 10)
    // day 2: cum 前年売上 200 / 原価 120 → rate = 80/200 = 0.4
    expect(result.points[1].prevRate).toBeCloseTo(0.4, 10)
    expect(result.flags?.hasComparison).toBe(true)
  })

  it('前年売上累計 0 の間は prevRate=null（division-by-zero ガード）', () => {
    const prev = prevDaily([[3, 100]])
    const prevCost = new Map<number, number>([[3, 60]])
    const result = buildGpData(new Map(), 3, YEAR, MONTH, prev, prevCost)
    expect(result.points[0].prevRate).toBeNull()
    expect(result.points[1].prevRate).toBeNull()
    expect(result.points[2].prevRate).toBeCloseTo(0.4, 10)
  })

  it('前年 daily がなければ hasComparison=false / prevRate=null', () => {
    const cur = daily([[1, { sales: 100, totalCost: 60 }]])
    const result = buildGpData(cur, 1, YEAR, MONTH)
    expect(result.flags?.hasComparison).toBe(false)
    expect(result.points[0].prevRate).toBeNull()
  })

  it('前年 daily のみ（cost map なし）でも hasComparison=false', () => {
    const cur = daily([[1, { sales: 100, totalCost: 60 }]])
    const prev = prevDaily([[1, 80]])
    const result = buildGpData(cur, 1, YEAR, MONTH, prev)
    expect(result.flags?.hasComparison).toBe(false)
    expect(result.points[0].prevRate).toBeNull()
  })

  it('前年 cost map のみ（daily なし）でも hasComparison=false', () => {
    const cur = daily([[1, { sales: 100, totalCost: 60 }]])
    const prevCost = new Map<number, number>([[1, 50]])
    const result = buildGpData(cur, 1, YEAR, MONTH, undefined, prevCost)
    expect(result.flags?.hasComparison).toBe(false)
  })
})
