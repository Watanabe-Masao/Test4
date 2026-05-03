/**
 * FactorDecompositionPanel — pure helper tests
 *
 * 検証対象:
 * - aggregateByDay: rows を day キーで集約（sales / customers / totalQty を合算）
 * - buildDailyDecomp: cur/prev rows と level から日別要因分解結果を構築
 *
 * 注: buildDailyDecomp は domain/calculations/factorDecomposition の
 * decompose2 / decompose3 に依存する。本関数自体は presentation だが、
 * 「日別要因分解の合成」は業務概念なので将来 domain に昇格する候補。
 * 詳細: projects/active/presentation-quality-hardening/HANDOFF.md §1.5
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  aggregateByDay,
  buildDailyDecomp,
  type DayAgg,
  type DailyDecomp,
} from '../FactorDecompositionPanel'

type Row = { day: number; sales: number; customers: number; totalQuantity: number }

describe('aggregateByDay', () => {
  it('空配列で空 Map', () => {
    expect(aggregateByDay([]).size).toBe(0)
  })

  it('単一行をそのまま day キーに格納', () => {
    const m = aggregateByDay([{ day: 1, sales: 100, customers: 10, totalQuantity: 5 }])
    expect(m.size).toBe(1)
    expect(m.get(1)).toEqual({ sales: 100, customers: 10, totalQty: 5 })
  })

  it('同じ day を複数 rows で合算する', () => {
    const m = aggregateByDay([
      { day: 1, sales: 100, customers: 10, totalQuantity: 5 },
      { day: 1, sales: 200, customers: 20, totalQuantity: 8 },
      { day: 1, sales: 50, customers: 5, totalQuantity: 2 },
    ])
    expect(m.get(1)).toEqual({ sales: 350, customers: 35, totalQty: 15 })
  })

  it('複数 day を独立に集約', () => {
    const m = aggregateByDay([
      { day: 1, sales: 100, customers: 10, totalQuantity: 5 },
      { day: 2, sales: 200, customers: 20, totalQuantity: 8 },
      { day: 1, sales: 50, customers: 5, totalQuantity: 2 },
    ])
    expect(m.get(1)).toEqual({ sales: 150, customers: 15, totalQty: 7 })
    expect(m.get(2)).toEqual({ sales: 200, customers: 20, totalQty: 8 })
  })

  it('totalQuantity → totalQty にリネーム保持', () => {
    const m = aggregateByDay([{ day: 1, sales: 0, customers: 0, totalQuantity: 42 }])
    const e = m.get(1) as DayAgg
    expect(e.totalQty).toBe(42)
    expect((e as unknown as { totalQuantity?: number }).totalQuantity).toBeUndefined()
  })
})

describe('buildDailyDecomp', () => {
  const cur: Row[] = [
    { day: 1, sales: 1000, customers: 100, totalQuantity: 50 },
    { day: 2, sales: 1200, customers: 110, totalQuantity: 55 },
    { day: 3, sales: 0, customers: 0, totalQuantity: 0 }, // 当年 0 → 除外
  ]
  const prev: Row[] = [
    { day: 1, sales: 800, customers: 80, totalQuantity: 40 },
    { day: 2, sales: 1100, customers: 100, totalQuantity: 50 },
  ]

  it('当年 sales=0 の day は除外される', () => {
    const result = buildDailyDecomp(cur, prev, 2)
    expect(result.map((r) => r.day)).toEqual([1, 2])
  })

  it('day は昇順ソート', () => {
    const unsorted: Row[] = [
      { day: 5, sales: 100, customers: 10, totalQuantity: 5 },
      { day: 1, sales: 200, customers: 20, totalQuantity: 10 },
      { day: 3, sales: 150, customers: 15, totalQuantity: 8 },
    ]
    const result = buildDailyDecomp(unsorted, [], 2)
    expect(result.map((r) => r.day)).toEqual([1, 3, 5])
  })

  it('level=2: 客数効果 + 客単価効果の 2 因子', () => {
    const result = buildDailyDecomp(cur, prev, 2)
    expect(result[0].factors.map((f) => f.name)).toEqual(['客数効果', '客単価効果'])
  })

  it('level=3 + totalQty>0: 客数 + 点数 + 商品単価の 3 因子', () => {
    const result = buildDailyDecomp(cur, prev, 3)
    expect(result[0].factors.map((f) => f.name)).toEqual(['客数効果', '点数効果', '商品単価効果'])
  })

  it('level=3 だが prev.totalQty=0 なら level=2 に fallback', () => {
    const prev0: Row[] = [{ day: 1, sales: 800, customers: 80, totalQuantity: 0 }]
    const result = buildDailyDecomp(cur, prev0, 3)
    expect(result[0].factors.map((f) => f.name)).toEqual(['客数効果', '客単価効果'])
  })

  it('diff = cur.sales - prev.sales、cumDiff は累積', () => {
    const result = buildDailyDecomp(cur, prev, 2)
    expect(result[0].diff).toBe(200) // 1000 - 800
    expect(result[1].diff).toBe(100) // 1200 - 1100
    expect(result[1].cumDiff).toBe(300) // 200 + 100
  })

  it('前年に該当 day がなければ prev=0 として扱う', () => {
    const result = buildDailyDecomp(cur, [], 2)
    expect(result[0].diff).toBe(1000) // 1000 - 0
  })

  it('要因合計 ≈ diff（数学的不変条件）', () => {
    const result = buildDailyDecomp(cur, prev, 2)
    for (const r of result) {
      const sum = r.factors.reduce((s, f) => s + f.value, 0)
      expect(sum).toBeCloseTo(r.diff, 6)
    }
  })

  it('cur 空配列で空結果', () => {
    expect(buildDailyDecomp([], prev, 2)).toEqual<readonly DailyDecomp[]>([])
  })
})
