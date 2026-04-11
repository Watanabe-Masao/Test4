/**
 * Candidate Bridge テスト共通ヘルパー
 *
 * 全 candidate bridge の observation テストで使用する共通パターンを提供。
 * bridge 追加時のテストボイラープレートを削減し、一貫性を保証する。
 */
import { vi } from 'vitest'

/**
 * WASM ready 状態をモックする。
 * wasmEngine の getter を spyOn して非 null を返す。
 */
export function mockWasmReady(wasmEngineModule: Record<string, unknown>, getterName: string): void {
  vi.spyOn(wasmEngineModule, getterName).mockReturnValue({} as never)
}

/**
 * beforeEach の共通セットアップ。
 * vi.clearAllMocks → vi.restoreAllMocks → rollback → setupMocks の順で実行。
 */
export function setupBridgeTestEnv(rollbackFn: () => void, setupMocksFn: () => void): void {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  rollbackFn()
  setupMocksFn()
}
