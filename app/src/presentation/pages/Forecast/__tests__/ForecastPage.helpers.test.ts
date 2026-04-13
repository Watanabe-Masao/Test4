/**
 * ForecastPage.helpers.ts — pure helper functions tests (edge cases + invariants)
 *
 * 既存の ./ForecastPage.helpers.test.ts が happy-path を広くカバーしているため、
 * ここでは以下を重点的に検証する:
 * - DOW_LABELS / DEFAULT_DOW_COLORS 定数の形状
 * - 空入力・境界値
 * - buildDailyDecomposition のシャープリー恒等式（salesDiff == custEffect + ticketEffect）
 * - 累計値の漸進
 * - buildRelationshipData の正規化（avg=1.0）
 */
import { describe, it, expect } from 'vitest'
import {
  DOW_LABELS,
  DEFAULT_DOW_COLORS,
  buildForecastInput,
  computeStackedWeekData,
  buildDailyCustomerData,
  buildDowCustomerAverages,
  buildMovingAverages,
  buildRelationshipData,
  buildRelationshipDataFromPrev,
  buildDailyDecomposition,
  buildDowDecomposition,
  buildWeeklyDecomposition,
  type DailyCustomerEntry,
  type DailyDecompEntry,
} from '../ForecastPage.helpers'
import type { WeeklySummary } from '@/application/hooks/calculation'
import type { DailyRecord } from '@/domain/models/record'
import type { PrevYearData } from '@/application/hooks/analytics'

// ─── Fixture helpers ─────────────────────────────────

function makeEntry(partial: Partial<DailyCustomerEntry> & { day: number }): DailyCustomerEntry {
  return {
    day: partial.day,
    sales: partial.sales ?? 0,
    customers: partial.customers ?? 0,
    txValue: partial.txValue ?? 0,
    prevSales: partial.prevSales ?? 0,
    prevCustomers: partial.prevCustomers ?? 0,
    prevTxValue: partial.prevTxValue ?? 0,
  }
}

// ─── Constants ───────────────────────────────────────

describe('DOW_LABELS (constants)', () => {
  it('7 曜日で日曜始まり', () => {
    expect(DOW_LABELS).toEqual(['日', '月', '火', '水', '木', '金', '土'])
  })

  it('DEFAULT_DOW_COLORS は 7 色', () => {
    expect(DEFAULT_DOW_COLORS).toHaveLength(7)
    for (const c of DEFAULT_DOW_COLORS) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

// ─── buildForecastInput edge cases ──────────────────

describe('buildForecastInput (edge cases)', () => {
  it('空の daily から空の Map を構築', () => {
    const input = buildForecastInput({ daily: new Map() }, 2026, 4)
    expect(input.year).toBe(2026)
    expect(input.month).toBe(4)
    expect(input.dailySales.size).toBe(0)
    expect(input.dailyGrossProfit.size).toBe(0)
  })

  it('複数日で sales - cost から粗利を算出', () => {
    const daily = new Map<number, { sales: number; purchase: { cost: number } }>([
      [1, { sales: 1000, purchase: { cost: 700 } }],
      [2, { sales: 500, purchase: { cost: 600 } }], // マイナス粗利
    ])
    const input = buildForecastInput({ daily }, 2026, 4)
    expect(input.dailySales.get(1)).toBe(1000)
    expect(input.dailyGrossProfit.get(1)).toBe(300)
    expect(input.dailySales.get(2)).toBe(500)
    expect(input.dailyGrossProfit.get(2)).toBe(-100)
  })
})

// ─── computeStackedWeekData edge cases ──────────────

describe('computeStackedWeekData (edge cases)', () => {
  it('空の weeks は空配列', () => {
    expect(computeStackedWeekData([], new Map(), 2026, 1)).toEqual([])
  })

  it('全 DOW キーが必ず存在する（データがなくても 0）', () => {
    const weeks: WeeklySummary[] = [
      {
        weekNumber: 1,
        startDay: 1,
        endDay: 1,
        totalSales: 0,
        totalGrossProfit: 0,
        grossProfitRate: 0,
        days: 1,
      },
    ]
    const result = computeStackedWeekData(weeks, new Map([[1, 500]]), 2026, 1)
    expect(result).toHaveLength(1)
    for (const label of DOW_LABELS) {
      expect(typeof result[0][label]).toBe('number')
    }
    // 2026-01-01 は木曜
    expect(result[0]['木']).toBe(500)
  })
})

// ─── buildDailyCustomerData ──────────────────────────

describe('buildDailyCustomerData', () => {
  const emptyPrev = { daily: new Map() } as unknown as PrevYearData

  it('sales<=0 の日は除外', () => {
    const daily = new Map<number, DailyRecord>([
      [1, { sales: 1000, customers: 10 } as unknown as DailyRecord],
      [2, { sales: 0, customers: 5 } as unknown as DailyRecord],
      [3, { sales: -100, customers: 5 } as unknown as DailyRecord],
    ])
    const result = buildDailyCustomerData(daily, emptyPrev, 2026, 4)
    expect(result).toHaveLength(1)
    expect(result[0].day).toBe(1)
    expect(result[0].customers).toBe(10)
    expect(result[0].txValue).toBe(100)
  })

  it('結果は day 昇順にソートされる', () => {
    const daily = new Map<number, DailyRecord>([
      [5, { sales: 500, customers: 5 } as unknown as DailyRecord],
      [2, { sales: 200, customers: 2 } as unknown as DailyRecord],
      [3, { sales: 300, customers: 3 } as unknown as DailyRecord],
    ])
    const result = buildDailyCustomerData(daily, emptyPrev, 2026, 4)
    expect(result.map((e) => e.day)).toEqual([2, 3, 5])
  })

  it('customers undefined は 0 扱い', () => {
    const daily = new Map<number, DailyRecord>([[1, { sales: 1000 } as unknown as DailyRecord]])
    const result = buildDailyCustomerData(daily, emptyPrev, 2026, 4)
    expect(result[0].customers).toBe(0)
    expect(result[0].txValue).toBe(0)
  })
})

// ─── buildDowCustomerAverages ───────────────────────

describe('buildDowCustomerAverages (edge cases)', () => {
  it('空入力は全曜日 count=0, 平均 0', () => {
    const result = buildDowCustomerAverages([], 2026, 4)
    expect(result).toHaveLength(7)
    for (const bucket of result) {
      expect(bucket.count).toBe(0)
      expect(bucket.avgCustomers).toBe(0)
      expect(bucket.avgTxValue).toBe(0)
    }
  })

  it('同曜日の複数エントリを平均化', () => {
    // 2026-01-04=日曜, 2026-01-11=日曜
    const entries: DailyCustomerEntry[] = [
      makeEntry({ day: 4, sales: 1000, customers: 10 }),
      makeEntry({ day: 11, sales: 2000, customers: 20 }),
    ]
    const result = buildDowCustomerAverages(entries, 2026, 1)
    const sunday = result[0]
    expect(sunday.dow).toBe('日')
    expect(sunday.count).toBe(2)
    // (10+20)/2 = 15
    expect(sunday.avgCustomers).toBe(15)
    // (1000+2000)/(10+20) = 100
    expect(sunday.avgTxValue).toBe(100)
  })
})

// ─── buildMovingAverages ─────────────────────────────

describe('buildMovingAverages (edge cases)', () => {
  it('window=1 は元データと一致', () => {
    const entries = [
      makeEntry({ day: 1, sales: 1000, customers: 10 }),
      makeEntry({ day: 2, sales: 2000, customers: 20 }),
    ]
    const result = buildMovingAverages(entries, 1)
    expect(result[0].salesMA).toBe(1000)
    expect(result[1].salesMA).toBe(2000)
    expect(result[0].customersMA).toBe(10)
    expect(result[0].txValueMA).toBe(100)
  })

  it('window>len でも最小窓で計算', () => {
    const entries = [makeEntry({ day: 1, sales: 1000, customers: 10 })]
    const result = buildMovingAverages(entries, 10)
    expect(result).toHaveLength(1)
    expect(result[0].salesMA).toBe(1000)
  })

  it('空入力は空', () => {
    expect(buildMovingAverages([], 3)).toEqual([])
  })
})

// ─── buildRelationshipData（正規化）──────────────────

describe('buildRelationshipData (normalization)', () => {
  it('customers=0 を持つエントリを除外した後で avg を取る', () => {
    const entries: DailyCustomerEntry[] = [
      makeEntry({ day: 1, sales: 1000, customers: 10, txValue: 100 }),
      makeEntry({ day: 2, sales: 2000, customers: 20, txValue: 100 }),
      makeEntry({ day: 3, sales: 0, customers: 0, txValue: 0 }), // 除外
    ]
    const result = buildRelationshipData(entries)
    expect(result).toHaveLength(2)
    // avgSales = 1500, day 1 sales=1000 → index = 1000/1500 ≒ 0.667
    expect(result[0].salesIndex).toBeCloseTo(0.667, 2)
    expect(result[1].salesIndex).toBeCloseTo(1.333, 2)
  })

  it('全エントリが customers=0 なら空配列', () => {
    const entries: DailyCustomerEntry[] = [makeEntry({ day: 1, sales: 1000, customers: 0 })]
    expect(buildRelationshipData(entries)).toEqual([])
  })
})

describe('buildRelationshipDataFromPrev', () => {
  it('prevCustomers=0 を除外', () => {
    const entries: DailyCustomerEntry[] = [
      makeEntry({ day: 1, prevSales: 1000, prevCustomers: 10, prevTxValue: 100 }),
      makeEntry({ day: 2, prevSales: 0, prevCustomers: 0, prevTxValue: 0 }),
    ]
    const result = buildRelationshipDataFromPrev(entries)
    expect(result).toHaveLength(1)
    expect(result[0].sales).toBe(1000)
    expect(result[0].customers).toBe(10)
    // 単一エントリだから index = 1.0
    expect(result[0].salesIndex).toBeCloseTo(1.0, 5)
  })

  it('全空は空配列', () => {
    expect(buildRelationshipDataFromPrev([])).toEqual([])
  })
})

// ─── buildDailyDecomposition（シャープリー恒等式） ───

describe('buildDailyDecomposition (Shapley identity)', () => {
  it('salesDiff = custEffect + ticketEffect を満たす', () => {
    const entries: DailyCustomerEntry[] = [
      makeEntry({
        day: 1,
        sales: 1500,
        customers: 15,
        prevSales: 1000,
        prevCustomers: 10,
      }),
      makeEntry({
        day: 2,
        sales: 800,
        customers: 10,
        prevSales: 1200,
        prevCustomers: 12,
      }),
    ]
    const result = buildDailyDecomposition(entries)
    expect(result).toHaveLength(2)
    for (const e of result) {
      expect(e.custEffect + e.ticketEffect).toBeCloseTo(e.salesDiff, 5)
    }
  })

  it('累計は漸進的に加算される', () => {
    const entries: DailyCustomerEntry[] = [
      makeEntry({ day: 1, sales: 1500, customers: 15, prevSales: 1000, prevCustomers: 10 }),
      makeEntry({ day: 2, sales: 2000, customers: 20, prevSales: 1000, prevCustomers: 10 }),
    ]
    const result = buildDailyDecomposition(entries)
    expect(result[0].cumSalesDiff).toBe(result[0].salesDiff)
    expect(result[1].cumSalesDiff).toBeCloseTo(result[0].salesDiff + result[1].salesDiff, 5)
    expect(result[1].cumCustEffect).toBeCloseTo(result[0].custEffect + result[1].custEffect, 5)
    expect(result[1].cumTicketEffect).toBeCloseTo(
      result[0].ticketEffect + result[1].ticketEffect,
      5,
    )
  })

  it('customers=0 or prevCustomers=0 を全除外すると空', () => {
    const entries: DailyCustomerEntry[] = [
      makeEntry({ day: 1, sales: 1000, customers: 0, prevSales: 800, prevCustomers: 8 }),
      makeEntry({ day: 2, sales: 1000, customers: 10, prevSales: 0, prevCustomers: 0 }),
    ]
    expect(buildDailyDecomposition(entries)).toEqual([])
  })
})

// ─── buildDowDecomposition ───────────────────────────

describe('buildDowDecomposition', () => {
  it('曜日ごとの平均を算出（count=0 の曜日は 0）', () => {
    // 2026-01-01=木曜、2026-01-08=木曜
    const decomp: DailyDecompEntry[] = [
      {
        day: 1,
        salesDiff: 100,
        custEffect: 60,
        ticketEffect: 40,
        cumSalesDiff: 100,
        cumCustEffect: 60,
        cumTicketEffect: 40,
      },
      {
        day: 8,
        salesDiff: 200,
        custEffect: 120,
        ticketEffect: 80,
        cumSalesDiff: 300,
        cumCustEffect: 180,
        cumTicketEffect: 120,
      },
    ]
    const result = buildDowDecomposition(decomp, 2026, 1)
    const thu = result[4] // 木曜
    expect(thu.dow).toBe('木')
    expect(thu.count).toBe(2)
    expect(thu.avgSalesDiff).toBe(150)
    expect(thu.avgCustEffect).toBe(90)
    expect(thu.avgTicketEffect).toBe(60)
    // 他曜日は count=0
    for (const i of [0, 1, 2, 3, 5, 6]) {
      expect(result[i].count).toBe(0)
      expect(result[i].avgSalesDiff).toBe(0)
    }
  })

  it('空入力は全曜日 count=0', () => {
    const result = buildDowDecomposition([], 2026, 1)
    expect(result).toHaveLength(7)
    for (const b of result) expect(b.count).toBe(0)
  })
})

// ─── buildWeeklyDecomposition ────────────────────────

describe('buildWeeklyDecomposition', () => {
  const decomp: DailyDecompEntry[] = [
    {
      day: 1,
      salesDiff: 100,
      custEffect: 60,
      ticketEffect: 40,
      cumSalesDiff: 100,
      cumCustEffect: 60,
      cumTicketEffect: 40,
    },
    {
      day: 2,
      salesDiff: 200,
      custEffect: 120,
      ticketEffect: 80,
      cumSalesDiff: 300,
      cumCustEffect: 180,
      cumTicketEffect: 120,
    },
    {
      day: 8,
      salesDiff: 50,
      custEffect: 25,
      ticketEffect: 25,
      cumSalesDiff: 350,
      cumCustEffect: 205,
      cumTicketEffect: 145,
    },
  ]
  const weeks: WeeklySummary[] = [
    {
      weekNumber: 1,
      startDay: 1,
      endDay: 7,
      totalSales: 0,
      totalGrossProfit: 0,
      grossProfitRate: 0,
      days: 7,
    },
    {
      weekNumber: 2,
      startDay: 8,
      endDay: 14,
      totalSales: 0,
      totalGrossProfit: 0,
      grossProfitRate: 0,
      days: 7,
    },
  ]

  it('週ごとに salesDiff / effect を集計', () => {
    const result = buildWeeklyDecomposition(decomp, weeks)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      weekNumber: 1,
      startDay: 1,
      endDay: 7,
      salesDiff: 300,
      custEffect: 180,
      ticketEffect: 120,
    })
    expect(result[1]).toMatchObject({
      weekNumber: 2,
      salesDiff: 50,
      custEffect: 25,
      ticketEffect: 25,
    })
  })

  it('週に entry がなければ 0', () => {
    const result = buildWeeklyDecomposition([], weeks)
    expect(result[0].salesDiff).toBe(0)
    expect(result[0].custEffect).toBe(0)
    expect(result[0].ticketEffect).toBe(0)
  })
})
