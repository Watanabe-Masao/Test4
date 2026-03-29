/**
 * WASM-Only Trial テスト
 *
 * wasm-only モードのディスパッチ・フォールバック・ロールバックを検証。
 * factorDecomposition engine を代表として使用。
 *
 * promotion-criteria.md の「wasm-only trial 開始条件」に対応:
 * - wasm-only mode auto tests pass
 * - Rollback is confirmed
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setExecutionMode } from '@/application/services/wasmEngine'
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

function setupWasmReady() {
  vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
  vi.spyOn(wasmEngine, 'getWasmExports').mockReturnValue({} as never)
}

describe('WASM-Only Trial', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setupWasmReady()
  })

  describe('wasm-only モード: WASM 経由で実行される', () => {
    beforeEach(() => {
      setExecutionMode('wasm-only')
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

  describe('wasm-only + WASM error → TS フォールバック', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      setExecutionMode('wasm-only')
      vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('error')
      vi.spyOn(wasmEngine, 'getWasmExports').mockReturnValue(null)
    })

    it('WASM error 時は TS にフォールバックし WASM は呼ばれない', () => {
      const result = decompose2(100000, 120000, 500, 480)
      expect(result).not.toBeNull()
      expect(decompose2Wasm).not.toHaveBeenCalled()
    })
  })

  describe('rollback: wasm-only → ts-only', () => {
    it('モード切替後は TS のみ使用、結果は同一', () => {
      setupWasmReady()
      setExecutionMode('wasm-only')
      vi.mocked(decompose2Wasm).mockImplementation((ps, cs, pc, cc) => decompose2TS(ps, cs, pc, cc))

      const r1 = decompose2(100000, 120000, 500, 480)
      expect(r1).not.toBeNull()

      setExecutionMode('ts-only')
      vi.mocked(decompose2Wasm).mockClear()

      const r2 = decompose2(100000, 120000, 500, 480)
      expect(r2).not.toBeNull()
      expect(decompose2Wasm).not.toHaveBeenCalled()
      expect(r1!.custEffect).toBeCloseTo(r2!.custEffect)
      expect(r1!.ticketEffect).toBeCloseTo(r2!.ticketEffect)
    })
  })
})
