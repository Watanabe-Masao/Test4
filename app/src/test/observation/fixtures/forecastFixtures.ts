/**
 * forecast 観測フィクスチャ
 *
 * 4 カテゴリ: normal / nullZeroMissing / extreme / boundary
 * 5 compare 対象関数: calculateStdDev, detectAnomalies, calculateWMA, linearRegression, analyzeTrend
 */
import type { MonthlyDataPoint } from '@/domain/calculations/algorithms/trendAnalysis'

export interface ForecastFixture {
  readonly name: string
  readonly dailySales: ReadonlyMap<number, number>
  readonly monthlyData: readonly MonthlyDataPoint[]
}

function makeMonthly(year: number, month: number, totalSales: number): MonthlyDataPoint {
  return {
    year,
    month,
    totalSales,
    totalCustomers: Math.round(totalSales / 200),
    grossProfit: totalSales * 0.3,
    grossProfitRate: 0.3,
    budget: totalSales * 1.1,
    budgetAchievement: totalSales / (totalSales * 1.1),
    storeCount: 1,
    discountRate: 0.05,
    costRate: 0.65,
    costInclusionRate: 0.02,
    averageMarkupRate: 0.3,
  }
}

export const NORMAL: ForecastFixture = {
  name: 'normal',
  dailySales: new Map([
    [1, 100_000],
    [2, 120_000],
    [3, 95_000],
    [4, 130_000],
    [5, 110_000],
    [6, 105_000],
    [7, 115_000],
    [8, 108_000],
    [9, 125_000],
    [10, 112_000],
  ]),
  monthlyData: [
    makeMonthly(2025, 1, 1_000_000),
    makeMonthly(2025, 2, 1_100_000),
    makeMonthly(2025, 3, 1_050_000),
    makeMonthly(2025, 4, 1_200_000),
    makeMonthly(2025, 5, 1_150_000),
    makeMonthly(2025, 6, 1_300_000),
    makeMonthly(2025, 7, 1_250_000),
    makeMonthly(2025, 8, 1_100_000),
    makeMonthly(2025, 9, 1_050_000),
    makeMonthly(2025, 10, 1_150_000),
    makeMonthly(2025, 11, 1_200_000),
    makeMonthly(2025, 12, 1_350_000),
  ],
}

export const NULL_ZERO_MISSING: ForecastFixture = {
  name: 'null-zero-missing',
  dailySales: new Map<number, number>(),
  monthlyData: [makeMonthly(2025, 1, 0), makeMonthly(2025, 2, 0), makeMonthly(2025, 3, 0)],
}

export const EXTREME: ForecastFixture = {
  name: 'extreme',
  dailySales: new Map([
    [1, 1e10],
    [2, 1.2e10],
    [3, 9.5e9],
    [4, 1.3e10],
    [5, 1.1e10],
    [6, 1.05e10],
    [7, 1.15e10],
    [8, 1.08e10],
    [9, 1.25e10],
    [10, 1.12e10],
  ]),
  monthlyData: [
    makeMonthly(2025, 1, 1e11),
    makeMonthly(2025, 2, 1.1e11),
    makeMonthly(2025, 3, 1.05e11),
    makeMonthly(2025, 4, 1.2e11),
    makeMonthly(2025, 5, 1.15e11),
    makeMonthly(2025, 6, 1.3e11),
  ],
}

export const BOUNDARY: ForecastFixture = {
  name: 'boundary',
  dailySales: new Map([
    [1, 100],
    [2, 100],
  ]),
  monthlyData: [makeMonthly(2025, 1, 100), makeMonthly(2025, 2, 100), makeMonthly(2025, 3, 100)],
}

export const ALL_FIXTURES: readonly ForecastFixture[] = [
  NORMAL,
  NULL_ZERO_MISSING,
  EXTREME,
  BOUNDARY,
]
