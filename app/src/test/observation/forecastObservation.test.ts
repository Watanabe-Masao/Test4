/**
 * forecast 自動観測ハーネス
 *
 * 5 pure 関数 × 4 フィクスチャで dual-run compare pipeline を自動検証する。
 * Date 依存関数は compare 対象外。
 *
 * Rust/WASM 実装済み。WASM mock は TS passthrough で dual-run compare を検証する。
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
import { setExecutionMode } from '@/application/services/wasmEngine'
import * as wasmEngine from '@/application/services/wasmEngine'
import { resetObserver, buildRunResult } from './observationRunner'
import { judgeObservation } from './observationAssertions'
import { buildJsonReport } from './observationReport'
import { ALL_FIXTURES, NORMAL, type ForecastFixture } from './fixtures/forecastFixtures'

/* ── WASM mock: TS passthrough ── */

vi.mock('@/application/services/forecastWasm', () => ({
  calculateStdDevWasm: vi.fn(),
  detectAnomaliesWasm: vi.fn(),
  calculateWMAWasm: vi.fn(),
  linearRegressionWasm: vi.fn(),
  analyzeTrendWasm: vi.fn(),
}))

import {
  calculateStdDev,
  detectAnomalies,
  calculateWMA,
  linearRegression,
  analyzeTrend,
} from '@/application/services/forecastBridge'
import {
  calculateStdDevWasm,
  detectAnomaliesWasm,
  calculateWMAWasm,
  linearRegressionWasm,
  analyzeTrendWasm,
} from '@/application/services/forecastWasm'

const EXPECTED_FUNCTIONS = [
  'calculateStdDev',
  'detectAnomalies',
  'calculateWMA',
  'linearRegression',
  'analyzeTrend',
] as const

function setupCleanMocks(): void {
  vi.mocked(calculateStdDevWasm).mockImplementation((ds) => calculateStdDevDirect(ds))
  vi.mocked(detectAnomaliesWasm).mockImplementation((ds, t) => detectAnomaliesDirect(ds, t))
  vi.mocked(calculateWMAWasm).mockImplementation((ds, w) => calculateWMADirect(ds, w))
  vi.mocked(linearRegressionWasm).mockImplementation((ds) => linearRegressionDirect(ds))
  vi.mocked(analyzeTrendWasm).mockImplementation((md) => analyzeTrendDirect(md))
}

function runAllFunctions(f: ForecastFixture): void {
  calculateStdDev([...f.dailySales.values()])
  detectAnomalies(f.dailySales)
  if (f.dailySales.size >= 2) {
    calculateWMA(f.dailySales)
    linearRegression(f.dailySales)
  }
  if (f.monthlyData.length >= 3) {
    analyzeTrend(f.monthlyData)
  }
}

/* ── テスト ── */

describe('forecast 自動観測ハーネス', () => {
  beforeEach(() => {
    resetObserver()
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getForecastWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getForecastWasmExports>,
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setupCleanMocks()
  })

  describe('fixture: normal', () => {
    it('5 関数が呼ばれ、verdict が clean', () => {
      runAllFunctions(NORMAL)
      const result = buildRunResult('forecast', 'normal')
      expect(result.summary.totalCalls).toBeGreaterThanOrEqual(5)
      expect(result.summary.verdict).toBe('clean')
    })

    it('expected call coverage を満たす', () => {
      runAllFunctions(NORMAL)
      const result = buildRunResult('forecast', 'normal')
      const judgment = judgeObservation(result, EXPECTED_FUNCTIONS)
      expect(judgment.status).not.toBe('fail')
    })

    it('JSON report が生成できる', () => {
      runAllFunctions(NORMAL)
      const result = buildRunResult('forecast', 'normal')
      const judgment = judgeObservation(result, EXPECTED_FUNCTIONS)
      const report = buildJsonReport(result, judgment, EXPECTED_FUNCTIONS)
      expect(report.engine).toBe('forecast')
      expect(report.status).not.toBe('fail')
    })
  })

  describe('fixture: null-zero-missing', () => {
    it('空データでも crash しない', () => {
      const f = ALL_FIXTURES[1]
      // 空 Map → stdDev / detectAnomalies は呼べるが WMA / regression は短すぎる
      calculateStdDev([...f.dailySales.values()])
      detectAnomalies(f.dailySales)
      const result = buildRunResult('forecast', f.name)
      expect(result.summary.verdict).toBe('clean')
    })
  })

  describe('fixture: extreme', () => {
    it('大値データでも安定', () => {
      runAllFunctions(ALL_FIXTURES[2])
      const result = buildRunResult('forecast', 'extreme')
      expect(result.summary.verdict).toBe('clean')
    })
  })

  describe('fixture: boundary', () => {
    it('最小データでも安定', () => {
      const f = ALL_FIXTURES[3]
      calculateStdDev([...f.dailySales.values()])
      detectAnomalies(f.dailySales)
      calculateWMA(f.dailySales)
      linearRegression(f.dailySales)
      analyzeTrend(f.monthlyData)
      const result = buildRunResult('forecast', 'boundary')
      expect(result.summary.verdict).toBe('clean')
    })
  })

  describe('invariant 保持', () => {
    it('F-INV-1: stdDev >= 0', () => {
      const result = calculateStdDev([...NORMAL.dailySales.values()])
      expect(result.stdDev).toBeGreaterThanOrEqual(0)
    })

    it('F-INV-2: R² は 0..1 の範囲', () => {
      const result = linearRegression(NORMAL.dailySales)
      expect(result.rSquared).toBeGreaterThanOrEqual(0)
      expect(result.rSquared).toBeLessThanOrEqual(1)
    })
  })

  describe('mismatch 検出の動作確認', () => {
    it('WASM ready + 意図的な差分 → mismatch が記録される', () => {
      vi.mocked(calculateStdDevWasm).mockReturnValue({ mean: 99999, stdDev: 99999 })
      calculateStdDev([...NORMAL.dailySales.values()])
      const result = buildRunResult('forecast', 'mismatch-test')
      expect(result.summary.totalMismatches).toBeGreaterThanOrEqual(1)
    })
  })
})
