import { describe, it, expect } from 'vitest'
import {
  buildDowCustomerAverages,
  buildDailyCustomerData,
  type DailyCustomerEntry,
} from './ForecastPage.helpers'
import type { PrevYearData } from '@/application/hooks'

describe('buildDowCustomerAverages', () => {
  it('曜日は指定された year/month に基づいて正しく割り当てられる', () => {
    // 2026年1月: 1日=木曜日
    const entries: DailyCustomerEntry[] = [
      { day: 1, sales: 1000, customers: 10, txValue: 100, prevCustomers: 8, prevSales: 800, prevTxValue: 100 },
      { day: 2, sales: 1200, customers: 12, txValue: 100, prevCustomers: 9, prevSales: 900, prevTxValue: 100 },
      { day: 3, sales: 1100, customers: 11, txValue: 100, prevCustomers: 10, prevSales: 1000, prevTxValue: 100 },
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
      { day: 1, sales: 1000, customers: 10, txValue: 100, prevCustomers: 8, prevSales: 800, prevTxValue: 100 },
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
      { day: 1, sales: 1000, customers: 10, txValue: 100, prevCustomers: 8, prevSales: 800, prevTxValue: 100 },
      { day: 8, sales: 1200, customers: 12, txValue: 100, prevCustomers: 10, prevSales: 1000, prevTxValue: 100 },
      { day: 15, sales: 1100, customers: 11, txValue: 100, prevCustomers: 9, prevSales: 900, prevTxValue: 100 },
      { day: 22, sales: 900, customers: 9, txValue: 100, prevCustomers: 7, prevSales: 700, prevTxValue: 100 },
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

    const prevYearDaily = new Map<number, { sales: number; discount: number; customers: number }>()
    prevYearDaily.set(1, { sales: 800, discount: 0, customers: 8 })
    prevYearDaily.set(2, { sales: 900, discount: 0, customers: 9 })

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

    const entries = buildDailyCustomerData(daily as never, prevYear)
    expect(entries).toHaveLength(2)
    expect(entries[0].prevCustomers).toBe(8)
    expect(entries[0].prevSales).toBe(800)
    expect(entries[1].prevCustomers).toBe(9)
    expect(entries[1].prevSales).toBe(900)
  })
})
