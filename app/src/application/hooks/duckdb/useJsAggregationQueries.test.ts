/**
 * useJsAggregationQueries — 内部純粋関数のテスト
 *
 * フック自体は React コンテキストが必要なため、
 * ここではフック内部で使う計算ロジック（computeDowPattern, computeDailyFeatures 相当）を
 * rawAggregation の関数経由でテストする。
 */
import { describe, it, expect } from 'vitest'
import {
  aggregateByDay,
  cumulativeSum,
  dowAggregate,
  movingAverage,
  stddevPop,
  zScore,
  coefficientOfVariation,
} from '@/domain/calculations/rawAggregation'
import { safeDivide } from '@/domain/calculations/utils'

// ─── StoreDaySummaryRow 互換データ ────────────────────

const RAW_ROWS = [
  { dateKey: '2026-01-01', day: 1, storeId: 'S1', sales: 100 },
  { dateKey: '2026-01-01', day: 1, storeId: 'S2', sales: 200 },
  { dateKey: '2026-01-02', day: 2, storeId: 'S1', sales: 150 },
  { dateKey: '2026-01-02', day: 2, storeId: 'S2', sales: 250 },
  { dateKey: '2026-01-03', day: 3, storeId: 'S1', sales: 120 },
  { dateKey: '2026-01-03', day: 3, storeId: 'S2', sales: 180 },
]

// ─── 累積売上パイプライン ──────────────────────────────

describe('累積売上パイプライン (aggregateByDay → cumulativeSum)', () => {
  it('SQL の SUM(sales) OVER (ORDER BY date_key) と同等の結果を返す', () => {
    const daily = aggregateByDay(RAW_ROWS)
    const cumulative = cumulativeSum(daily)

    expect(cumulative).toHaveLength(3)
    expect(cumulative[0]).toEqual({
      dateKey: '2026-01-01',
      dailySales: 300,
      cumulativeSales: 300,
    })
    expect(cumulative[1]).toEqual({
      dateKey: '2026-01-02',
      dailySales: 400,
      cumulativeSales: 700,
    })
    expect(cumulative[2]).toEqual({
      dateKey: '2026-01-03',
      dailySales: 300,
      cumulativeSales: 1000,
    })
  })
})

// ─── 曜日パターンパイプライン ──────────────────────────

describe('曜日パターンパイプライン (aggregateByDay → dowAggregate)', () => {
  it('SQL の AVG/STDDEV_POP per dow と同等の結果を返す', () => {
    const daily = aggregateByDay(RAW_ROWS)
    const dowResult = dowAggregate(daily)

    // 2026-01-01 = 木(4), 01-02 = 金(5), 01-03 = 土(6)
    expect(dowResult).toHaveLength(3)
    expect(dowResult[0].dow).toBe(4) // 木
    expect(dowResult[0].avgSales).toBe(300)
    expect(dowResult[0].dayCount).toBe(1)
    expect(dowResult[1].dow).toBe(5) // 金
    expect(dowResult[1].avgSales).toBe(400)
    expect(dowResult[2].dow).toBe(6) // 土
    expect(dowResult[2].avgSales).toBe(300)
  })

  it('同一曜日が複数ある場合の平均と標準偏差を正しく計算する', () => {
    const daily = [
      { dateKey: '2026-01-01', totalSales: 300 }, // 木
      { dateKey: '2026-01-08', totalSales: 500 }, // 木
    ]
    const dowResult = dowAggregate(daily)

    const thu = dowResult.find((d) => d.dow === 4)!
    expect(thu.avgSales).toBe(400) // (300+500)/2
    expect(thu.dayCount).toBe(2)
    expect(thu.stddev).toBeCloseTo(100) // sqrt(((300-400)^2+(500-400)^2)/2) = 100
  })
})

// ─── 日別特徴量パイプライン ────────────────────────────

describe('日別特徴量パイプライン (移動平均 + 統計量)', () => {
  const dailyValues = [100, 200, 300, 400, 500, 600, 700]
  const dailyData = dailyValues.map((v, i) => ({
    dateKey: `2026-01-${String(i + 1).padStart(2, '0')}`,
    value: v,
  }))

  it('3日移動平均を正しく計算する', () => {
    const ma3 = movingAverage(dailyData, 3)
    expect(ma3[0].ma).toBeNull()
    expect(ma3[1].ma).toBeNull()
    expect(ma3[2].ma).toBe(200) // (100+200+300)/3
    expect(ma3[6].ma).toBe(600) // (500+600+700)/3
  })

  it('7日移動平均を正しく計算する', () => {
    const ma7 = movingAverage(dailyData, 7)
    // 最初の6つは null
    for (let i = 0; i < 6; i++) {
      expect(ma7[i].ma).toBeNull()
    }
    expect(ma7[6].ma).toBe(400) // (100+200+...+700)/7
  })

  it('CV (変動係数) を正しく計算する', () => {
    const cv = coefficientOfVariation(dailyValues)
    const mean = 400
    const sd = stddevPop(dailyValues)
    expect(cv).toBeCloseTo(safeDivide(sd, mean, 0))
  })

  it('Z-score を正しく計算する', () => {
    const mean = 400
    const sd = stddevPop(dailyValues)
    // 700 の Z-score
    const z = zScore(700, mean, sd)
    expect(z).toBeCloseTo((700 - mean) / sd)
  })
})
