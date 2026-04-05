/**
 * WASM Authoritative Trial テスト
 *
 * WASM authoritative bridge のディスパッチ・フォールバックを検証。
 * factorDecomposition engine を代表として使用。
 *
 * promotion-criteria.md の「authoritative 条件」に対応:
 * - WASM ready → WASM 実装が使われる
 * - WASM error → TS にフォールバック
 * - 結果の数学的正確性（Shapley 恒等式）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as wasmEngine from '@/application/services/wasmEngine'
import { decompose2 as decompose2TS } from '@/domain/calculations/factorDecomposition'

vi.mock('@/application/services/factorDecompositionWasm', () => ({
  decompose2Wasm: vi.fn(),
  decompose3Wasm: vi.fn(),
  decompose5Wasm: vi.fn(),
  decomposePriceMixWasm: vi.fn(),
}))
import { decompose2 } from '@/application/services/factorDecompositionBridge'
import { decompose2Wasm } from '@/application/services/factorDecompositionWasm'

describe('WASM Authoritative Trial', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('WASM ready → WASM 経由で実行される', () => {
    beforeEach(() => {
      vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
      vi.mocked(decompose2Wasm).mockImplementation((ps, cs, pc, cc) => decompose2TS(ps, cs, pc, cc))
    })

    it('decompose2 が WASM mock 経由で正しい結果を返す', () => {
      const result = decompose2(100000, 120000, 500, 480)
      expect(result).not.toBeNull()
      expect(result!.custEffect + result!.ticketEffect).toBeCloseTo(20000, 0)
      expect(decompose2Wasm).toHaveBeenCalled()
    })

    it('Shapley 恒等式: effects 合計 = salesDiff', () => {
      const result = decompose2(80000, 100000, 400, 500)
      expect(result).not.toBeNull()
      expect(result!.custEffect + result!.ticketEffect).toBeCloseTo(20000, 0)
    })
  })

  describe('WASM error → TS フォールバック', () => {
    beforeEach(() => {
      vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('error')
      vi.mocked(decompose2Wasm).mockClear()
    })

    it('WASM error 時は TS にフォールバックし WASM は呼ばれない', () => {
      const result = decompose2(100000, 120000, 500, 480)
      expect(result).not.toBeNull()
      expect(decompose2Wasm).not.toHaveBeenCalled()
    })

    it('フォールバック結果も Shapley 恒等式を満たす', () => {
      const result = decompose2(100000, 120000, 500, 480)
      expect(result!.custEffect + result!.ticketEffect).toBeCloseTo(20000, 0)
    })
  })

  describe('WASM ready ↔ error 切替: 結果は同一', () => {
    it('WASM → TS フォールバックで結果が変わらない', () => {
      vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
      vi.mocked(decompose2Wasm).mockImplementation((ps, cs, pc, cc) => decompose2TS(ps, cs, pc, cc))

      const r1 = decompose2(100000, 120000, 500, 480)
      expect(r1).not.toBeNull()

      vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('error')
      vi.mocked(decompose2Wasm).mockClear()

      const r2 = decompose2(100000, 120000, 500, 480)
      expect(r2).not.toBeNull()
      expect(decompose2Wasm).not.toHaveBeenCalled()
      expect(r1!.custEffect).toBeCloseTo(r2!.custEffect)
      expect(r1!.ticketEffect).toBeCloseTo(r2!.ticketEffect)
    })
  })
})
