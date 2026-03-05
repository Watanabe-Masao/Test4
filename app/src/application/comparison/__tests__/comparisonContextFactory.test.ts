/**
 * ComparisonContext ファクトリテスト
 *
 * ゼロ値パターンの正確性を検証する。
 */
import { describe, it, expect } from 'vitest'
import {
  ZERO_PERIOD_METRICS,
  createEmptySnapshot,
  createEmptyComparisonContext,
  toSnapshot,
  aggregateMetrics,
} from '../comparisonContextFactory'
import type { PeriodMetrics } from '@/application/usecases/calculation/periodMetricsCalculator'

function makeMetrics(overrides: Partial<PeriodMetrics> = {}): PeriodMetrics {
  return { ...ZERO_PERIOD_METRICS, ...overrides }
}

describe('ZERO_PERIOD_METRICS', () => {
  it('数値フィールドは全てゼロ', () => {
    expect(ZERO_PERIOD_METRICS.totalSales).toBe(0)
    expect(ZERO_PERIOD_METRICS.estMethodCogs).toBe(0)
    expect(ZERO_PERIOD_METRICS.salesDays).toBe(0)
  })

  it('在庫法フィールドは null', () => {
    expect(ZERO_PERIOD_METRICS.invMethodCogs).toBeNull()
    expect(ZERO_PERIOD_METRICS.invMethodGrossProfit).toBeNull()
    expect(ZERO_PERIOD_METRICS.openingInventory).toBeNull()
  })
})

describe('createEmptySnapshot', () => {
  it('hasData: false で metrics はゼロ値', () => {
    const snapshot = createEmptySnapshot(2026, 3)
    expect(snapshot.hasData).toBe(false)
    expect(snapshot.year).toBe(2026)
    expect(snapshot.month).toBe(3)
    expect(snapshot.metrics.totalSales).toBe(0)
  })
})

describe('createEmptyComparisonContext', () => {
  it('全フィールドにアクセス可能（null チェック不要）', () => {
    const ctx = createEmptyComparisonContext(2026, 3)
    expect(ctx.isReady).toBe(false)
    expect(ctx.current.hasData).toBe(false)
    expect(ctx.sameDow.hasData).toBe(false)
    expect(ctx.sameDate.hasData).toBe(false)
    expect(ctx.dowGap.isValid).toBe(false)

    // 直接アクセスでエラーにならない
    expect(ctx.current.metrics.totalSales).toBe(0)
    expect(ctx.sameDow.metrics.totalSales).toBe(0)
    expect(ctx.dowGap.estimatedImpact).toBe(0)
    expect(ctx.dowGap.dowCounts).toHaveLength(7)
  })

  it('前年は year - 1 が設定される', () => {
    const ctx = createEmptyComparisonContext(2026, 3)
    expect(ctx.sameDow.year).toBe(2025)
    expect(ctx.sameDate.year).toBe(2025)
  })
})

describe('toSnapshot', () => {
  it('空配列は hasData: false', () => {
    const snapshot = toSnapshot([], 2026, 3)
    expect(snapshot.hasData).toBe(false)
    expect(snapshot.metrics).toBe(ZERO_PERIOD_METRICS)
  })

  it('メトリクスありは hasData: true', () => {
    const metrics = [makeMetrics({ storeId: '1', totalSales: 1000000 })]
    const snapshot = toSnapshot(metrics, 2026, 3)
    expect(snapshot.hasData).toBe(true)
    expect(snapshot.metrics.totalSales).toBe(1000000)
  })
})

describe('aggregateMetrics', () => {
  it('空配列はゼロ値を返す', () => {
    const result = aggregateMetrics([])
    expect(result).toBe(ZERO_PERIOD_METRICS)
  })

  it('単一要素はそのまま返す', () => {
    const m = makeMetrics({ storeId: '1', totalSales: 500000 })
    const result = aggregateMetrics([m])
    expect(result).toBe(m)
  })

  it('複数店舗の売上を合算する', () => {
    const metrics = [
      makeMetrics({ storeId: '1', totalSales: 1000000, totalCustomers: 100 }),
      makeMetrics({ storeId: '2', totalSales: 2000000, totalCustomers: 200 }),
    ]
    const result = aggregateMetrics(metrics)
    expect(result.storeId).toBe('all')
    expect(result.totalSales).toBe(3000000)
    expect(result.totalCustomers).toBe(300)
  })

  it('率は合算後に再計算される', () => {
    const metrics = [
      makeMetrics({
        storeId: '1',
        totalSales: 1000000,
        totalCoreSales: 900000,
        totalPurchaseCost: 600000,
        totalPurchasePrice: 850000,
      }),
      makeMetrics({
        storeId: '2',
        totalSales: 2000000,
        totalCoreSales: 1800000,
        totalPurchaseCost: 1200000,
        totalPurchasePrice: 1700000,
      }),
    ]
    const result = aggregateMetrics(metrics)
    // averageMarkupRate は合算した後の値入率
    expect(result.totalPurchaseCost).toBe(1800000)
    expect(result.totalPurchasePrice).toBe(2550000)
    // (2550000 - 1800000) / 2550000
    expect(result.averageMarkupRate).toBeCloseTo(750000 / 2550000, 6)
  })
})
