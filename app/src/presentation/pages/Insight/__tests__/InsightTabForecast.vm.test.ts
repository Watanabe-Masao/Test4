/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  computeDecompPct,
  computeWeeklyActuals,
  computeDecompTotals,
} from '../InsightTabForecast.vm'
import type { DailyRecord } from '@/domain/models/record'

describe('computeDecompPct', () => {
  it('正の効果のみ → 絶対寄与率', () => {
    expect(computeDecompPct(100, 50)).toBeCloseTo(100 / 150)
  })

  it('custEffect=100, ticketEffect=-100 → 除算エラーにならない', () => {
    // 以前のバグ: custEffect + ticketEffect = 0 で Infinity
    const result = computeDecompPct(100, -100)
    expect(Number.isFinite(result)).toBe(true)
    expect(result).toBeCloseTo(0.5) // |100| / (|100| + |-100|)
  })

  it('両方ゼロ → 0', () => {
    expect(computeDecompPct(0, 0)).toBe(0)
  })

  it('custEffect=0, ticketEffect=100 → 0', () => {
    expect(computeDecompPct(0, 100)).toBe(0)
  })

  it('負値のみ → 絶対値で計算', () => {
    expect(computeDecompPct(-200, -100)).toBeCloseTo(200 / 300)
  })

  // Phase 3 Step 3-3 で追加された contract test
  it('custEffect=100, ticketEffect=0 のとき寄与率 1.0 (custEffect が全寄与)', () => {
    expect(computeDecompPct(100, 0)).toBeCloseTo(1.0)
  })

  it('正負混在: custEffect=正, ticketEffect=負 でも絶対値ベース', () => {
    // |200| / (|200| + |-50|) = 200 / 250 = 0.8
    expect(computeDecompPct(200, -50)).toBeCloseTo(0.8)
  })
})

describe('computeWeeklyActuals', () => {
  it('指定範囲の日別データを集約する', () => {
    const daily = new Map<number, DailyRecord>([
      [1, { sales: 1000, customers: 10 } as DailyRecord],
      [2, { sales: 2000, customers: 20 } as DailyRecord],
      [3, { sales: 3000, customers: 30 } as DailyRecord],
    ])
    const result = computeWeeklyActuals(1, 3, daily)
    expect(result.sales).toBe(6000)
    expect(result.customers).toBe(60)
  })

  it('範囲外の日は無視', () => {
    const daily = new Map<number, DailyRecord>([[5, { sales: 5000, customers: 50 } as DailyRecord]])
    const result = computeWeeklyActuals(1, 3, daily)
    expect(result.sales).toBe(0)
    expect(result.customers).toBe(0)
  })

  // Phase 3 Step 3-3 で追加された contract test
  it('txValue は calculateTransactionValue(sales, customers) の結果を返す', () => {
    const daily = new Map<number, DailyRecord>([
      [1, { sales: 1000, customers: 10 } as DailyRecord],
      [2, { sales: 2000, customers: 20 } as DailyRecord],
    ])
    const result = computeWeeklyActuals(1, 2, daily)
    // txValue = sales / customers = 3000 / 30 = 100
    expect(result.txValue).toBe(100)
  })

  it('customers=0 のとき txValue は 0 を返す (calculateTransactionValue の 0 除算ガード)', () => {
    const daily = new Map<number, DailyRecord>([[1, { sales: 5000, customers: 0 } as DailyRecord]])
    const result = computeWeeklyActuals(1, 1, daily)
    expect(result.customers).toBe(0)
    expect(result.txValue).toBe(0)
    expect(Number.isNaN(result.txValue)).toBe(false)
  })

  it('空 Map を渡しても 0 / 0 / 0 を返す (NaN なし)', () => {
    const empty = new Map<number, DailyRecord>()
    const result = computeWeeklyActuals(1, 7, empty)
    expect(result.sales).toBe(0)
    expect(result.customers).toBe(0)
    expect(result.txValue).toBe(0)
    expect(Number.isNaN(result.txValue)).toBe(false)
  })

  it('部分的な range (一部の日のみデータあり) でも正しく集約する', () => {
    const daily = new Map<number, DailyRecord>([
      [2, { sales: 1500, customers: 15 } as DailyRecord],
      [4, { sales: 2500, customers: 25 } as DailyRecord],
      // day 1, 3, 5 はデータなし
    ])
    const result = computeWeeklyActuals(1, 5, daily)
    expect(result.sales).toBe(4000)
    expect(result.customers).toBe(40)
    expect(result.txValue).toBe(100) // 4000 / 40
  })

  it('customers が undefined の DailyRecord は customers ?? 0 で 0 扱い', () => {
    const daily = new Map<number, DailyRecord>([
      [1, { sales: 1000 } as DailyRecord], // customers なし
    ])
    const result = computeWeeklyActuals(1, 1, daily)
    expect(result.sales).toBe(1000)
    expect(result.customers).toBe(0)
  })
})

describe('computeDecompTotals', () => {
  it('複数行の合計と寄与率を計算する', () => {
    const rows = [
      { salesDiff: 100, custEffect: 60, ticketEffect: 40 },
      { salesDiff: -50, custEffect: -30, ticketEffect: -20 },
    ]
    const result = computeDecompTotals(rows)
    expect(result.salesDiff).toBe(50)
    expect(result.custEffect).toBe(30)
    expect(result.ticketEffect).toBe(20)
    expect(result.custPct).toBeCloseTo(30 / 50) // |30| / (|30| + |20|)
  })

  // Phase 3 Step 3-3 で追加された contract test
  it('空配列を渡すと salesDiff=0 / custEffect=0 / ticketEffect=0 / custPct=0', () => {
    const result = computeDecompTotals([])
    expect(result.salesDiff).toBe(0)
    expect(result.custEffect).toBe(0)
    expect(result.ticketEffect).toBe(0)
    expect(result.custPct).toBe(0)
    expect(Number.isNaN(result.custPct)).toBe(false)
  })

  it('単一行は そのまま totals に反映され custPct は computeDecompPct と一致', () => {
    const rows = [{ salesDiff: 200, custEffect: 80, ticketEffect: 120 }]
    const result = computeDecompTotals(rows)
    expect(result.salesDiff).toBe(200)
    expect(result.custEffect).toBe(80)
    expect(result.ticketEffect).toBe(120)
    expect(result.custPct).toBeCloseTo(80 / 200) // |80| / (|80| + |120|)
  })

  it('複数行で custEffect 合計が打ち消される (cancel) 場合でも壊れない', () => {
    const rows = [
      { salesDiff: 100, custEffect: 80, ticketEffect: 20 },
      { salesDiff: 50, custEffect: -80, ticketEffect: 130 }, // custEffect が打ち消し
    ]
    const result = computeDecompTotals(rows)
    expect(result.custEffect).toBe(0)
    expect(result.ticketEffect).toBe(150)
    // custPct = |0| / (|0| + |150|) = 0
    expect(result.custPct).toBe(0)
  })
})
