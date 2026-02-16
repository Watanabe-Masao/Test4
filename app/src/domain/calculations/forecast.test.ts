import { describe, it, expect } from 'vitest'
import {
  calculateStdDev,
  getWeekRanges,
  calculateWeeklySummaries,
  calculateDayOfWeekAverages,
  detectAnomalies,
  calculateForecast,
} from './forecast'

describe('calculateStdDev', () => {
  it('空配列の場合', () => {
    const { mean, stdDev } = calculateStdDev([])
    expect(mean).toBe(0)
    expect(stdDev).toBe(0)
  })

  it('単一要素の場合', () => {
    const { mean, stdDev } = calculateStdDev([5])
    expect(mean).toBe(5)
    expect(stdDev).toBe(0)
  })

  it('同じ値の場合', () => {
    const { mean, stdDev } = calculateStdDev([3, 3, 3])
    expect(mean).toBe(3)
    expect(stdDev).toBe(0)
  })

  it('標準的なケース', () => {
    const { mean, stdDev } = calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9])
    expect(mean).toBe(5)
    expect(stdDev).toBe(2)
  })
})

describe('getWeekRanges', () => {
  it('2026年2月（28日間・日曜始まり月）の週分割', () => {
    // 2026/2/1 = 日曜
    const weeks = getWeekRanges(2026, 2)
    expect(weeks.length).toBeGreaterThanOrEqual(4)
    expect(weeks[0].startDay).toBe(1)
    expect(weeks[weeks.length - 1].endDay).toBe(28)
  })

  it('週番号が連続すること', () => {
    const weeks = getWeekRanges(2026, 3)
    for (let i = 0; i < weeks.length; i++) {
      expect(weeks[i].weekNumber).toBe(i + 1)
    }
  })

  it('日が重複・欠損しないこと', () => {
    const weeks = getWeekRanges(2026, 1)
    const daysInMonth = 31
    const allDays = weeks.flatMap((w) => {
      const days: number[] = []
      for (let d = w.startDay; d <= w.endDay; d++) days.push(d)
      return days
    })
    expect(allDays.length).toBe(daysInMonth)
    expect(allDays[0]).toBe(1)
    expect(allDays[allDays.length - 1]).toBe(daysInMonth)
  })
})

describe('calculateWeeklySummaries', () => {
  it('基本的な週別サマリー', () => {
    const dailySales = new Map<number, number>()
    const dailyGrossProfit = new Map<number, number>()
    for (let d = 1; d <= 28; d++) {
      dailySales.set(d, 100_000)
      dailyGrossProfit.set(d, 25_000)
    }

    const summaries = calculateWeeklySummaries({
      year: 2026,
      month: 2,
      dailySales,
      dailyGrossProfit,
    })

    expect(summaries.length).toBeGreaterThanOrEqual(4)
    const totalSalesSum = summaries.reduce((s, w) => s + w.totalSales, 0)
    expect(totalSalesSum).toBe(2_800_000)
  })

  it('売上がない日の営業日数', () => {
    const dailySales = new Map<number, number>([
      [1, 100_000],
      [2, 0],
      [3, 200_000],
    ])

    const summaries = calculateWeeklySummaries({
      year: 2026,
      month: 2,
      dailySales,
      dailyGrossProfit: new Map(),
    })

    // 最初の週に日1-3が含まれるはず
    const firstWeek = summaries[0]
    // 売上>0の日のみカウント
    if (firstWeek.endDay >= 3) {
      expect(firstWeek.days).toBe(2) // day1, day3
    }
  })
})

describe('calculateDayOfWeekAverages', () => {
  it('曜日別平均を計算', () => {
    const dailySales = new Map<number, number>()
    // 2026年2月: 1日=日曜
    for (let d = 1; d <= 28; d++) {
      dailySales.set(d, d * 10_000) // 異なる値
    }

    const averages = calculateDayOfWeekAverages({
      year: 2026,
      month: 2,
      dailySales,
      dailyGrossProfit: new Map(),
    })

    expect(averages.length).toBe(7) // 0-6
    for (const avg of averages) {
      if (avg.count > 0) {
        expect(avg.averageSales).toBeGreaterThan(0)
      }
    }
  })

  it('売上0の日は除外', () => {
    const dailySales = new Map<number, number>([
      [1, 100_000],
      [2, 0],
      [3, 300_000],
    ])

    const averages = calculateDayOfWeekAverages({
      year: 2026,
      month: 2,
      dailySales,
      dailyGrossProfit: new Map(),
    })

    const totalCount = averages.reduce((s, a) => s + a.count, 0)
    expect(totalCount).toBe(2) // 売上>0のみ
  })
})

describe('detectAnomalies', () => {
  it('異常値を検出', () => {
    const dailySales = new Map<number, number>()
    for (let d = 1; d <= 20; d++) {
      dailySales.set(d, 200_000) // 均一
    }
    dailySales.set(21, 1_000_000) // 異常値

    const anomalies = detectAnomalies(dailySales, 2.0)
    expect(anomalies.length).toBeGreaterThanOrEqual(1)
    expect(anomalies.some((a) => a.day === 21)).toBe(true)
  })

  it('データが3件未満の場合は空', () => {
    const dailySales = new Map<number, number>([
      [1, 100_000],
      [2, 200_000],
    ])
    const anomalies = detectAnomalies(dailySales, 2.0)
    expect(anomalies.length).toBe(0)
  })

  it('全て同じ値の場合（標準偏差0）', () => {
    const dailySales = new Map<number, number>()
    for (let d = 1; d <= 10; d++) {
      dailySales.set(d, 100_000)
    }
    const anomalies = detectAnomalies(dailySales, 2.0)
    expect(anomalies.length).toBe(0)
  })

  it('閾値によるフィルタリング', () => {
    const dailySales = new Map<number, number>()
    for (let d = 1; d <= 10; d++) {
      dailySales.set(d, 100_000)
    }
    dailySales.set(11, 300_000) // やや高い

    // 低い閾値で検出
    const anomaliesLow = detectAnomalies(dailySales, 1.0)
    // 高い閾値では検出されない可能性
    const anomaliesHigh = detectAnomalies(dailySales, 5.0)
    expect(anomaliesLow.length).toBeGreaterThanOrEqual(anomaliesHigh.length)
  })
})

describe('calculateForecast', () => {
  it('統合結果を返す', () => {
    const dailySales = new Map<number, number>()
    const dailyGrossProfit = new Map<number, number>()
    for (let d = 1; d <= 28; d++) {
      dailySales.set(d, 200_000)
      dailyGrossProfit.set(d, 50_000)
    }

    const result = calculateForecast({
      year: 2026,
      month: 2,
      dailySales,
      dailyGrossProfit,
    })

    expect(result.weeklySummaries.length).toBeGreaterThanOrEqual(4)
    expect(result.dayOfWeekAverages.length).toBe(7)
    // 均一データなので異常値なし
    expect(result.anomalies.length).toBe(0)
  })
})
