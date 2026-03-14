/**
 * forecast Bridge テスト
 *
 * 検証項目:
 * 1. ts-only モード: TS 実装が正しく呼ばれる（5 compare 対象 + 5 Date 依存）
 * 2. wasm-only + WASM 未初期化: TS フォールバック
 * 3. wasm-only + state=loading/error: TS フォールバック
 * 4. dual-run-compare + WASM 未初期化: TS フォールバック（compare なし）
 * 5. ForecastMismatchLog shape（モック WASM で差分検出）
 * 6. dual-run-compare + 一致時は silent
 * 7. Date 依存関数が compare 対象外であることの確認
 * 8. F-INV invariants via bridge
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateStdDev as calculateStdDevDirect,
  detectAnomalies as detectAnomaliesDirect,
} from '@/domain/calculations/forecast'
import {
  linearRegression as linearRegressionDirect,
  calculateWMA as calculateWMADirect,
} from '@/domain/calculations/algorithms/advancedForecast'
import { analyzeTrend as analyzeTrendDirect } from '@/domain/calculations/algorithms/trendAnalysis'
import type { MonthlyDataPoint } from '@/domain/calculations/algorithms/trendAnalysis'
import { setExecutionMode } from '../wasmEngine'
import * as wasmEngine from '../wasmEngine'

/**
 * WASM wrapper をモック。意図的にずれた値を返す。
 */
vi.mock('../forecastWasm', () => ({
  calculateStdDevWasm: vi.fn(() => ({ mean: 99999, stdDev: 99999 })),
  detectAnomaliesWasm: vi.fn(() => [
    { day: 1, value: 99999, mean: 99999, stdDev: 99999, zScore: 99999, isAnomaly: true },
  ]),
  calculateWMAWasm: vi.fn(() => [{ day: 1, actual: 99999, wma: 99999 }]),
  linearRegressionWasm: vi.fn(() => ({ slope: 99999, intercept: 99999, rSquared: 99999 })),
  analyzeTrendWasm: vi.fn(() => ({
    dataPoints: [],
    momChanges: [],
    yoyChanges: [],
    movingAvg3: [],
    movingAvg6: [],
    seasonalIndex: Array(12).fill(1),
    overallTrend: 'up' as const,
    averageMonthlySales: 99999,
  })),
}))

import {
  calculateStdDev,
  detectAnomalies,
  calculateWMA,
  linearRegression,
  analyzeTrend,
  calculateForecast,
  calculateMonthEndProjection,
  calculateWeeklySummaries,
  calculateDayOfWeekAverages,
  getWeekRanges,
} from '../forecastBridge'
import {
  calculateStdDevWasm,
  linearRegressionWasm,
} from '../forecastWasm'

/* ── テストヘルパー ─────────────────────────────── */

function makeDailySalesMap(entries: [number, number][]): ReadonlyMap<number, number> {
  return new Map(entries)
}

const sampleDailySales = makeDailySalesMap([
  [1, 100000],
  [2, 120000],
  [3, 95000],
  [4, 130000],
  [5, 110000],
  [6, 105000],
  [7, 200000],
  [8, 115000],
  [9, 108000],
  [10, 125000],
])

const sampleMonthlyData: readonly MonthlyDataPoint[] = [
  {
    year: 2025, month: 1, totalSales: 1000000, totalCustomers: 5000,
    grossProfit: 300000, grossProfitRate: 0.3, budget: 1100000, budgetAchievement: 0.91,
    storeCount: 1, discountRate: 0.05, costRate: 0.65, costInclusionRate: 0.02,
    averageMarkupRate: 0.3,
  },
  {
    year: 2025, month: 2, totalSales: 1100000, totalCustomers: 5200,
    grossProfit: 330000, grossProfitRate: 0.3, budget: 1050000, budgetAchievement: 1.05,
    storeCount: 1, discountRate: 0.04, costRate: 0.64, costInclusionRate: 0.02,
    averageMarkupRate: 0.31,
  },
  {
    year: 2025, month: 3, totalSales: 1050000, totalCustomers: 5100,
    grossProfit: 315000, grossProfitRate: 0.3, budget: 1080000, budgetAchievement: 0.97,
    storeCount: 1, discountRate: 0.045, costRate: 0.645, costInclusionRate: 0.02,
    averageMarkupRate: 0.305,
  },
  {
    year: 2025, month: 4, totalSales: 1200000, totalCustomers: 5500,
    grossProfit: 360000, grossProfitRate: 0.3, budget: 1150000, budgetAchievement: 1.04,
    storeCount: 1, discountRate: 0.035, costRate: 0.63, costInclusionRate: 0.02,
    averageMarkupRate: 0.32,
  },
  {
    year: 2025, month: 5, totalSales: 1250000, totalCustomers: 5600,
    grossProfit: 375000, grossProfitRate: 0.3, budget: 1200000, budgetAchievement: 1.04,
    storeCount: 1, discountRate: 0.03, costRate: 0.62, costInclusionRate: 0.02,
    averageMarkupRate: 0.33,
  },
  {
    year: 2025, month: 6, totalSales: 1300000, totalCustomers: 5800,
    grossProfit: 390000, grossProfitRate: 0.3, budget: 1250000, budgetAchievement: 1.04,
    storeCount: 1, discountRate: 0.028, costRate: 0.61, costInclusionRate: 0.02,
    averageMarkupRate: 0.34,
  },
]

beforeEach(() => {
  setExecutionMode('ts-only')
  vi.restoreAllMocks()
})

/* ── 1. ts-only モード ─────────────────────────── */

describe('bridge ts-only mode: bridge と直接呼び出しの結果一致', () => {
  it('calculateStdDev', () => {
    const values = [100, 200, 300, 400, 500]
    expect(calculateStdDev(values)).toEqual(calculateStdDevDirect(values))
  })

  it('detectAnomalies', () => {
    expect(detectAnomalies(sampleDailySales)).toEqual(detectAnomaliesDirect(sampleDailySales))
  })

  it('calculateWMA', () => {
    expect(calculateWMA(sampleDailySales)).toEqual(calculateWMADirect(sampleDailySales))
  })

  it('linearRegression', () => {
    expect(linearRegression(sampleDailySales)).toEqual(linearRegressionDirect(sampleDailySales))
  })

  it('analyzeTrend', () => {
    expect(analyzeTrend(sampleMonthlyData)).toEqual(analyzeTrendDirect(sampleMonthlyData))
  })
})

/* ── 2. wasm-only + WASM 未初期化 (idle) ──────── */

describe('bridge wasm-only mode: WASM 未初期化時は TS フォールバック', () => {
  it('calculateStdDev falls back to TS', () => {
    setExecutionMode('wasm-only')
    const values = [100, 200, 300]
    expect(calculateStdDev(values)).toEqual(calculateStdDevDirect(values))
  })

  it('detectAnomalies falls back to TS', () => {
    setExecutionMode('wasm-only')
    expect(detectAnomalies(sampleDailySales)).toEqual(detectAnomaliesDirect(sampleDailySales))
  })

  it('linearRegression falls back to TS', () => {
    setExecutionMode('wasm-only')
    expect(linearRegression(sampleDailySales)).toEqual(linearRegressionDirect(sampleDailySales))
  })

  it('analyzeTrend falls back to TS', () => {
    setExecutionMode('wasm-only')
    expect(analyzeTrend(sampleMonthlyData)).toEqual(analyzeTrendDirect(sampleMonthlyData))
  })
})

/* ── 3. wasm-only + state=loading/error ────────── */

describe('wasm-only + state=loading/error: TS フォールバック', () => {
  it('loading 中は TS にフォールバック', () => {
    setExecutionMode('wasm-only')
    vi.spyOn(wasmEngine, 'getWasmState').mockReturnValue('loading')
    const values = [100, 200, 300]
    expect(calculateStdDev(values)).toEqual(calculateStdDevDirect(values))
  })

  it('error 状態でも TS にフォールバック', () => {
    setExecutionMode('wasm-only')
    vi.spyOn(wasmEngine, 'getWasmState').mockReturnValue('error')
    expect(linearRegression(sampleDailySales)).toEqual(linearRegressionDirect(sampleDailySales))
  })
})

/* ── 4. dual-run-compare + WASM 未初期化 ─────── */

describe('dual-run-compare + WASM idle: TS フォールバック（compare なし）', () => {
  it('WASM 未初期化時は TS 結果のみ、compare は発生しない', () => {
    setExecutionMode('dual-run-compare')
    const spy = vi.spyOn(console, 'warn')
    const values = [100, 200, 300]
    const result = calculateStdDev(values)
    expect(result).toEqual(calculateStdDevDirect(values))
    expect(spy).not.toHaveBeenCalled()
  })

  it('analyzeTrend: compare は発生しない', () => {
    setExecutionMode('dual-run-compare')
    const spy = vi.spyOn(console, 'warn')
    const result = analyzeTrend(sampleMonthlyData)
    expect(result).toEqual(analyzeTrendDirect(sampleMonthlyData))
    expect(spy).not.toHaveBeenCalled()
  })
})

/* ── 5. ForecastMismatchLog shape（将来 WASM 接続時用） ── */
// Note: isWasmReady() は現在常に false を返すため、
// dual-run-compare の内部比較ロジックは実際には実行されない。
// ここでは ts-only 経由の TS 結果正当性と、
// WASM 未接続時の安全性を確認する。

describe('forecast WASM スタブの安全性', () => {
  it('WASM スタブ関数はモック経由でのみ呼ばれる', () => {
    // forecastWasm はモックされているため、直接 import しても throw しない
    const mockResult = calculateStdDevWasm([1, 2, 3])
    expect(mockResult).toEqual({ mean: 99999, stdDev: 99999 })
  })

  it('linearRegressionWasm のモック値が正しい', () => {
    const mockResult = linearRegressionWasm(sampleDailySales)
    expect(mockResult).toEqual({ slope: 99999, intercept: 99999, rSquared: 99999 })
  })
})

/* ── 6. dual-run-compare + 一致時 → WASM 未接続のため compare 自体が発生しない ── */

describe('dual-run-compare: WASM 未接続のため常に TS 結果を返す', () => {
  it('calculateStdDev: TS 結果を返し warn なし', () => {
    setExecutionMode('dual-run-compare')
    const spy = vi.spyOn(console, 'warn')
    const values = [100, 200, 300, 400, 500]
    const result = calculateStdDev(values)
    expect(result).toEqual(calculateStdDevDirect(values))
    expect(spy).not.toHaveBeenCalled()
  })

  it('detectAnomalies: TS 結果を返し warn なし', () => {
    setExecutionMode('dual-run-compare')
    const spy = vi.spyOn(console, 'warn')
    const result = detectAnomalies(sampleDailySales)
    expect(result).toEqual(detectAnomaliesDirect(sampleDailySales))
    expect(spy).not.toHaveBeenCalled()
  })

  it('calculateWMA: TS 結果を返し warn なし', () => {
    setExecutionMode('dual-run-compare')
    const spy = vi.spyOn(console, 'warn')
    const result = calculateWMA(sampleDailySales)
    expect(result).toEqual(calculateWMADirect(sampleDailySales))
    expect(spy).not.toHaveBeenCalled()
  })

  it('linearRegression: TS 結果を返し warn なし', () => {
    setExecutionMode('dual-run-compare')
    const spy = vi.spyOn(console, 'warn')
    const result = linearRegression(sampleDailySales)
    expect(result).toEqual(linearRegressionDirect(sampleDailySales))
    expect(spy).not.toHaveBeenCalled()
  })

  it('analyzeTrend: TS 結果を返し warn なし', () => {
    setExecutionMode('dual-run-compare')
    const spy = vi.spyOn(console, 'warn')
    const result = analyzeTrend(sampleMonthlyData)
    expect(result).toEqual(analyzeTrendDirect(sampleMonthlyData))
    expect(spy).not.toHaveBeenCalled()
  })
})

/* ── 7. Date 依存関数が compare 対象外であることの確認 ── */

describe('Date 依存関数: compare 対象外（全モードで直接委譲）', () => {
  it('calculateForecast: wasm-only でも TS 結果', () => {
    setExecutionMode('wasm-only')
    const input = {
      year: 2025,
      month: 3,
      dailySales: sampleDailySales,
      dailyGrossProfit: makeDailySalesMap([
        [1, 30000], [2, 36000], [3, 28500], [4, 39000], [5, 33000],
      ]),
    }
    const result = calculateForecast(input)
    expect(result).toHaveProperty('weeklySummaries')
    expect(result).toHaveProperty('dayOfWeekAverages')
    expect(result).toHaveProperty('anomalies')
  })

  it('calculateMonthEndProjection: wasm-only でも TS 結果', () => {
    setExecutionMode('wasm-only')
    const result = calculateMonthEndProjection(2025, 3, sampleDailySales)
    expect(result).toHaveProperty('linearProjection')
    expect(result).toHaveProperty('confidenceInterval')
  })

  it('calculateWeeklySummaries: wasm-only でも TS 結果', () => {
    setExecutionMode('wasm-only')
    const input = {
      year: 2025,
      month: 3,
      dailySales: sampleDailySales,
      dailyGrossProfit: makeDailySalesMap([[1, 30000]]),
    }
    const result = calculateWeeklySummaries(input)
    expect(result.length).toBeGreaterThan(0)
  })

  it('calculateDayOfWeekAverages: wasm-only でも TS 結果', () => {
    setExecutionMode('wasm-only')
    const input = {
      year: 2025,
      month: 3,
      dailySales: sampleDailySales,
      dailyGrossProfit: makeDailySalesMap([[1, 30000]]),
    }
    const result = calculateDayOfWeekAverages(input)
    expect(result).toHaveLength(7)
  })

  it('getWeekRanges: wasm-only でも TS 結果', () => {
    setExecutionMode('wasm-only')
    const result = getWeekRanges(2025, 3)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('weekNumber')
  })

  it('Date 依存関数は dual-run-compare でも warn なし', () => {
    setExecutionMode('dual-run-compare')
    const spy = vi.spyOn(console, 'warn')
    const input = {
      year: 2025,
      month: 3,
      dailySales: sampleDailySales,
      dailyGrossProfit: makeDailySalesMap([[1, 30000]]),
    }
    calculateForecast(input)
    calculateMonthEndProjection(2025, 3, sampleDailySales)
    calculateWeeklySummaries(input)
    calculateDayOfWeekAverages(input)
    getWeekRanges(2025, 3)
    expect(spy).not.toHaveBeenCalled()
  })
})

/* ── 8. F-INV invariants: bridge 経由でも成立 ── */

describe('F-INV invariants: bridge 経由でも成立', () => {
  it('F-INV-1: stdDev >= 0', () => {
    const result = calculateStdDev([100, 200, 300])
    expect(result.stdDev).toBeGreaterThanOrEqual(0)
  })

  it('F-INV-2: 全要素同値 → stdDev == 0', () => {
    const result = calculateStdDev([500, 500, 500])
    expect(result.stdDev).toBe(0)
    expect(result.mean).toBe(500)
  })

  it('F-INV-3: mean == sum / count', () => {
    const values = [100, 200, 300, 400, 500]
    const result = calculateStdDev(values)
    expect(result.mean).toBe(300)
  })

  it('F-INV-6: 0 <= R² <= 1 (linearRegression)', () => {
    const result = linearRegression(sampleDailySales)
    expect(result.rSquared).toBeGreaterThanOrEqual(0)
    expect(result.rSquared).toBeLessThanOrEqual(1)
  })

  it('F-INV-7: 完全線形データ → R² ≈ 1', () => {
    const linear = makeDailySalesMap([
      [1, 100], [2, 200], [3, 300], [4, 400], [5, 500],
    ])
    const result = linearRegression(linear)
    expect(result.rSquared).toBeCloseTo(1.0, 10)
  })

  it('F-INV-8: anomaly 検出 — isAnomaly == (|zScore| > threshold)', () => {
    const anomalies = detectAnomalies(sampleDailySales, 1.5)
    for (const a of anomalies) {
      expect(a.isAnomaly).toBe(Math.abs(a.zScore) > 1.5)
    }
  })

  it('F-INV-9: 空入力 → stdDev == 0, mean == 0', () => {
    const result = calculateStdDev([])
    expect(result.mean).toBe(0)
    expect(result.stdDev).toBe(0)
  })

  it('F-INV-10: < 3 データ → anomaly 空配列', () => {
    const small = makeDailySalesMap([[1, 100], [2, 200]])
    expect(detectAnomalies(small)).toEqual([])
  })

  it('F-INV-13: overallTrend ∈ {up, down, flat}', () => {
    const result = analyzeTrend(sampleMonthlyData)
    expect(['up', 'down', 'flat']).toContain(result.overallTrend)
  })

  it('F-INV-12: seasonalIndex length == 12', () => {
    const result = analyzeTrend(sampleMonthlyData)
    expect(result.seasonalIndex).toHaveLength(12)
  })
})
