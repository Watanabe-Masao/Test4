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
})
