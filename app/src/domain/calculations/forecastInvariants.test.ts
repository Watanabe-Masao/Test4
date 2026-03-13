import { describe, it, expect } from 'vitest'
import {
  calculateWeeklySummaries,
  calculateDayOfWeekAverages,
  getWeekRanges,
  calculateForecast,
} from './forecast'
import { linearRegression, calculateMonthEndProjection } from './algorithms/advancedForecast'
import { analyzeTrend } from './algorithms/trendAnalysis'
import type { MonthlyDataPoint } from './algorithms/trendAnalysis'

/**
 * Forecast 不変条件テスト
 *
 * WASM 移行後も TS テストで検証し続ける数学的・業務的性質。
 * cross-validation (dual-run compare) のベースラインとなる。
 */

describe('forecast invariants', () => {
  // ── F-INV-4: 週合計 == 日合計 ──────────────────────
  describe('F-INV-4: weekly sales sum equals daily sales sum', () => {
    it('均一売上', () => {
      const dailySales = new Map<number, number>()
      const dailyGrossProfit = new Map<number, number>()
      for (let d = 1; d <= 31; d++) {
        dailySales.set(d, 100_000)
        dailyGrossProfit.set(d, 25_000)
      }

      const summaries = calculateWeeklySummaries({
        year: 2026,
        month: 1,
        dailySales,
        dailyGrossProfit,
      })

      const weeklyTotal = summaries.reduce((s, w) => s + w.totalSales, 0)
      const dailyTotal = Array.from(dailySales.values()).reduce((s, v) => s + v, 0)
      expect(weeklyTotal).toBe(dailyTotal)

      const weeklyGPTotal = summaries.reduce((s, w) => s + w.totalGrossProfit, 0)
      const dailyGPTotal = Array.from(dailyGrossProfit.values()).reduce((s, v) => s + v, 0)
      expect(weeklyGPTotal).toBe(dailyGPTotal)
    })

    it('歯抜けデータ', () => {
      const dailySales = new Map<number, number>([
        [1, 150_000],
        [5, 200_000],
        [10, 300_000],
        [20, 100_000],
        [28, 250_000],
      ])
      const dailyGrossProfit = new Map<number, number>()

      const summaries = calculateWeeklySummaries({
        year: 2026,
        month: 2,
        dailySales,
        dailyGrossProfit,
      })

      const weeklyTotal = summaries.reduce((s, w) => s + w.totalSales, 0)
      const dailyTotal = Array.from(dailySales.values()).reduce((s, v) => s + v, 0)
      expect(weeklyTotal).toBe(dailyTotal)
    })
  })

  // ── F-INV-5: 週範囲の完全カバー（閏年含む） ──────
  describe('F-INV-5: week ranges cover all days without gaps or overlaps', () => {
    const testCases = [
      { year: 2026, month: 1, daysInMonth: 31, label: '31日月' },
      { year: 2026, month: 2, daysInMonth: 28, label: '28日月（平年2月）' },
      { year: 2024, month: 2, daysInMonth: 29, label: '29日月（閏年2月）' },
      { year: 2026, month: 4, daysInMonth: 30, label: '30日月' },
    ]

    for (const { year, month, daysInMonth, label } of testCases) {
      it(label, () => {
        const weeks = getWeekRanges(year, month)

        // 全日をフラット化
        const allDays: number[] = []
        for (const w of weeks) {
          for (let d = w.startDay; d <= w.endDay; d++) {
            allDays.push(d)
          }
        }

        // 隙間なし・重複なし
        expect(allDays.length).toBe(daysInMonth)
        expect(allDays[0]).toBe(1)
        expect(allDays[allDays.length - 1]).toBe(daysInMonth)

        // 連続性チェック
        for (let i = 1; i < allDays.length; i++) {
          expect(allDays[i]).toBe(allDays[i - 1] + 1)
        }
      })
    }
  })

  // ── F-INV-7: 曜日別カウント合計 == 売上>0 の日数 ──
  describe('F-INV-7: day-of-week count sum equals active days', () => {
    it('全日営業', () => {
      const dailySales = new Map<number, number>()
      for (let d = 1; d <= 28; d++) {
        dailySales.set(d, d * 10_000)
      }

      const averages = calculateDayOfWeekAverages({
        year: 2026,
        month: 2,
        dailySales,
        dailyGrossProfit: new Map(),
      })

      const totalCount = averages.reduce((s, a) => s + a.count, 0)
      expect(totalCount).toBe(28)
    })

    it('休業日あり', () => {
      const dailySales = new Map<number, number>()
      let activeDays = 0
      for (let d = 1; d <= 28; d++) {
        const sales = d % 7 === 0 ? 0 : 100_000 // 毎7日目は休業
        dailySales.set(d, sales)
        if (sales > 0) activeDays++
      }

      const averages = calculateDayOfWeekAverages({
        year: 2026,
        month: 2,
        dailySales,
        dailyGrossProfit: new Map(),
      })

      const totalCount = averages.reduce((s, a) => s + a.count, 0)
      expect(totalCount).toBe(activeDays)
    })
  })

  // ── F-INV-8: 0 <= R² <= 1 ─────────────────────────
  describe('F-INV-8: R-squared is in [0, 1]', () => {
    it('完全線形データ', () => {
      const sales = new Map<number, number>()
      for (let d = 1; d <= 20; d++) {
        sales.set(d, 100 * d + 500)
      }
      const result = linearRegression(sales)
      expect(result.rSquared).toBeGreaterThanOrEqual(0)
      expect(result.rSquared).toBeLessThanOrEqual(1)
      expect(result.rSquared).toBeCloseTo(1.0, 5)
    })

    it('ランダム風データ', () => {
      const sales = new Map<number, number>([
        [1, 100_000],
        [2, 300_000],
        [3, 50_000],
        [4, 400_000],
        [5, 200_000],
        [6, 350_000],
        [7, 150_000],
      ])
      const result = linearRegression(sales)
      expect(result.rSquared).toBeGreaterThanOrEqual(0)
      expect(result.rSquared).toBeLessThanOrEqual(1)
    })

    it('同一値データ (R²=0)', () => {
      const sales = new Map<number, number>()
      for (let d = 1; d <= 10; d++) {
        sales.set(d, 100_000)
      }
      const result = linearRegression(sales)
      expect(result.rSquared).toBe(0)
    })
  })

  // ── F-INV-11: 信頼区間の順序 ─────────────────────
  describe('F-INV-11: confidence interval lower <= upper', () => {
    it('通常データ', () => {
      const sales = new Map<number, number>()
      for (let d = 1; d <= 20; d++) {
        sales.set(d, 100_000 + d * 1_000)
      }
      const result = calculateMonthEndProjection(2026, 1, sales)
      expect(result.confidenceInterval.lower).toBeLessThanOrEqual(result.confidenceInterval.upper)
    })

    it('空データ', () => {
      const result = calculateMonthEndProjection(2026, 1, new Map())
      expect(result.confidenceInterval.lower).toBeLessThanOrEqual(result.confidenceInterval.upper)
    })

    it('1日分のみ', () => {
      const sales = new Map<number, number>([[1, 500_000]])
      const result = calculateMonthEndProjection(2026, 1, sales)
      expect(result.confidenceInterval.lower).toBeLessThanOrEqual(result.confidenceInterval.upper)
    })
  })

  // ── F-INV-12: seasonalIndex の長さ == 12 ──────────
  describe('F-INV-12: seasonalIndex length is always 12', () => {
    it('空データ', () => {
      const result = analyzeTrend([])
      expect(result.seasonalIndex).toHaveLength(12)
    })

    it('1ヶ月分', () => {
      const dp: MonthlyDataPoint = {
        year: 2026,
        month: 1,
        totalSales: 1_000_000,
        totalCustomers: 500,
        grossProfit: 250_000,
        grossProfitRate: 0.25,
        budget: 1_200_000,
        budgetAchievement: 0.83,
        storeCount: 1,
        discountRate: null,
        costRate: null,
        costInclusionRate: null,
        averageMarkupRate: null,
      }
      const result = analyzeTrend([dp])
      expect(result.seasonalIndex).toHaveLength(12)
    })

    it('12ヶ月分', () => {
      const dps: MonthlyDataPoint[] = Array.from({ length: 12 }, (_, i) => ({
        year: 2025,
        month: i + 1,
        totalSales: 1_000_000 + i * 50_000,
        totalCustomers: 500,
        grossProfit: 250_000,
        grossProfitRate: 0.25,
        budget: null,
        budgetAchievement: null,
        storeCount: 1,
        discountRate: null,
        costRate: null,
        costInclusionRate: null,
        averageMarkupRate: null,
      }))
      const result = analyzeTrend(dps)
      expect(result.seasonalIndex).toHaveLength(12)
    })
  })

  // ── F-INV-13: overallTrend は列挙値 ───────────────
  describe('F-INV-13: overallTrend is one of up/down/flat', () => {
    const validTrends = ['up', 'down', 'flat']

    it('空データ → flat', () => {
      expect(analyzeTrend([]).overallTrend).toBe('flat')
    })

    it('増加トレンド → up', () => {
      const dps: MonthlyDataPoint[] = Array.from({ length: 6 }, (_, i) => ({
        year: 2025,
        month: i + 1,
        totalSales: 1_000_000 * (i + 1),
        totalCustomers: null,
        grossProfit: null,
        grossProfitRate: null,
        budget: null,
        budgetAchievement: null,
        storeCount: 1,
        discountRate: null,
        costRate: null,
        costInclusionRate: null,
        averageMarkupRate: null,
      }))
      const result = analyzeTrend(dps)
      expect(validTrends).toContain(result.overallTrend)
      expect(result.overallTrend).toBe('up')
    })
  })

  // ── F-BIZ-2: 予測値の非負 ─────────────────────────
  describe('F-BIZ-2: projection values are non-negative', () => {
    it('通常データで非負', () => {
      const sales = new Map<number, number>()
      for (let d = 1; d <= 15; d++) {
        sales.set(d, 100_000)
      }
      const result = calculateMonthEndProjection(2026, 1, sales)
      expect(result.linearProjection).toBeGreaterThanOrEqual(0)
      expect(result.dowAdjustedProjection).toBeGreaterThanOrEqual(0)
      expect(result.wmaProjection).toBeGreaterThanOrEqual(0)
      expect(result.confidenceInterval.lower).toBeGreaterThanOrEqual(0)
    })
  })

  // ── calculateForecast 統合不変条件 ────────────────
  describe('calculateForecast integrated invariants', () => {
    it('統合結果が個別関数と一致する', () => {
      const dailySales = new Map<number, number>()
      const dailyGrossProfit = new Map<number, number>()
      for (let d = 1; d <= 28; d++) {
        dailySales.set(d, 200_000)
        dailyGrossProfit.set(d, 50_000)
      }

      const input = { year: 2026, month: 2, dailySales, dailyGrossProfit }
      const result = calculateForecast(input)
      const summaries = calculateWeeklySummaries(input)
      const dowAverages = calculateDayOfWeekAverages(input)

      // 週サマリーが一致
      expect(result.weeklySummaries).toEqual(summaries)
      // 曜日平均が一致
      expect(result.dayOfWeekAverages).toEqual(dowAverages)
    })
  })
})
