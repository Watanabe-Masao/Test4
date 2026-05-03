/**
 * factorDecomposition 不変条件テスト（authoritative）
 *
 * factorDecomposition は WASM authoritative に昇格済み。
 * 4 関数 × 4 フィクスチャで数学的不変条件（Shapley 恒等式）を検証する。
 *
 * @see references/04-tracking/engine-promotion-matrix.md — authoritative
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  decompose2 as decompose2TS,
  decompose3 as decompose3TS,
  decompose5 as decompose5TS,
  decomposePriceMix as decomposePriceMixTS,
} from '@/domain/calculations/factorDecomposition'
import * as wasmEngine from '@/application/services/wasmEngine'
import { ALL_FIXTURES, NORMAL } from './fixtures/factorDecompositionFixtures'

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

/* ── テスト ── */

describe('factorDecomposition 不変条件テスト（authoritative）', () => {
  beforeEach(() => {
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    setupCleanMocks()
  })

  for (const fixture of ALL_FIXTURES) {
    describe(`fixture: ${fixture.name}`, () => {
      it('decompose2: WASM 経由で呼ばれ、Shapley 恒等式を満たす', () => {
        const f = fixture
        const r = decompose2(f.prevSales, f.curSales, f.prevCust, f.curCust)
        expect(decompose2Wasm).toHaveBeenCalled()
        expect(r.custEffect + r.ticketEffect).toBeCloseTo(f.curSales - f.prevSales, 0)
      })

      it('decompose3: WASM 経由で呼ばれ、3要因合計 = salesDiff', () => {
        const f = fixture
        const r = decompose3(f.prevSales, f.curSales, f.prevCust, f.curCust, f.prevQty, f.curQty)
        expect(decompose3Wasm).toHaveBeenCalled()
        expect(r.custEffect + r.qtyEffect + r.pricePerItemEffect).toBeCloseTo(
          f.curSales - f.prevSales,
          0,
        )
      })

      it('decompose5: WASM 経由で呼ばれる', () => {
        const f = fixture
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
        expect(decompose5Wasm).toHaveBeenCalled()
        if (f.curCats.length > 0 && f.prevCats.length > 0) {
          expect(r).not.toBeNull()
          expect(r!.custEffect + r!.qtyEffect + r!.priceEffect + r!.mixEffect).toBeCloseTo(
            f.curSales - f.prevSales,
            0,
          )
        }
      })

      it('decomposePriceMix: WASM 経由で呼ばれる', () => {
        const f = fixture
        decomposePriceMix(f.curCats, f.prevCats)
        expect(decomposePriceMixWasm).toHaveBeenCalled()
      })
    })
  }

  describe('null ハンドリング', () => {
    it('decompose5: 空カテゴリ → null', () => {
      const r = decompose5(100, 200, 1, 2, 1, 2, [], [])
      expect(r).toBeNull()
    })
  })

  describe('TS フォールバック', () => {
    it('WASM error 時は TS にフォールバックし、不変条件を満たす', () => {
      vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('error')
      const f = NORMAL
      const r = decompose2(f.prevSales, f.curSales, f.prevCust, f.curCust)
      expect(r.custEffect + r.ticketEffect).toBeCloseTo(f.curSales - f.prevSales, 0)
    })
  })
})
