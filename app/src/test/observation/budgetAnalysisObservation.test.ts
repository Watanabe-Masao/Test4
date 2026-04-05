/**
 * budgetAnalysis 不変条件テスト（authoritative）
 *
 * budgetAnalysis は WASM authoritative に昇格済み。
 * 2 関数 × 4 フィクスチャで不変条件を検証する。
 *
 * @see references/02-status/engine-promotion-matrix.md — authoritative
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateBudgetAnalysis as calculateBudgetAnalysisDirect,
  calculateGrossProfitBudget as calculateGrossProfitBudgetDirect,
} from '@/domain/calculations/budgetAnalysis'
import * as wasmEngine from '@/application/services/wasmEngine'
import { ALL_FIXTURES } from './fixtures/budgetAnalysisFixtures'

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

function setupCleanMocks(): void {
  vi.mocked(calculateBudgetAnalysisWasm).mockImplementation((input) =>
    calculateBudgetAnalysisDirect(input),
  )
  vi.mocked(calculateGrossProfitBudgetWasm).mockImplementation((input) =>
    calculateGrossProfitBudgetDirect(input),
  )
}

/* ── テスト ── */

describe('budgetAnalysis 不変条件テスト（authoritative）', () => {
  beforeEach(() => {
    vi.spyOn(wasmEngine, 'getBudgetAnalysisWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getBudgetAnalysisWasmExports>,
    )
    setupCleanMocks()
  })

  for (const fixture of ALL_FIXTURES) {
    describe(`fixture: ${fixture.name}`, () => {
      it('calculateBudgetAnalysis: WASM 経由で呼ばれる', () => {
        calculateBudgetAnalysis(fixture.budgetAnalysis)
        expect(calculateBudgetAnalysisWasm).toHaveBeenCalled()
      })

      it('calculateGrossProfitBudget: WASM 経由で呼ばれる', () => {
        calculateGrossProfitBudget(fixture.grossProfitBudget)
        expect(calculateGrossProfitBudgetWasm).toHaveBeenCalled()
      })
    })
  }

  describe('不変条件', () => {
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

    it('dailyCumulative は TS から補完される', () => {
      const f = ALL_FIXTURES[0]
      const result = calculateBudgetAnalysis(f.budgetAnalysis)
      // WASM は dailyCumulative: {} を返すが、bridge が TS から補完する
      const keys = Object.keys(result.dailyCumulative)
      expect(keys.length).toBeGreaterThan(0)
    })
  })

  describe('TS フォールバック', () => {
    it('WASM 未初期化時は TS にフォールバック', () => {
      vi.spyOn(wasmEngine, 'getBudgetAnalysisWasmExports').mockReturnValue(null)
      vi.mocked(calculateBudgetAnalysisWasm).mockClear()
      const f = ALL_FIXTURES[0]
      const result = calculateBudgetAnalysis(f.budgetAnalysis)
      expect(calculateBudgetAnalysisWasm).not.toHaveBeenCalled()
      expect(result.remainingBudget).toBe(f.budgetAnalysis.budget - f.budgetAnalysis.totalSales)
    })
  })
})
