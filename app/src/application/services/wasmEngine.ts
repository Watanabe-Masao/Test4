/**
 * WASM Engine ローダーシングルトン
 *
 * factorDecomposition WASM モジュールの初期化・状態管理・モード切替を担当する。
 *
 * 保証:
 * 1. WASM 未初期化でも UI は通常どおり動く（PROD: ts-only、DEV: dual-run-compare）
 * 2. 初期化失敗時も TS 実装へ確実にフォールバック（state → 'error' → 以降 TS 固定）
 * 3. モード切替が render 順に影響しない（bridge は同期関数）
 * 4. 初期化は UI イベントループをブロックしない（非同期）
 * 5. 再初期化は不要（一度 'ready' or 'error' に到達したら state は変わらない）
 */

export type WasmState = 'idle' | 'loading' | 'ready' | 'error'
export type ExecutionMode = 'ts-only' | 'wasm-only' | 'dual-run-compare'

/* ── 内部状態 ─────────────────────────────────── */

let wasmState: WasmState = 'idle'
let currentMode: ExecutionMode = 'ts-only'

// WASM モジュールの export を保持
let wasmExports: typeof import('factor-decomposition-wasm') | null = null

/* ── 初期化 ───────────────────────────────────── */

/**
 * WASM モジュールを非同期で初期化する。
 * 複数回呼ばれても安全（idle 以外では no-op）。
 */
export async function initFactorDecompositionWasm(): Promise<void> {
  if (wasmState !== 'idle') return

  wasmState = 'loading'
  try {
    const wasm = await import('factor-decomposition-wasm')
    await wasm.default()
    wasmExports = wasm
    wasmState = 'ready'
    if (import.meta.env.DEV) {
      console.info('[wasmEngine] ready — dual-run compare available')
    }
  } catch (e) {
    wasmState = 'error'
    console.warn('[wasmEngine] WASM initialization failed, falling back to TS:', e)
  }
}

/* ── 状態取得 ─────────────────────────────────── */

export function getWasmState(): WasmState {
  return wasmState
}

export function getWasmExports(): typeof import('factor-decomposition-wasm') | null {
  return wasmExports
}

/* ── モード管理 ───────────────────────────────── */

/**
 * 実行モードを取得する。
 * DEV ビルド以外では 'dual-run-compare' を 'ts-only' にフォールバックする。
 */
export function getExecutionMode(): ExecutionMode {
  if (!import.meta.env.DEV && currentMode === 'dual-run-compare') {
    return 'ts-only'
  }
  return currentMode
}

/**
 * 実行モードを設定する。
 * localStorage にも永続化する（DEV 環境での切替用）。
 */
export function setExecutionMode(mode: ExecutionMode): void {
  currentMode = mode
  try {
    localStorage.setItem('factorDecomposition.executionMode', mode)
  } catch {
    // localStorage unavailable — ignore
  }
}

/* ── 初期化時に localStorage から設定を読み込む ── */

function loadModeFromStorage(): void {
  try {
    const stored = localStorage.getItem('factorDecomposition.executionMode')
    if (stored === 'ts-only' || stored === 'wasm-only' || stored === 'dual-run-compare') {
      currentMode = stored
    } else if (import.meta.env.DEV) {
      currentMode = 'dual-run-compare'
    }
  } catch {
    // localStorage unavailable — DEV ではそれでも compare を有効化
    if (import.meta.env.DEV) {
      currentMode = 'dual-run-compare'
    }
  }
}

// モジュール読み込み時に設定を復元
loadModeFromStorage()
