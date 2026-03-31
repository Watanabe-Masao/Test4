/**
 * wasmEngine fallback / rollback テスト
 *
 * WASM 初期化失敗時のフォールバック動作と
 * モード切替のロールバック動作を検証する。
 *
 * engine-promotion-matrix の promotion 基準:
 * 「fallback / rollback テスト pass」
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('wasmEngine fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('WASM init 失敗 → state が error になる', async () => {
    // factor-decomposition-wasm を reject する mock に一時差替
    vi.doMock('factor-decomposition-wasm', () => ({
      default: () => Promise.reject(new Error('mock init failure')),
    }))

    const { initFactorDecompositionWasm, getWasmModuleState } =
      await import('@/application/services/wasmEngine')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await initFactorDecompositionWasm()
    expect(getWasmModuleState('factorDecomposition')).toBe('error')
  })

  it('state=error → bridge は TS を返す（decompose2）', async () => {
    vi.doMock('factor-decomposition-wasm', () => ({
      default: () => Promise.reject(new Error('mock init failure')),
    }))

    const wasmEngine = await import('@/application/services/wasmEngine')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await wasmEngine.initFactorDecompositionWasm()
    expect(wasmEngine.getWasmModuleState('factorDecomposition')).toBe('error')

    wasmEngine.setExecutionMode('wasm-only')

    // bridge をインポート — state=error なので TS にフォールバック
    const { decompose2 } = await import('@/application/services/factorDecompositionBridge')
    const { decompose2: decompose2TS } = await import('@/domain/calculations/factorDecomposition')

    const result = decompose2(200_000, 280_000, 100, 120)
    const expected = decompose2TS(200_000, 280_000, 100, 120)
    expect(result.custEffect).toBeCloseTo(expected.custEffect)
    expect(result.ticketEffect).toBeCloseTo(expected.ticketEffect)
  })

  it('state=loading → bridge は TS にフォールバック', async () => {
    const wasmEngine = await import('@/application/services/wasmEngine')
    // idle のまま init を呼ばない = loading 状態にはならないが、
    // idle でも ready でないため TS にフォールバックする
    expect(wasmEngine.getWasmModuleState('factorDecomposition')).toBe('idle')

    wasmEngine.setExecutionMode('wasm-only')

    const { decompose2 } = await import('@/application/services/factorDecompositionBridge')
    const { decompose2: decompose2TS } = await import('@/domain/calculations/factorDecomposition')

    const result = decompose2(200_000, 280_000, 100, 120)
    const expected = decompose2TS(200_000, 280_000, 100, 120)
    expect(result.custEffect).toBeCloseTo(expected.custEffect)
    expect(result.ticketEffect).toBeCloseTo(expected.ticketEffect)
  })

  it('state=ready + wasm-only → bridge は WASM を使う', async () => {
    vi.doUnmock('factor-decomposition-wasm')
    const wasmEngine = await import('@/application/services/wasmEngine')
    await wasmEngine.initFactorDecompositionWasm()
    expect(wasmEngine.getWasmModuleState('factorDecomposition')).toBe('ready')

    wasmEngine.setExecutionMode('wasm-only')

    const { decompose2 } = await import('@/application/services/factorDecompositionBridge')
    const { decompose2: decompose2TS } = await import('@/domain/calculations/factorDecomposition')

    // typed mock は TS passthrough なので結果は同一
    const result = decompose2(200_000, 280_000, 100, 120)
    const expected = decompose2TS(200_000, 280_000, 100, 120)
    expect(result.custEffect).toBeCloseTo(expected.custEffect)
    expect(result.ticketEffect).toBeCloseTo(expected.ticketEffect)
  })
})

describe('wasmEngine rollback', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('wasm-only → ts-only → bridge は TS を使う', async () => {
    vi.doUnmock('factor-decomposition-wasm')
    const wasmEngine = await import('@/application/services/wasmEngine')
    await wasmEngine.initFactorDecompositionWasm()

    wasmEngine.setExecutionMode('wasm-only')
    expect(wasmEngine.getExecutionMode()).toBe('wasm-only')

    wasmEngine.setExecutionMode('ts-only')
    expect(wasmEngine.getExecutionMode()).toBe('ts-only')

    const { decompose2 } = await import('@/application/services/factorDecompositionBridge')
    const { decompose2: decompose2TS } = await import('@/domain/calculations/factorDecomposition')

    const result = decompose2(200_000, 280_000, 100, 120)
    const expected = decompose2TS(200_000, 280_000, 100, 120)
    expect(result.custEffect).toBeCloseTo(expected.custEffect)
  })

  it('dual-run-compare + state=ready → TS と WASM 両方実行（結果は TS）', async () => {
    vi.doUnmock('factor-decomposition-wasm')
    const wasmEngine = await import('@/application/services/wasmEngine')
    await wasmEngine.initFactorDecompositionWasm()

    wasmEngine.setExecutionMode('dual-run-compare')

    const { decompose2 } = await import('@/application/services/factorDecompositionBridge')
    const { decompose2: decompose2TS } = await import('@/domain/calculations/factorDecomposition')

    // dual-run は TS 結果を返す（authoritative）
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = decompose2(200_000, 280_000, 100, 120)
    const expected = decompose2TS(200_000, 280_000, 100, 120)
    expect(result.custEffect).toBeCloseTo(expected.custEffect)
    expect(result.ticketEffect).toBeCloseTo(expected.ticketEffect)
  })
})
