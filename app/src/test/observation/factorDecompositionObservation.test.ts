/**
 * factorDecomposition 自動観測ハーネス
 *
 * 4 関数 × 4 フィクスチャで dual-run compare pipeline を自動検証する。
 * observationPipeline.test.ts を拡張し、全フィクスチャ + 自動判定を追加。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  decompose2 as decompose2TS,
  decompose3 as decompose3TS,
  decompose5 as decompose5TS,
  decomposePriceMix as decomposePriceMixTS,
} from '@/domain/calculations/factorDecomposition'
import { setExecutionMode } from '@/application/services/wasmEngine'
import * as wasmEngine from '@/application/services/wasmEngine'
import { resetObserver, buildRunResult } from './observationRunner'
import { judgeObservation } from './observationAssertions'
import { buildJsonReport } from './observationReport'
import {
  ALL_FIXTURES,
  NORMAL,
  type FactorDecompositionFixture,
} from './fixtures/factorDecompositionFixtures'

/* ── WASM mock: TS passthrough ── */

vi.mock('@/application/services/factorDecompositionWasm', () => ({
  decompose2Wasm: vi.fn(),
  decompose3Wasm: vi.fn(),
  decompose5Wasm: vi.fn(),
  decomposePriceMixWasm: vi.fn(),
}))

import {
  decompose2,
  decompose3,
  decompose5,
  decomposePriceMix,
} from '@/application/services/factorDecompositionBridge'
import {
  decompose2Wasm,
  decompose3Wasm,
  decompose5Wasm,
  decomposePriceMixWasm,
} from '@/application/services/factorDecompositionWasm'

const EXPECTED_FUNCTIONS = ['decompose2', 'decompose3', 'decompose5', 'decomposePriceMix'] as const

function setupCleanMocks(): void {
  vi.mocked(decompose2Wasm).mockImplementation((ps, cs, pc, cc) => decompose2TS(ps, cs, pc, cc))
  vi.mocked(decompose3Wasm).mockImplementation((ps, cs, pc, cc, ptq, ctq) =>
    decompose3TS(ps, cs, pc, cc, ptq, ctq),
  )
  vi.mocked(decompose5Wasm).mockImplementation((ps, cs, pc, cc, ptq, ctq, cur, prev) =>
    decompose5TS(ps, cs, pc, cc, ptq, ctq, cur, prev),
  )
  vi.mocked(decomposePriceMixWasm).mockImplementation((cur, prev) => decomposePriceMixTS(cur, prev))
}

function runAllFunctions(f: FactorDecompositionFixture): void {
  decompose2(f.prevSales, f.curSales, f.prevCust, f.curCust)
  decompose3(f.prevSales, f.curSales, f.prevCust, f.curCust, f.prevQty, f.curQty)
  decompose5(
    f.prevSales,
    f.curSales,
    f.prevCust,
    f.curCust,
    f.prevQty,
    f.curQty,
    f.curCats,
    f.prevCats,
  )
  decomposePriceMix(f.curCats, f.prevCats)
}

/* ── テスト ── */

describe('factorDecomposition 自動観測ハーネス', () => {
  beforeEach(() => {
    resetObserver()
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getWasmExports>,
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setupCleanMocks()
  })

  for (const fixture of ALL_FIXTURES) {
    describe(`fixture: ${fixture.name}`, () => {
      it('4 関数が呼ばれ、verdict が clean', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('factorDecomposition', fixture.name)
        expect(result.summary.totalCalls).toBeGreaterThanOrEqual(4)
        expect(result.summary.verdict).toBe('clean')
      })

      it('expected call coverage を満たす', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('factorDecomposition', fixture.name)
        const judgment = judgeObservation(result, EXPECTED_FUNCTIONS)
        expect(judgment.status).not.toBe('fail')
      })

      it('JSON report が生成できる', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('factorDecomposition', fixture.name)
        const judgment = judgeObservation(result, EXPECTED_FUNCTIONS)
        const report = buildJsonReport(result, judgment, EXPECTED_FUNCTIONS)
        expect(report.engine).toBe('factorDecomposition')
        expect(report.fixture).toBe(fixture.name)
        expect(report.status).not.toBe('fail')
      })
    })
  }

  describe('全フィクスチャ横断: Shapley 恒等式', () => {
    it('decompose2: custEffect + ticketEffect = salesDiff', () => {
      const f = NORMAL
      const r = decompose2(f.prevSales, f.curSales, f.prevCust, f.curCust)
      expect(r.custEffect + r.ticketEffect).toBeCloseTo(f.curSales - f.prevSales, 0)
    })

    it('decompose3: 3 要因合計 = salesDiff', () => {
      const f = NORMAL
      const r = decompose3(f.prevSales, f.curSales, f.prevCust, f.curCust, f.prevQty, f.curQty)
      expect(r.custEffect + r.qtyEffect + r.pricePerItemEffect).toBeCloseTo(
        f.curSales - f.prevSales,
        0,
      )
    })

    it('decompose5: 4 要因合計 = salesDiff (non-empty cats)', () => {
      const f = NORMAL
      const r = decompose5(
        f.prevSales,
        f.curSales,
        f.prevCust,
        f.curCust,
        f.prevQty,
        f.curQty,
        f.curCats,
        f.prevCats,
      )
      expect(r).not.toBeNull()
      expect(r!.custEffect + r!.qtyEffect + r!.priceEffect + r!.mixEffect).toBeCloseTo(
        f.curSales - f.prevSales,
        0,
      )
    })

    it('decompose5: 空カテゴリ → null', () => {
      const r = decompose5(100, 200, 1, 2, 1, 2, [], [])
      expect(r).toBeNull()
    })
  })

  describe('mismatch 検出の動作確認', () => {
    it('WASM が異なる値を返す → mismatch 検出', () => {
      vi.mocked(decompose2Wasm).mockReturnValue({
        custEffect: 99999,
        ticketEffect: 99999,
      })
      decompose2(NORMAL.prevSales, NORMAL.curSales, NORMAL.prevCust, NORMAL.curCust)
      const result = buildRunResult('factorDecomposition', 'mismatch-test')
      expect(result.summary.totalMismatches).toBeGreaterThan(0)
    })
  })
})
