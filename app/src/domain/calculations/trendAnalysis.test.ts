import { describe, it, expect } from 'vitest'
import { analyzeTrend } from './trendAnalysis'
import type { MonthlyDataPoint } from './trendAnalysis'

function makePoint(year: number, month: number, totalSales: number): MonthlyDataPoint {
  return {
    year,
    month,
    totalSales,
    totalCustomers: null,
    grossProfit: null,
    grossProfitRate: null,
    budget: null,
    budgetAchievement: null,
    storeCount: 1,
  }
}

describe('trendAnalysis', () => {
  describe('analyzeTrend', () => {
    it('空データの場合は空の結果を返す', () => {
      const result = analyzeTrend([])
      expect(result.dataPoints).toHaveLength(0)
      expect(result.overallTrend).toBe('flat')
      expect(result.averageMonthlySales).toBe(0)
    })

    it('時系列順にソートする', () => {
      const data = [
        makePoint(2025, 12, 300),
        makePoint(2025, 1, 100),
        makePoint(2025, 6, 200),
      ]
      const result = analyzeTrend(data)
      expect(result.dataPoints[0].month).toBe(1)
      expect(result.dataPoints[1].month).toBe(6)
      expect(result.dataPoints[2].month).toBe(12)
    })

    it('前月比を正しく計算する', () => {
      const data = [
        makePoint(2025, 1, 100),
        makePoint(2025, 2, 150), // +50%
        makePoint(2025, 3, 120), // -20%
      ]
      const result = analyzeTrend(data)

      expect(result.momChanges[0]).toBeNull() // 初月はなし
      expect(result.momChanges[1]).toBeCloseTo(1.5, 2) // 150/100
      expect(result.momChanges[2]).toBeCloseTo(0.8, 2) // 120/150
    })

    it('前年同月比を正しく計算する', () => {
      const data = [
        makePoint(2024, 1, 1000),
        makePoint(2025, 1, 1200), // +20%
      ]
      const result = analyzeTrend(data)

      expect(result.yoyChanges[0]).toBeNull() // 2024/1 には前年がない
      expect(result.yoyChanges[1]).toBeCloseTo(1.2, 2) // 1200/1000
    })

    it('3ヶ月移動平均を正しく計算する', () => {
      const data = [
        makePoint(2025, 1, 100),
        makePoint(2025, 2, 200),
        makePoint(2025, 3, 300),
        makePoint(2025, 4, 400),
      ]
      const result = analyzeTrend(data)

      expect(result.movingAvg3[0]).toBeNull()
      expect(result.movingAvg3[1]).toBeNull()
      expect(result.movingAvg3[2]).toBeCloseTo(200, 0) // (100+200+300)/3
      expect(result.movingAvg3[3]).toBeCloseTo(300, 0) // (200+300+400)/3
    })

    it('季節性インデックスを計算する', () => {
      const data = [
        makePoint(2024, 1, 100), makePoint(2024, 7, 200),
        makePoint(2025, 1, 100), makePoint(2025, 7, 200),
      ]
      const result = analyzeTrend(data)

      // 月平均150、1月平均100 → index=0.667, 7月平均200 → index=1.333
      expect(result.seasonalIndex[0]).toBeCloseTo(0.667, 2) // 1月
      expect(result.seasonalIndex[6]).toBeCloseTo(1.333, 2) // 7月
    })

    it('月平均売上を計算する', () => {
      const data = [
        makePoint(2025, 1, 100),
        makePoint(2025, 2, 200),
        makePoint(2025, 3, 300),
      ]
      const result = analyzeTrend(data)
      expect(result.averageMonthlySales).toBe(200)
    })

    it('上昇トレンドを検出する', () => {
      const data = [
        makePoint(2025, 1, 100),
        makePoint(2025, 2, 100),
        makePoint(2025, 3, 100),
        makePoint(2025, 4, 200),
        makePoint(2025, 5, 200),
        makePoint(2025, 6, 200),
      ]
      const result = analyzeTrend(data)
      expect(result.overallTrend).toBe('up')
    })

    it('下降トレンドを検出する', () => {
      const data = [
        makePoint(2025, 1, 300),
        makePoint(2025, 2, 300),
        makePoint(2025, 3, 300),
        makePoint(2025, 4, 100),
        makePoint(2025, 5, 100),
        makePoint(2025, 6, 100),
      ]
      const result = analyzeTrend(data)
      expect(result.overallTrend).toBe('down')
    })

    it('横ばいトレンドを検出する', () => {
      const data = [
        makePoint(2025, 1, 100),
        makePoint(2025, 2, 100),
        makePoint(2025, 3, 100),
        makePoint(2025, 4, 100),
        makePoint(2025, 5, 100),
        makePoint(2025, 6, 100),
      ]
      const result = analyzeTrend(data)
      expect(result.overallTrend).toBe('flat')
    })
  })
})
