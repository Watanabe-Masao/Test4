/**
 * PurchaseVsSalesChart — pure helper tests
 *
 * 検証対象:
 * - buildSalesVsCostData: 当年 daily から日別 + 累計 + 原価率データを構築
 * - fmtYen: 1K/1M スケールの簡易フォーマッタ
 *
 * 注: buildSalesVsCostData の cumulative + costToSalesRatio は業務指標
 * （原価率の累積分析）。将来 domain/calculations に昇格する候補。
 * 詳細: projects/presentation-quality-hardening/HANDOFF.md §1.5
 */
import { describe, it, expect } from 'vitest'
import { buildSalesVsCostData, fmtYen } from '../PurchaseVsSalesChart'
import type { PurchaseDailyData } from '@/domain/models/PurchaseComparison'

function mk(current: { day: number; sales: number; cost: number }[]): PurchaseDailyData {
  return { current, prev: [] } as unknown as PurchaseDailyData
}

describe('buildSalesVsCostData', () => {
  it('空データで空配列', () => {
    expect(buildSalesVsCostData(mk([]))).toEqual([])
  })

  it('単日データ: cum = day 値、ratio = cost/sales', () => {
    const r = buildSalesVsCostData(mk([{ day: 1, sales: 1000, cost: 600 }]))
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({
      day: '1日',
      sales: 1000,
      cost: 600,
      cumSales: 1000,
      cumCost: 600,
      cumDiff: 400,
      costToSalesRatio: 60.0, // (600/1000)*100 → 60.00%
    })
  })

  it('複数日: 累計が積み上がる', () => {
    const r = buildSalesVsCostData(
      mk([
        { day: 1, sales: 1000, cost: 600 },
        { day: 2, sales: 2000, cost: 1200 },
        { day: 3, sales: 1500, cost: 900 },
      ]),
    )
    expect(r[0].cumSales).toBe(1000)
    expect(r[1].cumSales).toBe(3000)
    expect(r[2].cumSales).toBe(4500)
    expect(r[0].cumCost).toBe(600)
    expect(r[1].cumCost).toBe(1800)
    expect(r[2].cumCost).toBe(2700)
  })

  it('cumDiff = cumSales - cumCost', () => {
    const r = buildSalesVsCostData(
      mk([
        { day: 1, sales: 1000, cost: 600 },
        { day: 2, sales: 2000, cost: 1200 },
      ]),
    )
    expect(r[1].cumDiff).toBe(1200) // 3000 - 1800
  })

  it('costToSalesRatio は累計ベース（小数第2位、% 表記）', () => {
    const r = buildSalesVsCostData(
      mk([
        { day: 1, sales: 1000, cost: 700 }, // 70.00%
        { day: 2, sales: 1000, cost: 500 }, // 累計 1200/2000 = 60.00%
      ]),
    )
    expect(r[0].costToSalesRatio).toBe(70)
    expect(r[1].costToSalesRatio).toBe(60)
  })

  it('cumSales=0 の場合 costToSalesRatio=0（division-by-zero ガード）', () => {
    const r = buildSalesVsCostData(mk([{ day: 1, sales: 0, cost: 0 }]))
    expect(r[0].costToSalesRatio).toBe(0)
  })

  it('day は昇順ソートされる', () => {
    const r = buildSalesVsCostData(
      mk([
        { day: 3, sales: 100, cost: 50 },
        { day: 1, sales: 200, cost: 100 },
        { day: 2, sales: 150, cost: 80 },
      ]),
    )
    expect(r.map((p) => p.day)).toEqual(['1日', '2日', '3日'])
  })

  it('sales/cost は Math.round で整数化', () => {
    const r = buildSalesVsCostData(mk([{ day: 1, sales: 1234.7, cost: 567.4 }]))
    expect(r[0].sales).toBe(1235)
    expect(r[0].cost).toBe(567)
  })
})

describe('fmtYen', () => {
  it('1000 未満はそのまま', () => {
    expect(fmtYen(0)).toBe('0')
    expect(fmtYen(123)).toBe('123')
    expect(fmtYen(999)).toBe('999')
  })

  it('1K-999K は K 表記（小数なし）', () => {
    expect(fmtYen(1000)).toBe('1K')
    expect(fmtYen(1500)).toBe('2K') // 1500/1000=1.5 → toFixed(0) → 2
    expect(fmtYen(123456)).toBe('123K')
    expect(fmtYen(999999)).toBe('1000K') // 999999/1000=999.999 → toFixed(0) → 1000
  })

  it('1M 以上は M 表記（小数第1位）', () => {
    expect(fmtYen(1_000_000)).toBe('1.0M')
    expect(fmtYen(1_500_000)).toBe('1.5M')
    expect(fmtYen(12_345_678)).toBe('12.3M')
  })

  it('負値も abs 判定（K/M 適用、sign 保持）', () => {
    expect(fmtYen(-2000)).toBe('-2K')
    expect(fmtYen(-2_000_000)).toBe('-2.0M')
  })

  it('|v|<1000 の負値はそのまま String(v)', () => {
    expect(fmtYen(-500)).toBe('-500')
  })
})
