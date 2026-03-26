/**
 * budgetAnalysis 自動観測ハーネス
 *
 * 2 関数 × 4 フィクスチャで dual-run compare pipeline を自動検証する。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateBudgetAnalysis as calculateBudgetAnalysisDirect,
  calculateGrossProfitBudget as calculateGrossProfitBudgetDirect,
} from '@/domain/calculations/budgetAnalysis'
import { setExecutionMode } from '@/application/services/wasmEngine'
import * as wasmEngine from '@/application/services/wasmEngine'
import { resetObserver, buildRunResult } from './observationRunner'
import { judgeObservation } from './observationAssertions'
import { buildJsonReport } from './observationReport'
import { ALL_FIXTURES, type BudgetAnalysisFixture } from './fixtures/budgetAnalysisFixtures'

/* ── WASM mock: TS passthrough ── */

vi.mock('@/application/services/budgetAnalysisWasm', () => ({
  calculateBudgetAnalysisWasm: vi.fn(),
  calculateGrossProfitBudgetWasm: vi.fn(),
}))

import {
  calculateBudgetAnalysis,
  calculateGrossProfitBudget,
} from '@/application/services/budgetAnalysisBridge'
import {
  calculateBudgetAnalysisWasm,
  calculateGrossProfitBudgetWasm,
} from '@/application/services/budgetAnalysisWasm'

const EXPECTED_FUNCTIONS = ['calculateBudgetAnalysis', 'calculateGrossProfitBudget'] as const

function setupCleanMocks(): void {
  vi.mocked(calculateBudgetAnalysisWasm).mockImplementation((input) =>
    calculateBudgetAnalysisDirect(input),
  )
  vi.mocked(calculateGrossProfitBudgetWasm).mockImplementation((input) =>
    calculateGrossProfitBudgetDirect(input),
  )
}

function runAllFunctions(f: BudgetAnalysisFixture): void {
  calculateBudgetAnalysis(f.budgetAnalysis)
  calculateGrossProfitBudget(f.grossProfitBudget)
}

/* ── テスト ── */

describe('budgetAnalysis 自動観測ハーネス', () => {
  beforeEach(() => {
    resetObserver()
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getBudgetAnalysisWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getBudgetAnalysisWasmExports>,
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setupCleanMocks()
  })

  for (const fixture of ALL_FIXTURES) {
    describe(`fixture: ${fixture.name}`, () => {
      it('全 2 関数が呼ばれ、verdict が clean', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('budgetAnalysis', fixture.name)
        expect(result.summary.totalCalls).toBeGreaterThanOrEqual(2)
        expect(result.summary.verdict).toBe('clean')
      })

      it('expected call coverage を満たす', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('budgetAnalysis', fixture.name)
        const judgment = judgeObservation(result, EXPECTED_FUNCTIONS)
        expect(judgment.status).not.toBe('fail')
      })

      it('JSON report が生成できる', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('budgetAnalysis', fixture.name)
        const judgment = judgeObservation(result, EXPECTED_FUNCTIONS)
        const report = buildJsonReport(result, judgment, EXPECTED_FUNCTIONS)
        expect(report.engine).toBe('budgetAnalysis')
        expect(report.fixture).toBe(fixture.name)
        expect(report.status).not.toBe('fail')
        expect(Object.keys(report.callCounts)).toHaveLength(2)
      })
    })
  }

  describe('全フィクスチャ横断: invariant 保持', () => {
    it('B-INV-1: remainingBudget = budget - totalSales', () => {
      const f = ALL_FIXTURES[0] // normal
      const result = calculateBudgetAnalysis(f.budgetAnalysis)
      expect(result.remainingBudget).toBe(f.budgetAnalysis.budget - f.budgetAnalysis.totalSales)
    })

    it('B-INV-5: zero divisor safety', () => {
      const f = ALL_FIXTURES[1] // null-zero-missing
      const result = calculateBudgetAnalysis(f.budgetAnalysis)
      expect(Number.isFinite(result.budgetAchievementRate)).toBe(true)
      expect(Number.isFinite(result.budgetProgressRate)).toBe(true)
    })
  })

  describe('mismatch 検出の動作確認', () => {
    it('WASM が異なる値を返す → mismatch 検出', () => {
      vi.mocked(calculateBudgetAnalysisWasm).mockReturnValue({
        budgetAchievementRate: 99999,
        budgetProgressRate: 99999,
        budgetElapsedRate: 99999,
        budgetProgressGap: 99999,
        budgetVariance: 99999,
        averageDailySales: 99999,
        projectedSales: 99999,
        projectedAchievement: 99999,
        requiredDailySales: 99999,
        remainingBudget: 99999,
        dailyCumulative: {},
      })
      calculateBudgetAnalysis(ALL_FIXTURES[0].budgetAnalysis)
      const result = buildRunResult('budgetAnalysis', 'mismatch-test')
      expect(result.summary.totalMismatches).toBeGreaterThan(0)
    })
  })
})
