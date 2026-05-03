/**
 * forecast 不変条件テスト（authoritative）
 *
 * forecast は WASM authoritative に昇格済み。
 * 5 pure 関数 × 4 フィクスチャで不変条件を検証する。
 * Date 依存関数は TS 直接委譲（WASM 対象外）。
 *
 * @see references/04-tracking/engine-promotion-matrix.md — authoritative
 *
 * @taxonomyKind T:unclassified
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
import * as wasmEngine from '@/application/services/wasmEngine'
import { ALL_FIXTURES, NORMAL } from './fixtures/forecastFixtures'

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

function setupCleanMocks(): void {
  vi.mocked(calculateStdDevWasm).mockImplementation((ds) => calculateStdDevDirect(ds))
  vi.mocked(detectAnomaliesWasm).mockImplementation((ds, t) => detectAnomaliesDirect(ds, t))
  vi.mocked(calculateWMAWasm).mockImplementation((ds, w) => calculateWMADirect(ds, w))
  vi.mocked(linearRegressionWasm).mockImplementation((ds) => linearRegressionDirect(ds))
  vi.mocked(analyzeTrendWasm).mockImplementation((md) => analyzeTrendDirect(md))
}

/* ── テスト ── */

describe('forecast 不変条件テスト（authoritative）', () => {
  beforeEach(() => {
    vi.spyOn(wasmEngine, 'getForecastWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getForecastWasmExports>,
    )
    setupCleanMocks()
  })

  for (const fixture of ALL_FIXTURES) {
    describe(`fixture: ${fixture.name}`, () => {
      it('calculateStdDev: WASM 経由で呼ばれる', () => {
        calculateStdDev([...fixture.dailySales.values()])
        expect(calculateStdDevWasm).toHaveBeenCalled()
      })

      it('detectAnomalies: WASM 経由で呼ばれる', () => {
        detectAnomalies(fixture.dailySales)
        expect(detectAnomaliesWasm).toHaveBeenCalled()
      })

      if (fixture.dailySales.size >= 2) {
        it('calculateWMA: WASM 経由で呼ばれる', () => {
          calculateWMA(fixture.dailySales)
          expect(calculateWMAWasm).toHaveBeenCalled()
        })

        it('linearRegression: WASM 経由で呼ばれる', () => {
          linearRegression(fixture.dailySales)
          expect(linearRegressionWasm).toHaveBeenCalled()
        })
      }

      if (fixture.monthlyData.length >= 3) {
        it('analyzeTrend: WASM 経由で呼ばれる', () => {
          analyzeTrend(fixture.monthlyData)
          expect(analyzeTrendWasm).toHaveBeenCalled()
        })
      }
    })
  }

  describe('不変条件', () => {
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

  describe('TS フォールバック', () => {
    it('WASM 未初期化時は TS にフォールバック', () => {
      vi.spyOn(wasmEngine, 'getForecastWasmExports').mockReturnValue(null)
      vi.mocked(calculateStdDevWasm).mockClear()
      const result = calculateStdDev([...NORMAL.dailySales.values()])
      expect(calculateStdDevWasm).not.toHaveBeenCalled()
      expect(result.stdDev).toBeGreaterThanOrEqual(0)
    })
  })
})
