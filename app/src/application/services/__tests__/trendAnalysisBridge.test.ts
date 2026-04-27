/**
 * trendAnalysisBridge — mode switch + analyze tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  setTrendAnalysisBridgeMode,
  getTrendAnalysisBridgeMode,
  analyzeTrend,
  rollbackToCurrentOnly,
  getLastDualRunResult,
} from '../trendAnalysisBridge'
import type { MonthlyDataPoint } from '@/domain/calculations/algorithms/trendAnalysis'

function dp(overrides: Partial<MonthlyDataPoint> = {}): MonthlyDataPoint {
  return {
    year: 2026,
    month: 1,
    totalSales: 1_000_000,
    totalCustomers: 5000,
    grossProfit: 300_000,
    grossProfitRate: 0.3,
    budget: 1_100_000,
    budgetAchievement: 0.91,
    storeCount: 10,
    discountRate: 0.02,
    costRate: 0.7,
    costInclusionRate: 0.01,
    averageMarkupRate: 0.3,
    ...overrides,
  }
}

describe('trendAnalysisBridge mode switch', () => {
  beforeEach(() => {
    rollbackToCurrentOnly()
  })

  it("デフォルトは 'current-only'", () => {
    expect(getTrendAnalysisBridgeMode()).toBe('current-only')
  })

  it('setTrendAnalysisBridgeMode で mode 切替', () => {
    setTrendAnalysisBridgeMode('dual-run-compare')
    expect(getTrendAnalysisBridgeMode()).toBe('dual-run-compare')
  })

  it('rollbackToCurrentOnly でリセット', () => {
    setTrendAnalysisBridgeMode('fallback-to-current')
    rollbackToCurrentOnly()
    expect(getTrendAnalysisBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})

describe('analyzeTrend (current-only)', () => {
  beforeEach(() => {
    setTrendAnalysisBridgeMode('current-only')
  })

  it('空配列で結果オブジェクトを返す', () => {
    const r = analyzeTrend([])
    expect(r).toHaveProperty('overallTrend')
    expect(r).toHaveProperty('averageMonthlySales')
    expect(r.averageMonthlySales).toBe(0)
  })

  it('単一データで結果を返す', () => {
    const r = analyzeTrend([dp({ totalSales: 500_000 })])
    expect(r.averageMonthlySales).toBe(500_000)
  })

  it('averageMonthlySales = 平均', () => {
    const r = analyzeTrend([
      dp({ totalSales: 100 }),
      dp({ totalSales: 200 }),
      dp({ totalSales: 300 }),
    ])
    expect(r.averageMonthlySales).toBe(200)
  })

  it('結果は期待フィールドを含む', () => {
    const r = analyzeTrend([dp()])
    expect(r).toHaveProperty('momChanges')
    expect(r).toHaveProperty('yoyChanges')
    expect(r).toHaveProperty('movingAvg3')
    expect(r).toHaveProperty('movingAvg6')
    expect(r).toHaveProperty('seasonalIndex')
  })

  it("overallTrend は 'up' / 'down' / 'flat' のいずれか", () => {
    const r = analyzeTrend([
      dp({ year: 2026, month: 1, totalSales: 100 }),
      dp({ year: 2026, month: 2, totalSales: 200 }),
      dp({ year: 2026, month: 3, totalSales: 300 }),
    ])
    expect(['up', 'down', 'flat']).toContain(r.overallTrend)
  })
})

describe('analyzeTrend (fallback-to-current)', () => {
  beforeEach(() => {
    setTrendAnalysisBridgeMode('fallback-to-current')
  })

  it('WASM 未 ready でも current path で結果', () => {
    const r = analyzeTrend([dp()])
    expect(r).toHaveProperty('averageMonthlySales')
  })
})
