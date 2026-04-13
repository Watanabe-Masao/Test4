/**
 * CategoryPerformanceChart.builders.ts — pure builder test
 *
 * 検証対象:
 * - curRecords 空 / totalCustomers=0 → 空配列
 * - PI値計算 (calculateAmountPI / calculateQuantityPI 経由)
 * - prev なし → prevPiAmount/prevPiQty=null
 * - 偏差値計算 (stdDev>0 時のみ)
 * - piAmount 降順ソート + topN 切り出し
 * - entry.name 空なら code fallback
 */
import { describe, it, expect } from 'vitest'
import { buildCategoryRows } from '../CategoryPerformanceChart.builders'
import type { LevelAggregationRow } from '@/application/queries/cts/LevelAggregationHandler'

function makeRow(code: string, amount: number, quantity: number, name?: string): LevelAggregationRow {
  return { code, name: name ?? code, amount, quantity } as unknown as LevelAggregationRow
}

describe('buildCategoryRows — 早期 return', () => {
  it('curRecords 空 → 空配列', () => {
    const result = buildCategoryRows([], null, 100, 0)
    expect(result).toEqual([])
  })

  it('totalCustomers=0 → 空配列', () => {
    const result = buildCategoryRows([makeRow('A', 100, 10)], null, 0, 0)
    expect(result).toEqual([])
  })

  it('totalCustomers=負 → 空配列', () => {
    const result = buildCategoryRows([makeRow('A', 100, 10)], null, -1, 0)
    expect(result).toEqual([])
  })
})

describe('buildCategoryRows — PI計算', () => {
  it('piAmount / piQty が計算される', () => {
    const result = buildCategoryRows([makeRow('A', 10000, 500)], null, 100, 0)
    expect(result).toHaveLength(1)
    // calculateAmountPI(10000, 100) = 10000/100*1000 = 100000
    expect(result[0].piAmount).toBe(100000)
    // calculateQuantityPI(500, 100) = 500/100*1000 = 5000
    expect(result[0].piQty).toBe(5000)
  })

  it('prev なし → prevPiAmount / prevPiQty が null', () => {
    const result = buildCategoryRows([makeRow('A', 10000, 500)], null, 100, 0)
    expect(result[0].prevPiAmount).toBeNull()
    expect(result[0].prevPiQty).toBeNull()
  })

  it('prevTotalCustomers=0 → prevPiAmount null', () => {
    const result = buildCategoryRows(
      [makeRow('A', 10000, 500)],
      [makeRow('A', 8000, 400)],
      100,
      0,
    )
    expect(result[0].prevPiAmount).toBeNull()
  })

  it('prev 有 + prevTotalCustomers>0 → prevPiAmount 計算', () => {
    const result = buildCategoryRows(
      [makeRow('A', 10000, 500)],
      [makeRow('A', 8000, 400)],
      100,
      80,
    )
    // prevPiAmount = 8000/80*1000 = 100000
    expect(result[0].prevPiAmount).toBe(100000)
    // prevPiQty = 400/80*1000 = 5000
    expect(result[0].prevPiQty).toBe(5000)
  })

  it('prev records に該当 code なし → null', () => {
    const result = buildCategoryRows(
      [makeRow('A', 10000, 500)],
      [makeRow('B', 8000, 400)],
      100,
      80,
    )
    expect(result[0].prevPiAmount).toBeNull()
  })
})

describe('buildCategoryRows — 偏差値', () => {
  it('全て同値 (stdDev=0) → deviation は null', () => {
    const result = buildCategoryRows(
      [makeRow('A', 10000, 100), makeRow('B', 10000, 100), makeRow('C', 10000, 100)],
      null,
      100,
      0,
    )
    // 全ての piAmount が同値なので stdDev=0
    expect(result[0].deviation).toBeNull()
    expect(result[0].qtyDeviation).toBeNull()
  })

  it('変動あり (stdDev>0) → deviation が toDevScore で計算', () => {
    const result = buildCategoryRows(
      [makeRow('A', 10000, 100), makeRow('B', 5000, 50), makeRow('C', 2000, 20)],
      null,
      100,
      0,
    )
    expect(result[0].deviation).not.toBeNull()
    // 最も高い piAmount の category が偏差値上位
    expect(result[0].deviation).toBeGreaterThan(50)
  })
})

describe('buildCategoryRows — ソート + topN', () => {
  it('piAmount 降順にソートされる', () => {
    const result = buildCategoryRows(
      [makeRow('A', 5000, 50), makeRow('B', 10000, 100), makeRow('C', 1000, 10)],
      null,
      100,
      0,
    )
    expect(result.map((r) => r.code)).toEqual(['B', 'A', 'C'])
  })

  it('topN で切り出される (default=20)', () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      makeRow(`C${i}`, (25 - i) * 1000, (25 - i) * 10),
    )
    const result = buildCategoryRows(rows, null, 100, 0)
    expect(result).toHaveLength(20)
  })

  it('topN=5 で 5 件のみ', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeRow(`C${i}`, (10 - i) * 1000, (10 - i) * 10),
    )
    const result = buildCategoryRows(rows, null, 100, 0, 5)
    expect(result).toHaveLength(5)
    expect(result[0].code).toBe('C0')
  })
})

describe('buildCategoryRows — name fallback', () => {
  it('entry.name が空なら code を name に使う', () => {
    const row: LevelAggregationRow = {
      code: 'X',
      name: '',
      amount: 1000,
      quantity: 10,
    } as unknown as LevelAggregationRow
    const result = buildCategoryRows([row], null, 100, 0)
    expect(result[0].name).toBe('X')
  })
})
