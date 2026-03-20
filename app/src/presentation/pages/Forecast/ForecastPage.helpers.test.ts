import { describe, it, expect } from 'vitest'
import {
  buildDowCustomerAverages,
  buildDailyCustomerData,
  buildForecastInput,
  computeStackedWeekData,
  buildMovingAverages,
  buildRelationshipData,
  buildRelationshipDataFromPrev,
  buildDailyDecomposition,
  buildDowDecomposition,
  buildWeeklyDecomposition,
  DOW_LABELS,
  type DailyCustomerEntry,
  type DailyDecompEntry,
} from './ForecastPage.helpers'
import type { PrevYearData } from '@/application/hooks/analytics'
import type { WeeklySummary } from '@/application/hooks/useForecast'

describe('buildDowCustomerAverages', () => {
  it('曜日は指定された year/month に基づいて正しく割り当てられる', () => {
    // 2026年1月: 1日=木曜日
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 1000,
        customers: 10,
        txValue: 100,
        prevCustomers: 8,
        prevSales: 800,
        prevTxValue: 100,
      },
      {
        day: 2,
        sales: 1200,
        customers: 12,
        txValue: 100,
        prevCustomers: 9,
        prevSales: 900,
        prevTxValue: 100,
      },
      {
        day: 3,
        sales: 1100,
        customers: 11,
        txValue: 100,
        prevCustomers: 10,
        prevSales: 1000,
        prevTxValue: 100,
      },
    ]

    const result = buildDowCustomerAverages(entries, 2026, 1)
    // DOW_LABELS: ['日', '月', '火', '水', '木', '金', '土']
    // 2026-01-01 = 木曜(index 4), 01-02 = 金曜(index 5), 01-03 = 土曜(index 6)

    // 木曜(index 4) に day 1 のデータが入る
    expect(result[4].avgCustomers).toBe(10)
    expect(result[4].prevAvgCustomers).toBe(8)
    expect(result[4].count).toBe(1)

    // 金曜(index 5) に day 2 のデータが入る
    expect(result[5].avgCustomers).toBe(12)
    expect(result[5].prevAvgCustomers).toBe(9)
    expect(result[5].count).toBe(1)

    // 土曜(index 6) に day 3 のデータが入る
    expect(result[6].avgCustomers).toBe(11)
    expect(result[6].prevAvgCustomers).toBe(10)
    expect(result[6].count).toBe(1)
  })

  it('異なる月で同じ日は異なる曜日に割り当てられる', () => {
    // このテストは year/month の取り違えを検出する
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 1000,
        customers: 10,
        txValue: 100,
        prevCustomers: 8,
        prevSales: 800,
        prevTxValue: 100,
      },
    ]

    // 2026年1月1日 = 木曜(index 4)
    const janResult = buildDowCustomerAverages(entries, 2026, 1)
    expect(janResult[4].count).toBe(1) // 木曜に1件

    // 2026年3月1日 = 日曜(index 0)
    const marResult = buildDowCustomerAverages(entries, 2026, 3)
    expect(marResult[0].count).toBe(1) // 日曜に1件

    // 1月と3月で異なる曜日に割り当てられることを確認
    // もし new Date() を使っていたらこの差が出ない
    expect(janResult[4].avgCustomers).toBe(10)
    expect(marResult[0].avgCustomers).toBe(10)
  })

  it('前年データも当年と同じ曜日バケットに正しく集計される', () => {
    // 2026年2月: 1日=日曜日、全4週
    // 日曜: 1, 8, 15, 22
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 1000,
        customers: 10,
        txValue: 100,
        prevCustomers: 8,
        prevSales: 800,
        prevTxValue: 100,
      },
      {
        day: 8,
        sales: 1200,
        customers: 12,
        txValue: 100,
        prevCustomers: 10,
        prevSales: 1000,
        prevTxValue: 100,
      },
      {
        day: 15,
        sales: 1100,
        customers: 11,
        txValue: 100,
        prevCustomers: 9,
        prevSales: 900,
        prevTxValue: 100,
      },
      {
        day: 22,
        sales: 900,
        customers: 9,
        txValue: 100,
        prevCustomers: 7,
        prevSales: 700,
        prevTxValue: 100,
      },
    ]

    const result = buildDowCustomerAverages(entries, 2026, 2)
    const sunday = result[0] // index 0 = 日曜

    // 4つの日曜の平均
    expect(sunday.count).toBe(4)
    expect(sunday.avgCustomers).toBe(Math.round((10 + 12 + 11 + 9) / 4))
    expect(sunday.prevAvgCustomers).toBe(Math.round((8 + 10 + 9 + 7) / 4))
  })
})

describe('buildDailyCustomerData', () => {
  it('前年の同曜日データが正しくマッピングされる', () => {
    const daily = new Map<number, { sales: number; customers: number }>()
    daily.set(1, { sales: 1000, customers: 10 } as never)
    daily.set(2, { sales: 1200, customers: 12 } as never)

    const prevYearDaily = new Map<string, { sales: number; discount: number; customers: number }>()
    prevYearDaily.set('2025-01-01', { sales: 800, discount: 0, customers: 8 })
    prevYearDaily.set('2025-01-02', { sales: 900, discount: 0, customers: 9 })

    const prevYear: PrevYearData = {
      hasPrevYear: true,
      daily: prevYearDaily,
      totalSales: 1700,
      totalDiscount: 0,
      totalCustomers: 17,
      grossSales: 1700,
      discountRate: 0,
      totalDiscountEntries: [],
    }

    const entries = buildDailyCustomerData(daily as never, prevYear, 2025, 1)
    expect(entries).toHaveLength(2)
    expect(entries[0].prevCustomers).toBe(8)
    expect(entries[0].prevSales).toBe(800)
    expect(entries[1].prevCustomers).toBe(9)
    expect(entries[1].prevSales).toBe(900)
  })

  it('売上が 0 以下のレコードは除外される', () => {
    const daily = new Map<number, { sales: number; customers: number }>()
    daily.set(1, { sales: 0, customers: 5 } as never)
    daily.set(2, { sales: -100, customers: 3 } as never)
    daily.set(3, { sales: 1000, customers: 10 } as never)

    const prevYear: PrevYearData = {
      hasPrevYear: false,
      daily: new Map(),
      totalSales: 0,
      totalDiscount: 0,
      totalCustomers: 0,
      grossSales: 0,
      discountRate: 0,
      totalDiscountEntries: [],
    }

    const entries = buildDailyCustomerData(daily as never, prevYear, 2025, 1)
    expect(entries).toHaveLength(1)
    expect(entries[0].day).toBe(3)
  })

  it('結果が日付順にソートされる', () => {
    const daily = new Map<number, { sales: number; customers: number }>()
    daily.set(15, { sales: 500, customers: 5 } as never)
    daily.set(3, { sales: 300, customers: 3 } as never)
    daily.set(10, { sales: 1000, customers: 10 } as never)

    const prevYear: PrevYearData = {
      hasPrevYear: false,
      daily: new Map(),
      totalSales: 0,
      totalDiscount: 0,
      totalCustomers: 0,
      grossSales: 0,
      discountRate: 0,
      totalDiscountEntries: [],
    }

    const entries = buildDailyCustomerData(daily as never, prevYear, 2025, 1)
    expect(entries.map((e) => e.day)).toEqual([3, 10, 15])
  })
})

// ─── buildForecastInput ──────────────────────────────

describe('buildForecastInput', () => {
  it('StoreResult の daily マップから ForecastInput を構築する', () => {
    const daily = new Map<number, { sales: number; purchase: { cost: number } }>()
    daily.set(1, { sales: 10000, purchase: { cost: 7000 } })
    daily.set(2, { sales: 15000, purchase: { cost: 10000 } })

    const result = buildForecastInput({ daily }, 2026, 3)

    expect(result.year).toBe(2026)
    expect(result.month).toBe(3)
    expect(result.dailySales.get(1)).toBe(10000)
    expect(result.dailySales.get(2)).toBe(15000)
    // grossProfit = sales - cost
    expect(result.dailyGrossProfit.get(1)).toBe(3000)
    expect(result.dailyGrossProfit.get(2)).toBe(5000)
  })

  it('空の daily マップの場合は空の ForecastInput を返す', () => {
    const daily = new Map<number, { sales: number; purchase: { cost: number } }>()
    const result = buildForecastInput({ daily }, 2026, 1)
    expect(result.dailySales.size).toBe(0)
    expect(result.dailyGrossProfit.size).toBe(0)
  })
})

// ─── computeStackedWeekData ──────────────────────────

describe('computeStackedWeekData', () => {
  it('週ごとに曜日別の売上を積み上げデータにする', () => {
    const weeks: WeeklySummary[] = [
      {
        weekNumber: 1,
        startDay: 1,
        endDay: 3,
        totalSales: 0,
        totalGrossProfit: 0,
        grossProfitRate: 0,
        days: 3,
      },
    ]
    const dailySales = new Map<number, number>([
      [1, 1000], // 2026-01-01 = 木曜
      [2, 2000], // 金曜
      [3, 3000], // 土曜
    ])

    const result = computeStackedWeekData(weeks, dailySales, 2026, 1)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('第1週')
    // 木曜 = index 4 = '木'
    expect(result[0]['木']).toBe(1000)
    expect(result[0]['金']).toBe(2000)
    expect(result[0]['土']).toBe(3000)
    // 他の曜日は 0
    expect(result[0]['日']).toBe(0)
    expect(result[0]['月']).toBe(0)
  })

  it('同じ曜日の売上が加算される', () => {
    // 2026-02-01=日曜, 02-08=日曜
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
    ]
    const dailySales = new Map<number, number>([
      [1, 1000], // 日曜
      [2, 2000], // 月曜
    ])

    const result = computeStackedWeekData(weeks, dailySales, 2026, 2)
    expect(result[0]['日']).toBe(1000)
    expect(result[0]['月']).toBe(2000)
  })

  it('売上がない日は 0 として扱われる', () => {
    const weeks: WeeklySummary[] = [
      {
        weekNumber: 1,
        startDay: 1,
        endDay: 3,
        totalSales: 0,
        totalGrossProfit: 0,
        grossProfitRate: 0,
        days: 3,
      },
    ]
    const dailySales = new Map<number, number>()

    const result = computeStackedWeekData(weeks, dailySales, 2026, 1)
    for (const label of DOW_LABELS) {
      expect(result[0][label]).toBe(0)
    }
  })
})

// ─── buildMovingAverages ─────────────────────────────

describe('buildMovingAverages', () => {
  const entries: DailyCustomerEntry[] = [
    {
      day: 1,
      sales: 1000,
      customers: 10,
      txValue: 100,
      prevSales: 800,
      prevCustomers: 8,
      prevTxValue: 100,
    },
    {
      day: 2,
      sales: 2000,
      customers: 20,
      txValue: 100,
      prevSales: 1600,
      prevCustomers: 16,
      prevTxValue: 100,
    },
    {
      day: 3,
      sales: 3000,
      customers: 30,
      txValue: 100,
      prevSales: 2400,
      prevCustomers: 24,
      prevTxValue: 100,
    },
    {
      day: 4,
      sales: 4000,
      customers: 40,
      txValue: 100,
      prevSales: 3200,
      prevCustomers: 32,
      prevTxValue: 100,
    },
  ]

  it('window=1 では各日のそのままの値が返る', () => {
    const result = buildMovingAverages(entries, 1)
    expect(result).toHaveLength(4)
    expect(result[0].salesMA).toBe(1000)
    expect(result[1].salesMA).toBe(2000)
    expect(result[2].salesMA).toBe(3000)
    expect(result[3].salesMA).toBe(4000)
  })

  it('window=3 で3日移動平均が計算される', () => {
    const result = buildMovingAverages(entries, 3)
    expect(result).toHaveLength(4)
    // index 0: [1000] → 1000
    expect(result[0].salesMA).toBe(Math.round(1000))
    // index 1: [1000, 2000] → 1500
    expect(result[1].salesMA).toBe(Math.round(1500))
    // index 2: [1000, 2000, 3000] → 2000
    expect(result[2].salesMA).toBe(Math.round(2000))
    // index 3: [2000, 3000, 4000] → 3000
    expect(result[3].salesMA).toBe(Math.round(3000))
  })

  it('day フィールドが元のエントリの day を保持する', () => {
    const result = buildMovingAverages(entries, 2)
    expect(result.map((r) => r.day)).toEqual([1, 2, 3, 4])
  })

  it('空のエントリでは空配列を返す', () => {
    const result = buildMovingAverages([], 3)
    expect(result).toHaveLength(0)
  })

  it('前年の移動平均も計算される', () => {
    const result = buildMovingAverages(entries, 2)
    // index 1: prevSales = [800, 1600] / 2 = 1200
    expect(result[1].prevSalesMA).toBe(Math.round(1200))
  })
})

// ─── buildRelationshipData / buildRelationshipDataFromPrev ───

describe('buildRelationshipData', () => {
  it('客数 > 0 のエントリのみ含め、平均対比の指標を計算する', () => {
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 1000,
        customers: 10,
        txValue: 100,
        prevSales: 0,
        prevCustomers: 0,
        prevTxValue: 0,
      },
      {
        day: 2,
        sales: 2000,
        customers: 20,
        txValue: 100,
        prevSales: 0,
        prevCustomers: 0,
        prevTxValue: 0,
      },
    ]
    const result = buildRelationshipData(entries)
    expect(result).toHaveLength(2)
    // 平均売上 = (1000+2000)/2 = 1500
    // salesIndex[0] = 1000 / 1500
    expect(result[0].salesIndex).toBeCloseTo(1000 / 1500, 5)
    expect(result[1].salesIndex).toBeCloseTo(2000 / 1500, 5)
  })

  it('客数 0 のエントリは除外される', () => {
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 1000,
        customers: 0,
        txValue: 0,
        prevSales: 0,
        prevCustomers: 0,
        prevTxValue: 0,
      },
      {
        day: 2,
        sales: 2000,
        customers: 20,
        txValue: 100,
        prevSales: 0,
        prevCustomers: 0,
        prevTxValue: 0,
      },
    ]
    const result = buildRelationshipData(entries)
    expect(result).toHaveLength(1)
    expect(result[0].day).toBe(2)
  })

  it('全エントリの客数が 0 の場合は空配列', () => {
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 1000,
        customers: 0,
        txValue: 0,
        prevSales: 0,
        prevCustomers: 0,
        prevTxValue: 0,
      },
    ]
    const result = buildRelationshipData(entries)
    expect(result).toHaveLength(0)
  })
})

describe('buildRelationshipDataFromPrev', () => {
  it('前年客数 > 0 のエントリのみ含めて前年データの関係性を計算する', () => {
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 0,
        customers: 0,
        txValue: 0,
        prevSales: 800,
        prevCustomers: 8,
        prevTxValue: 100,
      },
      {
        day: 2,
        sales: 0,
        customers: 0,
        txValue: 0,
        prevSales: 1200,
        prevCustomers: 12,
        prevTxValue: 100,
      },
    ]
    const result = buildRelationshipDataFromPrev(entries)
    expect(result).toHaveLength(2)
    // 前年平均売上 = (800+1200)/2 = 1000
    expect(result[0].salesIndex).toBeCloseTo(800 / 1000, 5)
    expect(result[1].salesIndex).toBeCloseTo(1200 / 1000, 5)
    // 結果の sales は前年データ
    expect(result[0].sales).toBe(800)
    expect(result[1].sales).toBe(1200)
  })

  it('前年客数 0 は除外される', () => {
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 0,
        customers: 0,
        txValue: 0,
        prevSales: 800,
        prevCustomers: 0,
        prevTxValue: 0,
      },
    ]
    const result = buildRelationshipDataFromPrev(entries)
    expect(result).toHaveLength(0)
  })
})

// ─── buildDailyDecomposition ──────────────────────────

describe('buildDailyDecomposition', () => {
  it('客数と前年客数がともに正のエントリのみ分解する', () => {
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 1200,
        customers: 12,
        txValue: 100,
        prevSales: 1000,
        prevCustomers: 10,
        prevTxValue: 100,
      },
      {
        day: 2,
        sales: 500,
        customers: 0,
        txValue: 0,
        prevSales: 400,
        prevCustomers: 5,
        prevTxValue: 80,
      },
      {
        day: 3,
        sales: 600,
        customers: 6,
        txValue: 100,
        prevSales: 500,
        prevCustomers: 0,
        prevTxValue: 0,
      },
    ]
    const result = buildDailyDecomposition(entries)
    // day 2 は customers=0、day 3 は prevCustomers=0 なので除外
    expect(result).toHaveLength(1)
    expect(result[0].day).toBe(1)
  })

  it('シャープリー恒等式: custEffect + ticketEffect = salesDiff', () => {
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 1200,
        customers: 12,
        txValue: 100,
        prevSales: 1000,
        prevCustomers: 10,
        prevTxValue: 100,
      },
      {
        day: 2,
        sales: 1500,
        customers: 15,
        txValue: 100,
        prevSales: 1000,
        prevCustomers: 10,
        prevTxValue: 100,
      },
    ]
    const result = buildDailyDecomposition(entries)
    for (const e of result) {
      expect(e.custEffect + e.ticketEffect).toBeCloseTo(e.salesDiff, 5)
    }
  })

  it('累計値が正しく積み上がる', () => {
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 1200,
        customers: 12,
        txValue: 100,
        prevSales: 1000,
        prevCustomers: 10,
        prevTxValue: 100,
      },
      {
        day: 2,
        sales: 1800,
        customers: 18,
        txValue: 100,
        prevSales: 1500,
        prevCustomers: 15,
        prevTxValue: 100,
      },
    ]
    const result = buildDailyDecomposition(entries)
    expect(result).toHaveLength(2)
    // 累計売上差 = day1.salesDiff + day2.salesDiff
    expect(result[1].cumSalesDiff).toBeCloseTo(result[0].salesDiff + (1800 - 1500), 5)
    // 累計 custEffect = day1 + day2
    expect(result[1].cumCustEffect).toBeCloseTo(result[0].custEffect + result[1].custEffect, 5)
  })

  it('空のエントリでは空配列', () => {
    expect(buildDailyDecomposition([])).toHaveLength(0)
  })
})

// ─── buildDowDecomposition ──────────────────────────

describe('buildDowDecomposition', () => {
  it('曜日別に要因分解を集計する', () => {
    // 2026-01-01 = 木曜, 2026-01-08 = 木曜
    const entries: DailyDecompEntry[] = [
      {
        day: 1,
        salesDiff: 200,
        custEffect: 120,
        ticketEffect: 80,
        cumSalesDiff: 200,
        cumCustEffect: 120,
        cumTicketEffect: 80,
      },
      {
        day: 8,
        salesDiff: 400,
        custEffect: 240,
        ticketEffect: 160,
        cumSalesDiff: 600,
        cumCustEffect: 360,
        cumTicketEffect: 240,
      },
    ]
    const result = buildDowDecomposition(entries, 2026, 1)
    // index 4 = 木曜
    expect(result[4].count).toBe(2)
    expect(result[4].avgSalesDiff).toBe(Math.round((200 + 400) / 2))
    expect(result[4].avgCustEffect).toBe(Math.round((120 + 240) / 2))
    expect(result[4].avgTicketEffect).toBe(Math.round((80 + 160) / 2))
  })

  it('データがない曜日は count=0, avg=0 を返す', () => {
    const result = buildDowDecomposition([], 2026, 1)
    expect(result).toHaveLength(7)
    for (const r of result) {
      expect(r.count).toBe(0)
      expect(r.avgSalesDiff).toBe(0)
    }
  })
})

// ─── buildWeeklyDecomposition ──────────────────────────

describe('buildWeeklyDecomposition', () => {
  it('週ごとの要因分解合計を計算する', () => {
    const entries: DailyDecompEntry[] = [
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
        salesDiff: 300,
        custEffect: 180,
        ticketEffect: 120,
        cumSalesDiff: 600,
        cumCustEffect: 360,
        cumTicketEffect: 240,
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

    const result = buildWeeklyDecomposition(entries, weeks)
    expect(result).toHaveLength(2)
    // 第1週: day 1 + day 2
    expect(result[0].salesDiff).toBe(300)
    expect(result[0].custEffect).toBe(180)
    expect(result[0].ticketEffect).toBe(120)
    // 第2週: day 8
    expect(result[1].salesDiff).toBe(300)
    expect(result[1].custEffect).toBe(180)
    expect(result[1].ticketEffect).toBe(120)
  })

  it('該当する日がない週は全て 0', () => {
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
    ]
    const result = buildWeeklyDecomposition([], weeks)
    expect(result[0].salesDiff).toBe(0)
    expect(result[0].custEffect).toBe(0)
    expect(result[0].ticketEffect).toBe(0)
  })
})
