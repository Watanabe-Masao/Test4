/**
 * WASM モジュールの空モック
 *
 * factor-decomposition-wasm, gross-profit-wasm, budget-analysis-wasm, forecast-wasm は
 * 未ビルドの WASM モジュール。テスト時に import 解決を失敗させないための空モック。
 * wasmEngine.ts は初期化失敗時に TS 実装へフォールバックするため、
 * 空モックでも全機能が正常に動作する。
 */

// default export: WASM 初期化関数（no-op）
export default function init(): Promise<void> {
  return Promise.reject(new Error('WASM module not available in test environment'))
}
