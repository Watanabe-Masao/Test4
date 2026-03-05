/**
 * ComparisonContext ファクトリテスト
 *
 * 検証する不変条件:
 *   1. ゼロ値パターン: createEmpty* の全フィールドに null チェックなしでアクセス可能
 *   2. toSnapshot: 空 → hasData: false、データあり → hasData: true
 *   3. aggregateMetrics: 合算後の不変条件（推定マージン + 推定原価 = コア売上）
 */
import { describe, it, expect } from 'vitest'
import {
  ZERO_PERIOD_METRICS,
  createEmptyComparisonContext,
  toSnapshot,
  aggregateMetrics,
} from '../comparisonContextFactory'
import type { PeriodMetrics } from '@/application/usecases/calculation/periodMetricsCalculator'

function makeMetrics(overrides: Partial<PeriodMetrics> = {}): PeriodMetrics {
  return { ...ZERO_PERIOD_METRICS, ...overrides }
}

describe('ゼロ値パターン（不変条件1）', () => {
  it('createEmptyComparisonContext: 全フィールドに null チェック不要でアクセス可能', () => {
    const ctx = createEmptyComparisonContext(2026, 3)

    // 直接アクセスでエラーにならない — これがゼロ値パターンの核心
    expect(ctx.isReady).toBe(false)
    expect(ctx.current.metrics.totalSales).toBe(0)
    expect(ctx.sameDow.metrics.totalSales).toBe(0)
    expect(ctx.sameDate.metrics.totalSales).toBe(0)
    expect(ctx.dowGap.estimatedImpact).toBe(0)
    expect(ctx.dowGap.dowCounts).toHaveLength(7)

    // hasData は false
    expect(ctx.current.hasData).toBe(false)
    expect(ctx.sameDow.hasData).toBe(false)
    expect(ctx.sameDate.hasData).toBe(false)
  })

  it('前年は year - 1 が設定される', () => {
    const ctx = createEmptyComparisonContext(2026, 3)
    expect(ctx.current.year).toBe(2026)
    expect(ctx.sameDow.year).toBe(2025)
    expect(ctx.sameDate.year).toBe(2025)
  })

  it('ZERO_PERIOD_METRICS: 在庫法は null、数値はゼロ', () => {
    expect(ZERO_PERIOD_METRICS.invMethodCogs).toBeNull()
    expect(ZERO_PERIOD_METRICS.totalSales).toBe(0)
    expect(ZERO_PERIOD_METRICS.estMethodCogs).toBe(0)
  })
})

describe('toSnapshot（不変条件2）', () => {
  it('空配列 → hasData: false', () => {
    const snapshot = toSnapshot([], 2026, 3)
    expect(snapshot.hasData).toBe(false)
    expect(snapshot.metrics).toBe(ZERO_PERIOD_METRICS) // 参照一致
  })

  it('データあり → hasData: true', () => {
    const snapshot = toSnapshot([makeMetrics({ totalSales: 1000000 })], 2026, 3)
    expect(snapshot.hasData).toBe(true)
    expect(snapshot.metrics.totalSales).toBe(1000000)
  })
})

describe('aggregateMetrics（不変条件3）', () => {
  it('空 → ZERO_PERIOD_METRICS 参照一致', () => {
    expect(aggregateMetrics([])).toBe(ZERO_PERIOD_METRICS)
  })

  it('単一要素 → そのまま返す（参照一致）', () => {
    const m = makeMetrics({ storeId: '1', totalSales: 500000 })
    expect(aggregateMetrics([m])).toBe(m)
  })

  it('複数店舗の合算: 売上・客数の加算が正しい', () => {
    const result = aggregateMetrics([
      makeMetrics({ storeId: '1', totalSales: 1000000, totalCustomers: 100 }),
      makeMetrics({ storeId: '2', totalSales: 2000000, totalCustomers: 200 }),
    ])
    expect(result.storeId).toBe('all')
    expect(result.totalSales).toBe(3000000)
    expect(result.totalCustomers).toBe(300)
  })

  it('合算後: 推定マージン + 推定原価 ≈ コア売上', () => {
    const result = aggregateMetrics([
      makeMetrics({
        storeId: '1',
        totalSales: 5000000,
        totalCoreSales: 4500000,
        totalPurchaseCost: 3000000,
        totalPurchasePrice: 4200000,
        totalDiscount: 100000,
        totalCostInclusion: 20000,
      }),
      makeMetrics({
        storeId: '2',
        totalSales: 3000000,
        totalCoreSales: 2700000,
        totalPurchaseCost: 1800000,
        totalPurchasePrice: 2500000,
        totalDiscount: 50000,
        totalCostInclusion: 10000,
      }),
    ])
    // 推定マージン + 推定原価 = コア売上（数学的不変条件）
    expect(result.estMethodMargin + result.estMethodCogs).toBeCloseTo(
      result.totalCoreSales,
      0, // 合算の精度は粗い（率の再計算による丸め）
    )
  })

  it('合算後: 値入率の再計算が正しい', () => {
    const result = aggregateMetrics([
      makeMetrics({ totalPurchaseCost: 600000, totalPurchasePrice: 850000 }),
      makeMetrics({ totalPurchaseCost: 400000, totalPurchasePrice: 550000 }),
    ])
    // (1400000 - 1000000) / 1400000
    expect(result.averageMarkupRate).toBeCloseTo(400000 / 1400000, 6)
  })
})
