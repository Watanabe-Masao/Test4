import { describe, it, expect } from 'vitest'
import { aggregateDailyByAlignment, aggregateKpiByAlignment } from '../buildComparisonAggregation'
import type { AlignmentEntry } from '@/domain/models/ComparisonScope'
import type { ClassifiedSalesDaySummary } from '@/domain/models/ClassifiedSales'
import { ZERO_DISCOUNT_ENTRIES } from '@/domain/models/ClassifiedSales'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models'

// ── ヘルパー ──

function makeAlignmentEntry(
  srcYear: number,
  srcMonth: number,
  srcDay: number,
  tgtYear: number,
  tgtMonth: number,
  tgtDay: number,
): AlignmentEntry {
  return {
    sourceDate: { year: srcYear, month: srcMonth, day: srcDay },
    targetDate: { year: tgtYear, month: tgtMonth, day: tgtDay },
    sourceDayKey: `${srcYear}-${String(srcMonth).padStart(2, '0')}-${String(srcDay).padStart(2, '0')}`,
    targetDayKey: `${tgtYear}-${String(tgtMonth).padStart(2, '0')}-${String(tgtDay).padStart(2, '0')}`,
  }
}

function makeSummary(sales: number, discount = 0): ClassifiedSalesDaySummary {
  return {
    sales,
    discount,
    discountEntries: ZERO_DISCOUNT_ENTRIES,
  }
}

function makeFlowersIndex(
  storeId: string,
  dayCustomers: Record<number, number>,
): StoreDayIndex<SpecialSalesDayEntry> {
  const days: Record<number, SpecialSalesDayEntry> = {}
  for (const [day, customers] of Object.entries(dayCustomers)) {
    days[Number(day)] = {
      storeId,
      year: 2025,
      month: 3,
      day: Number(day),
      price: 0,
      cost: 0,
      customers,
    }
  }
  return { [storeId]: days }
}

// ── aggregateDailyByAlignment ──

describe('aggregateDailyByAlignment', () => {
  it('空の targetIds で EMPTY_DAILY を返す', () => {
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]
    const result = aggregateDailyByAlignment({}, undefined, [], alignment)
    expect(result.hasPrevYear).toBe(false)
    expect(result.totalSales).toBe(0)
  })

  it('空の alignmentMap で EMPTY_DAILY を返す', () => {
    const result = aggregateDailyByAlignment({}, undefined, ['S1'], [])
    expect(result.hasPrevYear).toBe(false)
  })

  it('1店舗・1日の基本集計', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(1000, -50) },
    }
    const flowers = makeFlowersIndex('S1', { 1: 100 })
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]

    const result = aggregateDailyByAlignment(allAgg, flowers, ['S1'], alignment)

    expect(result.hasPrevYear).toBe(true)
    expect(result.totalSales).toBe(1000)
    expect(result.totalDiscount).toBe(-50)
    expect(result.totalCustomers).toBe(100)
    expect(result.grossSales).toBe(950) // 1000 + (-50)
    expect(result.daily.size).toBe(1)
  })

  it('複数店舗の集計を合算する', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(1000) },
      S2: { 1: makeSummary(2000) },
    }
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]

    const result = aggregateDailyByAlignment(allAgg, undefined, ['S1', 'S2'], alignment)

    expect(result.totalSales).toBe(3000)
    expect(result.daily.size).toBe(1)
    // 同じ targetDay にマージされる
    const dayEntry = result.daily.get(1)
    expect(dayEntry).toBeDefined()
  })

  it('複数日のマッピング（sourceDay ≠ targetDay）', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: {
        5: makeSummary(500),
        6: makeSummary(600),
        7: makeSummary(700),
      },
    }
    const flowers = makeFlowersIndex('S1', { 5: 10, 6: 20, 7: 30 })
    // 前年の5,6,7日 → 当期の1,2,3日にマッピング
    const alignment = [
      makeAlignmentEntry(2025, 3, 5, 2026, 3, 1),
      makeAlignmentEntry(2025, 3, 6, 2026, 3, 2),
      makeAlignmentEntry(2025, 3, 7, 2026, 3, 3),
    ]

    const result = aggregateDailyByAlignment(allAgg, flowers, ['S1'], alignment)

    expect(result.hasPrevYear).toBe(true)
    expect(result.totalSales).toBe(1800)
    expect(result.totalCustomers).toBe(60)
    expect(result.daily.size).toBe(3)
  })

  it('elapsedDays で集計範囲を制限する', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: {
        1: makeSummary(100),
        2: makeSummary(200),
        3: makeSummary(300),
      },
    }
    const alignment = [
      makeAlignmentEntry(2025, 3, 1, 2026, 3, 1),
      makeAlignmentEntry(2025, 3, 2, 2026, 3, 2),
      makeAlignmentEntry(2025, 3, 3, 2026, 3, 3),
    ]

    // elapsedDays=2 → targetDay 1,2 のみ合計
    const result = aggregateDailyByAlignment(allAgg, undefined, ['S1'], alignment, 2)

    expect(result.totalSales).toBe(300) // 100 + 200 のみ
    expect(result.daily.size).toBe(3) // daily Map 自体は3日分ある
  })

  it('存在しない店舗データはスキップする', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(1000) },
    }
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]

    // S2 はデータなし
    const result = aggregateDailyByAlignment(allAgg, undefined, ['S1', 'S2'], alignment)

    expect(result.totalSales).toBe(1000)
  })

  it('flowersIndex が undefined でも客数0で動作する', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(500) },
    }
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]

    const result = aggregateDailyByAlignment(allAgg, undefined, ['S1'], alignment)

    expect(result.totalCustomers).toBe(0)
    expect(result.totalSales).toBe(500)
  })

  it('discountRate が正しく計算される', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(1000, -100) },
    }
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]

    const result = aggregateDailyByAlignment(allAgg, undefined, ['S1'], alignment)

    // discountRate = safeDivide(-100, 1000) = -0.1
    expect(result.discountRate).toBeCloseTo(-0.1)
  })
})

// ── aggregateKpiByAlignment ──

describe('aggregateKpiByAlignment', () => {
  it('空の targetIds でゼロを返す', () => {
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]
    const result = aggregateKpiByAlignment({}, undefined, [], alignment)
    expect(result.sales).toBe(0)
    expect(result.customers).toBe(0)
    expect(result.transactionValue).toBe(0)
    expect(result.dailyMapping).toEqual([])
    expect(result.storeContributions).toEqual([])
  })

  it('空の alignmentMap でゼロを返す', () => {
    const result = aggregateKpiByAlignment({}, undefined, ['S1'], [])
    expect(result.sales).toBe(0)
  })

  it('1店舗・1日の基本KPI集計', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 5: makeSummary(2000) },
    }
    const flowers = makeFlowersIndex('S1', { 5: 40 })
    const alignment = [makeAlignmentEntry(2025, 3, 5, 2026, 3, 1)]

    const result = aggregateKpiByAlignment(allAgg, flowers, ['S1'], alignment)

    expect(result.sales).toBe(2000)
    expect(result.customers).toBe(40)
    expect(result.transactionValue).toBe(Math.round(2000 / 40))
    expect(result.dailyMapping).toHaveLength(1)
    expect(result.dailyMapping[0]).toEqual({
      prevDay: 5,
      currentDay: 1,
      prevSales: 2000,
      prevCustomers: 40,
    })
    expect(result.storeContributions).toHaveLength(1)
    expect(result.storeContributions[0]).toEqual({
      storeId: 'S1',
      originalDay: 5,
      mappedDay: 1,
      sales: 2000,
      customers: 40,
    })
  })

  it('複数店舗・複数日のKPI集計', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(1000), 2: makeSummary(1500) },
      S2: { 1: makeSummary(800), 2: makeSummary(1200) },
    }
    const flowers: StoreDayIndex<SpecialSalesDayEntry> = {
      S1: {
        1: { storeId: 'S1', year: 2025, month: 3, day: 1, price: 0, cost: 0, customers: 20 },
        2: { storeId: 'S1', year: 2025, month: 3, day: 2, price: 0, cost: 0, customers: 30 },
      },
      S2: {
        1: { storeId: 'S2', year: 2025, month: 3, day: 1, price: 0, cost: 0, customers: 15 },
        2: { storeId: 'S2', year: 2025, month: 3, day: 2, price: 0, cost: 0, customers: 25 },
      },
    }
    const alignment = [
      makeAlignmentEntry(2025, 3, 1, 2026, 3, 1),
      makeAlignmentEntry(2025, 3, 2, 2026, 3, 2),
    ]

    const result = aggregateKpiByAlignment(allAgg, flowers, ['S1', 'S2'], alignment)

    expect(result.sales).toBe(4500) // 1000+1500+800+1200
    expect(result.customers).toBe(90) // 20+30+15+25
    expect(result.dailyMapping).toHaveLength(2)
    // dailyMapping は currentDay でソート済み
    expect(result.dailyMapping[0].currentDay).toBe(1)
    expect(result.dailyMapping[1].currentDay).toBe(2)
    // store contributions は全エントリ
    expect(result.storeContributions).toHaveLength(4)
  })

  it('dailyMapping は currentDay 昇順でソートされる', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 10: makeSummary(100), 8: makeSummary(200) },
    }
    // 前年10日→当期3日、前年8日→当期1日
    const alignment = [
      makeAlignmentEntry(2025, 3, 10, 2026, 3, 3),
      makeAlignmentEntry(2025, 3, 8, 2026, 3, 1),
    ]

    const result = aggregateKpiByAlignment(allAgg, undefined, ['S1'], alignment)

    expect(result.dailyMapping[0].currentDay).toBe(1)
    expect(result.dailyMapping[0].prevDay).toBe(8)
    expect(result.dailyMapping[1].currentDay).toBe(3)
    expect(result.dailyMapping[1].prevDay).toBe(10)
  })

  it('flowersIndex が undefined でも客数0で動作する', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(500) },
    }
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]

    const result = aggregateKpiByAlignment(allAgg, undefined, ['S1'], alignment)

    expect(result.sales).toBe(500)
    expect(result.customers).toBe(0)
    // transactionValue = safeDivide(500, 0) = 0, rounded
    expect(result.transactionValue).toBe(0)
  })
})

// ── aggregateKpiByAlignment 不変条件（INV-AGG-*） ──

describe('aggregateKpiByAlignment 集約不変条件', () => {
  const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
    S1: { 1: makeSummary(100000), 2: makeSummary(120000), 3: makeSummary(80000), 15: makeSummary(200000), 28: makeSummary(150000) },
    S2: { 1: makeSummary(90000), 3: makeSummary(110000), 10: makeSummary(95000) },
    S3: { 5: makeSummary(70000), 20: makeSummary(130000) },
  }
  const flowers: StoreDayIndex<SpecialSalesDayEntry> = {
    S1: {
      1: { storeId: 'S1', year: 2025, month: 3, day: 1, price: 0, cost: 0, customers: 50 },
      2: { storeId: 'S1', year: 2025, month: 3, day: 2, price: 0, cost: 0, customers: 60 },
      3: { storeId: 'S1', year: 2025, month: 3, day: 3, price: 0, cost: 0, customers: 40 },
      15: { storeId: 'S1', year: 2025, month: 3, day: 15, price: 0, cost: 0, customers: 100 },
      28: { storeId: 'S1', year: 2025, month: 3, day: 28, price: 0, cost: 0, customers: 75 },
    },
    S2: {
      1: { storeId: 'S2', year: 2025, month: 3, day: 1, price: 0, cost: 0, customers: 45 },
      3: { storeId: 'S2', year: 2025, month: 3, day: 3, price: 0, cost: 0, customers: 55 },
      10: { storeId: 'S2', year: 2025, month: 3, day: 10, price: 0, cost: 0, customers: 48 },
    },
    S3: {
      5: { storeId: 'S3', year: 2025, month: 3, day: 5, price: 0, cost: 0, customers: 35 },
      20: { storeId: 'S3', year: 2025, month: 3, day: 20, price: 0, cost: 0, customers: 65 },
    },
  }
  const allIds = ['S1', 'S2', 'S3'] as const

  // 全日を1:1でマッピング
  const allDays = [1, 2, 3, 5, 10, 15, 20, 28]
  const alignment = allDays.map((d) => makeAlignmentEntry(2025, 3, d, 2026, 3, d))

  const entry = aggregateKpiByAlignment(allAgg, flowers, allIds, alignment)

  it('INV-AGG-001: Σ(storeContributions.sales) === entry.sales', () => {
    expect(entry.storeContributions.reduce((s, c) => s + c.sales, 0)).toBe(entry.sales)
  })

  it('INV-AGG-002: Σ(storeContributions.customers) === entry.customers', () => {
    expect(entry.storeContributions.reduce((s, c) => s + c.customers, 0)).toBe(entry.customers)
  })

  it('INV-AGG-003: Σ(dailyMapping.prevSales) === entry.sales', () => {
    expect(entry.dailyMapping.reduce((s, d) => s + d.prevSales, 0)).toBe(entry.sales)
  })

  it('INV-AGG-004: Σ(dailyMapping.prevCustomers) === entry.customers', () => {
    expect(entry.dailyMapping.reduce((s, d) => s + d.prevCustomers, 0)).toBe(entry.customers)
  })

  it('INV-AGG-005: transactionValue === Math.round(sales / customers)', () => {
    if (entry.customers > 0) {
      expect(entry.transactionValue).toBe(Math.round(entry.sales / entry.customers))
    } else {
      expect(entry.transactionValue).toBe(0)
    }
  })

  it('INV-AGG-006: dailyMapping は currentDay 昇順', () => {
    for (let i = 1; i < entry.dailyMapping.length; i++) {
      expect(entry.dailyMapping[i].currentDay).toBeGreaterThan(entry.dailyMapping[i - 1].currentDay)
    }
  })

  it('INV-AGG-009: 空入力 → ゼロ entry', () => {
    const empty = aggregateKpiByAlignment({}, undefined, [], alignment)
    expect(empty.sales).toBe(0)
    expect(empty.customers).toBe(0)
    expect(empty.transactionValue).toBe(0)
    expect(empty.dailyMapping).toHaveLength(0)
    expect(empty.storeContributions).toHaveLength(0)
  })

  it('一部店舗のみ選択しても不変条件1-4が成立', () => {
    const partial = aggregateKpiByAlignment(allAgg, flowers, ['S1'], alignment)
    expect(partial.storeContributions.reduce((s, c) => s + c.sales, 0)).toBe(partial.sales)
    expect(partial.storeContributions.reduce((s, c) => s + c.customers, 0)).toBe(partial.customers)
    expect(partial.dailyMapping.reduce((s, d) => s + d.prevSales, 0)).toBe(partial.sales)
    expect(partial.dailyMapping.reduce((s, d) => s + d.prevCustomers, 0)).toBe(partial.customers)
  })

  it('flowers データなしでも sales の不変条件は維持（customers=0）', () => {
    const noFlowers = aggregateKpiByAlignment(allAgg, undefined, allIds, alignment)
    expect(noFlowers.storeContributions.reduce((s, c) => s + c.sales, 0)).toBe(noFlowers.sales)
    expect(noFlowers.customers).toBe(0)
    expect(noFlowers.transactionValue).toBe(0)
  })
})
