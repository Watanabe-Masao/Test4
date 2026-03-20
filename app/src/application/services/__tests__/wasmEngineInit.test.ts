/**
 * wasmEngine 初期化テスト
 *
 * 型付きモック（Promise.resolve する init）により
 * wasmEngine の初期化が成功し state='ready' に到達することを検証する。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('wasmEngine 初期化', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('initFactorDecompositionWasm → state が ready になる', async () => {
    const { initFactorDecompositionWasm, getWasmState } =
      await import('@/application/services/wasmEngine')
    expect(getWasmState()).toBe('idle')
    await initFactorDecompositionWasm()
    expect(getWasmState()).toBe('ready')
  })

  it('initGrossProfitWasm → exports が非null', async () => {
    const { initGrossProfitWasm, getGrossProfitWasmExports } =
      await import('@/application/services/wasmEngine')
    expect(getGrossProfitWasmExports()).toBeNull()
    await initGrossProfitWasm()
    expect(getGrossProfitWasmExports()).not.toBeNull()
  })

  it('initBudgetAnalysisWasm → exports が非null', async () => {
    const { initBudgetAnalysisWasm, getBudgetAnalysisWasmExports } =
      await import('@/application/services/wasmEngine')
    expect(getBudgetAnalysisWasmExports()).toBeNull()
    await initBudgetAnalysisWasm()
    expect(getBudgetAnalysisWasmExports()).not.toBeNull()
  })

  it('initForecastWasm → exports が非null', async () => {
    const { initForecastWasm, getForecastWasmExports } =
      await import('@/application/services/wasmEngine')
    expect(getForecastWasmExports()).toBeNull()
    await initForecastWasm()
    expect(getForecastWasmExports()).not.toBeNull()
  })

  it('2回目の initFactorDecompositionWasm は no-op（冪等性）', async () => {
    const { initFactorDecompositionWasm, getWasmState } =
      await import('@/application/services/wasmEngine')
    await initFactorDecompositionWasm()
    expect(getWasmState()).toBe('ready')
    // 2回目も ready のまま
    await initFactorDecompositionWasm()
    expect(getWasmState()).toBe('ready')
  })

  it('DEV 環境 + localStorage 未設定 → dual-run-compare がデフォルト', async () => {
    const { getExecutionMode } = await import('@/application/services/wasmEngine')
    // vitest は DEV=true で動作する
    expect(getExecutionMode()).toBe('dual-run-compare')
  })
})
