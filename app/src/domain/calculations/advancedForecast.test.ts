import { describe, it, expect } from 'vitest'
import {
  calculateWMA,
  linearRegression,
  projectDowAdjusted,
  calculateMonthEndProjection,
} from './advancedForecast'

describe('advancedForecast', () => {
  describe('calculateWMA', () => {
    it('データ数が窓サイズ未満の場合は実績値をそのまま返す', () => {
      const sales = new Map([[1, 100], [2, 200]])
      const result = calculateWMA(sales, 5)
      expect(result).toHaveLength(2)
      expect(result[0].wma).toBe(100)
      expect(result[1].wma).toBe(200)
    })

    it('窓サイズ3での加重移動平均を正しく計算する', () => {
      const sales = new Map([[1, 100], [2, 200], [3, 300], [4, 400]])
      const result = calculateWMA(sales, 3)

      expect(result).toHaveLength(4)
      // 3日目: (100*1 + 200*2 + 300*3) / 6 = 1400/6 ≈ 233.33
      expect(result[2].wma).toBeCloseTo(233.33, 1)
      // 4日目: (200*1 + 300*2 + 400*3) / 6 = 2000/6 ≈ 333.33
      expect(result[3].wma).toBeCloseTo(333.33, 1)
    })

    it('0のデータはスキップされる', () => {
      const sales = new Map([[1, 100], [2, 0], [3, 300]])
      const result = calculateWMA(sales)
      expect(result).toHaveLength(2) // 0 はフィルタされる
    })
  })

  describe('linearRegression', () => {
    it('完全な線形データの回帰を正しく計算する', () => {
      // y = 100x + 500 → sales increases by 100 per day
      const sales = new Map([[1, 600], [2, 700], [3, 800], [4, 900], [5, 1000]])
      const result = linearRegression(sales)

      expect(result.slope).toBeCloseTo(100, 0)
      expect(result.intercept).toBeCloseTo(500, 0)
      expect(result.rSquared).toBeCloseTo(1.0, 5)
    })

    it('データが1点の場合はゼロ傾きを返す', () => {
      const sales = new Map([[5, 500]])
      const result = linearRegression(sales)
      expect(result.slope).toBe(0)
    })

    it('空データの場合はゼロを返す', () => {
      const sales = new Map<number, number>()
      const result = linearRegression(sales)
      expect(result.slope).toBe(0)
      expect(result.rSquared).toBe(0)
    })

    it('ノイズのあるデータで R² < 1 を返す', () => {
      const sales = new Map([[1, 100], [2, 500], [3, 200], [4, 400], [5, 300]])
      const result = linearRegression(sales)
      expect(result.rSquared).toBeLessThan(1)
      expect(result.rSquared).toBeGreaterThanOrEqual(0)
    })
  })

  describe('projectDowAdjusted', () => {
    it('曜日パターンに基づく予測を実績に追加する', () => {
      // 2026年1月は木曜始まり
      const sales = new Map<number, number>()
      for (let d = 1; d <= 15; d++) {
        sales.set(d, 100000) // 全日一律 10万
      }

      const projection = projectDowAdjusted(2026, 1, sales, 15)
      // 15日分の実績 (1,500,000) + 残16日分の曜日平均 (全日100,000)
      expect(projection).toBe(100000 * 31)
    })

    it('データが空の場合は0を返す', () => {
      const sales = new Map<number, number>()
      const projection = projectDowAdjusted(2026, 1, sales, 0)
      expect(projection).toBe(0)
    })
  })

  describe('calculateMonthEndProjection', () => {
    it('複数手法の予測値と信頼区間を返す', () => {
      const sales = new Map<number, number>()
      for (let d = 1; d <= 20; d++) {
        sales.set(d, 100000 + d * 1000) // 微増トレンド
      }

      const result = calculateMonthEndProjection(2026, 1, sales)

      expect(result.linearProjection).toBeGreaterThan(0)
      expect(result.dowAdjustedProjection).toBeGreaterThan(0)
      expect(result.wmaProjection).toBeGreaterThan(0)
      expect(result.regressionProjection).toBeGreaterThan(0)
      expect(result.confidenceInterval.lower).toBeLessThan(result.confidenceInterval.upper)
      expect(result.dailyTrend).toBeGreaterThan(0) // 増加トレンド
    })

    it('空データの場合は全てゼロを返す', () => {
      const result = calculateMonthEndProjection(2026, 1, new Map())
      expect(result.linearProjection).toBe(0)
      expect(result.dowAdjustedProjection).toBe(0)
      expect(result.wmaProjection).toBe(0)
      expect(result.confidenceInterval.lower).toBe(0)
    })
  })
})
