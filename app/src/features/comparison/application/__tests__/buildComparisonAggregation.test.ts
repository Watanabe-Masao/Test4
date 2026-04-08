import { describe, it, expect } from 'vitest'
import { aggregateDailyByAlignment, aggregateKpiByAlignment } from '../buildComparisonAggregation'
import { buildSourceDataIndex, type SourceMonthContext } from '../sourceDataIndex'
import type { AlignmentEntry } from '@/domain/models/ComparisonScope'
import type { ClassifiedSalesDaySummary } from '@/domain/models/ClassifiedSales'
import { ZERO_DISCOUNT_ENTRIES } from '@/domain/models/DiscountEntry'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models/record'

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

function makeSummary(sales: number, discount = 0, customers = 0): ClassifiedSalesDaySummary {
  return {
    sales,
    discount,
    discountEntries: ZERO_DISCOUNT_ENTRIES,
    customers,
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

/** テスト用: allAgg + flowersIndex から SourceDataIndex を構築するヘルパー */
function makeSourceIndex(
  allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>>,
  flowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined,
  ctx: SourceMonthContext = { year: 2025, month: 3, daysInMonth: 31 },
) {
  return buildSourceDataIndex(allAgg, flowersIndex, ctx)
}

// ── aggregateDailyByAlignment ──

describe('aggregateDailyByAlignment', () => {
  it('空の targetIds で EMPTY_DAILY を返す', () => {
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]
    const idx = makeSourceIndex({}, undefined)
    const result = aggregateDailyByAlignment(idx, [], alignment)
    expect(result.hasPrevYear).toBe(false)
    expect(result.totalSales).toBe(0)
  })

  it('空の alignmentMap で EMPTY_DAILY を返す', () => {
    const idx = makeSourceIndex({}, undefined)
    const result = aggregateDailyByAlignment(idx, ['S1'], [])
    expect(result.hasPrevYear).toBe(false)
  })

  it('1店舗・1日の基本集計', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(1000, -50, 100) },
    }
    const flowers = makeFlowersIndex('S1', { 1: 100 })
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]
    const idx = makeSourceIndex(allAgg, flowers)

    const result = aggregateDailyByAlignment(idx, ['S1'], alignment)

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
    const idx = makeSourceIndex(allAgg, undefined)

    const result = aggregateDailyByAlignment(idx, ['S1', 'S2'], alignment)

    expect(result.totalSales).toBe(3000)
    expect(result.daily.size).toBe(1)
    // 同じ targetDayKey にマージされる
    const dayEntry = result.daily.get('2026-03-01')
    expect(dayEntry).toBeDefined()
  })

  it('複数日のマッピング（sourceDay ≠ targetDay）', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: {
        5: makeSummary(500, 0, 10),
        6: makeSummary(600, 0, 20),
        7: makeSummary(700, 0, 30),
      },
    }
    const flowers = makeFlowersIndex('S1', { 5: 10, 6: 20, 7: 30 })
    // 前年の5,6,7日 → 当期の1,2,3日にマッピング
    const alignment = [
      makeAlignmentEntry(2025, 3, 5, 2026, 3, 1),
      makeAlignmentEntry(2025, 3, 6, 2026, 3, 2),
      makeAlignmentEntry(2025, 3, 7, 2026, 3, 3),
    ]
    const idx = makeSourceIndex(allAgg, flowers)

    const result = aggregateDailyByAlignment(idx, ['S1'], alignment)

    expect(result.hasPrevYear).toBe(true)
    expect(result.totalSales).toBe(1800)
    expect(result.totalCustomers).toBe(60)
    expect(result.daily.size).toBe(3)
  })

  it('alignmentMap がキャップされていれば集計範囲も制限される', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: {
        1: makeSummary(100),
        2: makeSummary(200),
        3: makeSummary(300),
      },
    }
    // alignmentMap を2日分に制限（buildEffectivePeriod1 がキャップ済みの想定）
    const alignment = [
      makeAlignmentEntry(2025, 3, 1, 2026, 3, 1),
      makeAlignmentEntry(2025, 3, 2, 2026, 3, 2),
    ]
    const idx = makeSourceIndex(allAgg, undefined)

    const result = aggregateDailyByAlignment(idx, ['S1'], alignment)

    expect(result.totalSales).toBe(300) // 100 + 200 のみ
    expect(result.daily.size).toBe(2)
  })

  it('存在しない店舗データはスキップする', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(1000) },
    }
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]
    const idx = makeSourceIndex(allAgg, undefined)

    // S2 はデータなし
    const result = aggregateDailyByAlignment(idx, ['S1', 'S2'], alignment)

    expect(result.totalSales).toBe(1000)
  })

  it('flowersIndex が undefined でも客数0で動作する', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(500) },
    }
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]
    const idx = makeSourceIndex(allAgg, undefined)

    const result = aggregateDailyByAlignment(idx, ['S1'], alignment)

    expect(result.totalCustomers).toBe(0)
    expect(result.totalSales).toBe(500)
  })

  it('discountRate が正しく計算される', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(1000, -100) },
    }
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]
    const idx = makeSourceIndex(allAgg, undefined)

    const result = aggregateDailyByAlignment(idx, ['S1'], alignment)

    // discountRate = safeDivide(-100, 1000) = -0.1
    expect(result.discountRate).toBeCloseTo(-0.1)
  })
})

// ── aggregateKpiByAlignment ──

describe('aggregateKpiByAlignment', () => {
  it('空の targetIds でゼロを返す', () => {
    const alignment = [makeAlignmentEntry(2025, 3, 1, 2026, 3, 1)]
    const idx = makeSourceIndex({}, undefined)
    const result = aggregateKpiByAlignment(idx, [], alignment)
    expect(result.sales).toBe(0)
    expect(result.customers).toBe(0)
    expect(result.transactionValue).toBe(0)
    expect(result.dailyMapping).toEqual([])
    expect(result.storeContributions).toEqual([])
  })

  it('空の alignmentMap でゼロを返す', () => {
    const idx = makeSourceIndex({}, undefined)
    const result = aggregateKpiByAlignment(idx, ['S1'], [])
    expect(result.sales).toBe(0)
  })

  it('1店舗・1日の基本KPI集計', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 5: makeSummary(2000, 0, 40) },
    }
    const flowers = makeFlowersIndex('S1', { 5: 40 })
    const alignment = [makeAlignmentEntry(2025, 3, 5, 2026, 3, 1)]
    const idx = makeSourceIndex(allAgg, flowers)

    const result = aggregateKpiByAlignment(idx, ['S1'], alignment)

    expect(result.sales).toBe(2000)
    expect(result.customers).toBe(40)
    expect(result.transactionValue).toBe(Math.round(2000 / 40))
    expect(result.dailyMapping).toHaveLength(1)
    expect(result.dailyMapping[0]).toEqual({
      prevDay: 5,
      prevMonth: 3,
      prevYear: 2025,
      currentDay: 1,
      prevSales: 2000,
      prevCustomers: 40,
      prevCtsQuantity: 0,
    })
    expect(result.storeContributions).toHaveLength(1)
    expect(result.storeContributions[0]).toEqual({
      storeId: 'S1',
      originalDay: 5,
      mappedDay: 1,
      sales: 2000,
      customers: 40,
      discount: 0,
      ctsQuantity: 0,
    })
  })

  it('複数店舗・複数日のKPI集計', () => {
    const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: { 1: makeSummary(1000, 0, 20), 2: makeSummary(1500, 0, 30) },
      S2: { 1: makeSummary(800, 0, 15), 2: makeSummary(1200, 0, 25) },
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
    const idx = makeSourceIndex(allAgg, flowers)

    const result = aggregateKpiByAlignment(idx, ['S1', 'S2'], alignment)

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
    const idx = makeSourceIndex(allAgg, undefined)

    const result = aggregateKpiByAlignment(idx, ['S1'], alignment)

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
    const idx = makeSourceIndex(allAgg, undefined)

    const result = aggregateKpiByAlignment(idx, ['S1'], alignment)

    expect(result.sales).toBe(500)
    expect(result.customers).toBe(0)
    // transactionValue = safeDivide(500, 0) = 0, rounded
    expect(result.transactionValue).toBe(0)
  })
})

// ── aggregateKpiByAlignment 不変条件（INV-AGG-*） ──

describe('aggregateKpiByAlignment 集約不変条件', () => {
  const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
    S1: {
      1: makeSummary(100000),
      2: makeSummary(120000),
      3: makeSummary(80000),
      15: makeSummary(200000),
      28: makeSummary(150000),
    },
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
  const idx = makeSourceIndex(allAgg, flowers)

  const entry = aggregateKpiByAlignment(idx, allIds, alignment)

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
    const emptyIdx = makeSourceIndex({}, undefined)
    const empty = aggregateKpiByAlignment(emptyIdx, [], alignment)
    expect(empty.sales).toBe(0)
    expect(empty.customers).toBe(0)
    expect(empty.transactionValue).toBe(0)
    expect(empty.dailyMapping).toHaveLength(0)
    expect(empty.storeContributions).toHaveLength(0)
  })

  it('一部店舗のみ選択しても不変条件1-4が成立', () => {
    const partial = aggregateKpiByAlignment(idx, ['S1'], alignment)
    expect(partial.storeContributions.reduce((s, c) => s + c.sales, 0)).toBe(partial.sales)
    expect(partial.storeContributions.reduce((s, c) => s + c.customers, 0)).toBe(partial.customers)
    expect(partial.dailyMapping.reduce((s, d) => s + d.prevSales, 0)).toBe(partial.sales)
    expect(partial.dailyMapping.reduce((s, d) => s + d.prevCustomers, 0)).toBe(partial.customers)
  })

  it('flowers データなしでも sales の不変条件は維持（customers=0）', () => {
    const noFlowersIdx = makeSourceIndex(allAgg, undefined)
    const noFlowers = aggregateKpiByAlignment(noFlowersIdx, allIds, alignment)
    expect(noFlowers.storeContributions.reduce((s, c) => s + c.sales, 0)).toBe(noFlowers.sales)
    expect(noFlowers.customers).toBe(0)
    expect(noFlowers.transactionValue).toBe(0)
  })
})

// ── 月跨ぎ: SourceDataIndex による正しいリナンバリング解決 ──
//
// 実シナリオ: 2026年2月 vs 2025年2月（同曜日比較、DOW offset=1）
//
// 2025年2月: 1日(土) 〜 28日(金) — 28日間
// 2026年2月: 1日(日) 〜 28日(土) — 28日間
// DOW offset = 1（日曜 - 土曜 = 1日ずれ）
//
// 同曜日 alignmentMap（period2 に offset 焼込済み）:
//   当期 2026/2/1(日) → 前年 2025/2/2(日)
//   当期 2026/2/2(月) → 前年 2025/2/3(月)
//   ...
//   当期 2026/2/27(金) → 前年 2025/2/28(金)
//   当期 2026/2/28(土) → 前年 2025/3/1(土)  ← 月跨ぎ！
//
// allAgg リナンバリング（mergeAdjacentMonthRecords）:
//   2025/2/1 → day=1, ..., 2025/2/28 → day=28
//   2025/3/1 → day=29（= 28 + 1）, 2025/3/2 → day=30, ...
//
// SourceDataIndex の変換:
//   source(2025,2,2) → 2（同月なのでそのまま）
//   source(2025,3,1) → 29（翌月: daysInMonth(28) + 1 = 29）

describe('月跨ぎ同曜日比較: 2026年2月 vs 2025年2月 (offset=1)', () => {
  // 1店舗・28日分の連続データ（日別売上は曜日パターン: 土日高め）
  // 2025年2月: 1日(土)〜28日(金)
  const feb2025DailySales = [
    // Week 1: 土,日,月,火,水,木,金
    2047609, 1800000, 1436878, 1523406, 1246231, 1276671, 1635982,
    // Week 2: 土,日,月,火,水,木,金
    2100000, 1850000, 1480000, 1560000, 1290000, 1310000, 1670000,
    // Week 3: 土,日,月,火,水,木,金
    2050000, 1820000, 1450000, 1540000, 1260000, 1295000, 1650000,
    // Week 4: 土,日,月,火,水,木,金
    2080000, 1830000, 1460000, 1550000, 1270000, 1300000, 1660000,
  ]
  // 2025年3月1日(土)の売上（翌月オーバーフロー、allAgg ではday=29）
  const mar1Sales = 2150000

  // allAgg: リナンバリング済み（day 1-28 = 2月、day 29 = 3月1日）
  const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
    S1: Object.fromEntries([
      ...feb2025DailySales.map((sales, i) => [i + 1, makeSummary(sales)] as const),
      [29, makeSummary(mar1Sales)], // 3月1日 → リナンバリング day=29
    ]),
  }

  const sourceMonthCtx: SourceMonthContext = {
    year: 2025,
    month: 2,
    daysInMonth: 28,
  }

  // SourceDataIndex を構築（リナンバリングを封じ込める）
  const idx = buildSourceDataIndex(allAgg, undefined, sourceMonthCtx)

  // 同日 alignmentMap: 2026/2/N → 2025/2/N（1:1）
  const sameDateAlignment = Array.from({ length: 28 }, (_, i) =>
    makeAlignmentEntry(2025, 2, i + 1, 2026, 2, i + 1),
  )

  // 同曜日 alignmentMap: offset=1 なので 2025/2/2 から始まり、最終日は 2025/3/1
  const sameDowAlignment = [
    ...Array.from({ length: 27 }, (_, i) => makeAlignmentEntry(2025, 2, i + 2, 2026, 2, i + 1)),
    makeAlignmentEntry(2025, 3, 1, 2026, 2, 28), // 月跨ぎ: 3月1日(土)
  ]

  // 期待値を手計算
  const sameDateExpectedSales = feb2025DailySales.reduce((s, v) => s + v, 0)
  // 同曜日: day 2-28 + 3月1日 = feb[1..27] + mar1Sales
  const sameDowExpectedSales = feb2025DailySales.slice(1).reduce((s, v) => s + v, 0) + mar1Sales

  it('同日KPI: 2月1日〜28日の合計が正しい', () => {
    const result = aggregateKpiByAlignment(idx, ['S1'], sameDateAlignment)

    expect(result.sales).toBe(sameDateExpectedSales)
    expect(result.dailyMapping).toHaveLength(28)
    // 1日目 = 2025/2/1(土) の売上
    expect(result.dailyMapping[0].prevSales).toBe(feb2025DailySales[0])
    // 最終日 = 2025/2/28(金) の売上
    expect(result.dailyMapping[27].prevSales).toBe(feb2025DailySales[27])
  })

  it('同曜日KPI: 2月2日〜28日 + 3月1日の合計（月跨ぎ含む）', () => {
    const result = aggregateKpiByAlignment(idx, ['S1'], sameDowAlignment)

    expect(result.sales).toBe(sameDowExpectedSales)
    expect(result.dailyMapping).toHaveLength(28)
    // 1日目 → prevDay は 2025/2/2(日)
    expect(result.dailyMapping[0].prevSales).toBe(feb2025DailySales[1]) // day 2
    // 最終日（当期2/28） → prevDay は 3月1日(土)、allAgg の day=29 から取得
    const lastEntry = result.dailyMapping[27]
    expect(lastEntry.currentDay).toBe(28)
    expect(lastEntry.prevSales).toBe(mar1Sales) // 3月1日の売上
  })

  it('同曜日と同日の売上が異なる（2/1 が外れ 3/1 が入る）', () => {
    const sameDateResult = aggregateKpiByAlignment(idx, ['S1'], sameDateAlignment)
    const sameDowResult = aggregateKpiByAlignment(idx, ['S1'], sameDowAlignment)

    // 同日: 2/1〜2/28、同曜日: 2/2〜2/28 + 3/1
    // 差分 = 3月1日の売上 - 2月1日の売上
    const expectedDiff = mar1Sales - feb2025DailySales[0]
    expect(sameDowResult.sales - sameDateResult.sales).toBe(expectedDiff)
    // 2つの値は等しくない
    expect(sameDowResult.sales).not.toBe(sameDateResult.sales)
  })

  it('aggregateDailyByAlignment も月跨ぎを正しく解決する', () => {
    const result = aggregateDailyByAlignment(idx, ['S1'], sameDowAlignment)

    expect(result.hasPrevYear).toBe(true)
    expect(result.totalSales).toBe(sameDowExpectedSales)
    expect(result.daily.size).toBe(28)

    // targetDate 2026-02-28 のエントリが 3月1日の売上を持つ
    const day28 = result.daily.get('2026-02-28')
    expect(day28).toBeDefined()
    expect(day28!.sales).toBe(mar1Sales)
  })

  it('不変条件: Σ(dailyMapping.prevSales) === entry.sales（月跨ぎでも）', () => {
    const result = aggregateKpiByAlignment(idx, ['S1'], sameDowAlignment)

    expect(result.dailyMapping.reduce((s, d) => s + d.prevSales, 0)).toBe(result.sales)
  })
})
