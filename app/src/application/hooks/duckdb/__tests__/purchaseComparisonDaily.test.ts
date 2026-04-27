/**
 * purchaseComparisonDaily.ts — pure builder test
 *
 * 検証対象:
 * - buildDailyData:
 *   - curDaily / prevDaily を { day, cost, price, markup, sales } に変換
 *   - markup = price - cost
 *   - sales は curSalesDaily / prevSalesDaily から day 一致で解決
 *   - 日数一致が無い場合は sales=0
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildDailyData } from '../purchaseComparisonDaily'
import type { SalesDailyRow } from '@/infrastructure/duckdb/queries/purchaseComparison'

function makeSales(day: number, totalSales: number): SalesDailyRow {
  return { day, totalSales } as unknown as SalesDailyRow
}

describe('buildDailyData', () => {
  it('current: day / cost / price / markup / sales を構築', () => {
    const curDaily = [{ day: 1, totalCost: 100, totalPrice: 150 }]
    const prevDaily: [] = []
    const curSales = [makeSales(1, 1000)]
    const result = buildDailyData(curDaily, prevDaily, curSales, [])
    expect(result.current).toEqual([{ day: 1, cost: 100, price: 150, markup: 50, sales: 1000 }])
  })

  it('prev: 同構造で prevSales を解決', () => {
    const curDaily: [] = []
    const prevDaily = [{ day: 5, totalCost: 80, totalPrice: 120 }]
    const prevSales = [makeSales(5, 800)]
    const result = buildDailyData(curDaily, prevDaily, [], prevSales)
    expect(result.prev).toEqual([{ day: 5, cost: 80, price: 120, markup: 40, sales: 800 }])
  })

  it('sales day 一致なし → sales=0', () => {
    const curDaily = [{ day: 1, totalCost: 100, totalPrice: 150 }]
    const result = buildDailyData(curDaily, [], [makeSales(2, 500)], [])
    expect(result.current[0].sales).toBe(0)
  })

  it('markup = price - cost (赤字の場合は負)', () => {
    const curDaily = [{ day: 1, totalCost: 200, totalPrice: 150 }]
    const result = buildDailyData(curDaily, [], [], [])
    expect(result.current[0].markup).toBe(-50)
  })

  it('複数日の current/prev を独立に構築', () => {
    const curDaily = [
      { day: 1, totalCost: 100, totalPrice: 150 },
      { day: 2, totalCost: 200, totalPrice: 300 },
    ]
    const prevDaily = [{ day: 1, totalCost: 50, totalPrice: 80 }]
    const curSales = [makeSales(1, 1000), makeSales(2, 2000)]
    const prevSales = [makeSales(1, 500)]
    const result = buildDailyData(curDaily, prevDaily, curSales, prevSales)
    expect(result.current).toHaveLength(2)
    expect(result.current[0].sales).toBe(1000)
    expect(result.current[1].sales).toBe(2000)
    expect(result.prev).toHaveLength(1)
    expect(result.prev[0].sales).toBe(500)
  })

  it('空入力 → 空配列', () => {
    const result = buildDailyData([], [], [], [])
    expect(result.current).toEqual([])
    expect(result.prev).toEqual([])
  })
})
