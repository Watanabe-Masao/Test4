/**
 * WASM Engine ローダーシングルトン
 *
 * WASM モジュールの初期化・状態管理・モード切替を担当する。
 * 対応モジュール: factorDecomposition, grossProfit, budgetAnalysis, forecast, timeSlot
 *
 * 保証:
 * 1. WASM 未初期化でも UI は通常どおり動く（PROD: ts-only、DEV: dual-run-compare）
 * 2. 初期化失敗時も TS 実装へ確実にフォールバック（state → 'error' → 以降 TS 固定）
 * 3. モード切替が render 順に影響しない（bridge は同期関数）
 * 4. 初期化は UI イベントループをブロックしない（非同期）
 * 5. 再初期化は不要（一度 'ready' or 'error' に到達したら state は変わらない）
 */

export type WasmState = 'idle' | 'loading' | 'ready' | 'error'
export type WasmModuleName =
  | 'factorDecomposition'
  | 'grossProfit'
  | 'budgetAnalysis'
  | 'forecast'
  | 'timeSlot'
export type ExecutionMode = 'ts-only' | 'wasm-only' | 'dual-run-compare'

/* ── 内部状態 ─────────────────────────────────── */

// idle 以外は再初期化しない（一度 loading/ready/error に到達したら state は変わらない）
const moduleStates: Record<WasmModuleName, WasmState> = {
  factorDecomposition: 'idle',
  grossProfit: 'idle',
  budgetAnalysis: 'idle',
  forecast: 'idle',
  timeSlot: 'idle',
}
let currentMode: ExecutionMode = 'ts-only'

// WASM モジュールの export を保持
let wasmExports: typeof import('factor-decomposition-wasm') | null = null
let grossProfitWasmExports: typeof import('gross-profit-wasm') | null = null
let budgetAnalysisWasmExports: typeof import('budget-analysis-wasm') | null = null
let forecastWasmExports: typeof import('forecast-wasm') | null = null
let timeSlotWasmExports: typeof import('time-slot-wasm') | null = null

/* ── 初期化 ───────────────────────────────────── */

/**
 * WASM モジュールを非同期で初期化する。
 * 複数回呼ばれても安全（idle 以外では no-op）。
 */
export async function initFactorDecompositionWasm(): Promise<void> {
  if (moduleStates.factorDecomposition !== 'idle') return

  moduleStates.factorDecomposition = 'loading'
  try {
    const wasm = await import('factor-decomposition-wasm')
    await wasm.default()
    wasmExports = wasm
    moduleStates.factorDecomposition = 'ready'
    if (import.meta.env.DEV) {
      console.info('[wasmEngine] factorDecomposition ready — dual-run compare available')
    }
  } catch (e) {
    moduleStates.factorDecomposition = 'error'
    console.warn(
      '[wasmEngine] factorDecomposition WASM initialization failed, falling back to TS:',
      e,
    )
  }
}

/**
 * grossProfit WASM モジュールを非同期で初期化する。
 * factorDecomposition と独立して初期化可能。
 */
export async function initGrossProfitWasm(): Promise<void> {
  if (moduleStates.grossProfit !== 'idle') return

  moduleStates.grossProfit = 'loading'
  try {
    const wasm = await import('gross-profit-wasm')
    await wasm.default()
    grossProfitWasmExports = wasm
    moduleStates.grossProfit = 'ready'
    if (import.meta.env.DEV) {
      console.info('[wasmEngine] grossProfit ready — dual-run compare available')
    }
  } catch (e) {
    moduleStates.grossProfit = 'error'
    console.warn('[wasmEngine] grossProfit WASM initialization failed, falling back to TS:', e)
  }
}

/**
 * budgetAnalysis WASM モジュールを非同期で初期化する。
 */
export async function initBudgetAnalysisWasm(): Promise<void> {
  if (moduleStates.budgetAnalysis !== 'idle') return

  moduleStates.budgetAnalysis = 'loading'
  try {
    const wasm = await import('budget-analysis-wasm')
    await wasm.default()
    budgetAnalysisWasmExports = wasm
    moduleStates.budgetAnalysis = 'ready'
    if (import.meta.env.DEV) {
      console.info('[wasmEngine] budgetAnalysis ready — dual-run compare available')
    }
  } catch (e) {
    moduleStates.budgetAnalysis = 'error'
    console.warn('[wasmEngine] budgetAnalysis WASM initialization failed, falling back to TS:', e)
  }
}

/**
 * forecast WASM モジュールを非同期で初期化する。
 */
export async function initForecastWasm(): Promise<void> {
  if (moduleStates.forecast !== 'idle') return

  moduleStates.forecast = 'loading'
  try {
    const wasm = await import('forecast-wasm')
    await wasm.default()
    forecastWasmExports = wasm
    moduleStates.forecast = 'ready'
    if (import.meta.env.DEV) {
      console.info('[wasmEngine] forecast ready — dual-run compare available')
    }
  } catch (e) {
    moduleStates.forecast = 'error'
    console.warn('[wasmEngine] forecast WASM initialization failed, falling back to TS:', e)
  }
}

/**
 * timeSlot WASM モジュールを非同期で初期化する。
 */
export async function initTimeSlotWasm(): Promise<void> {
  if (moduleStates.timeSlot !== 'idle') return

  moduleStates.timeSlot = 'loading'
  try {
    const wasm = await import('time-slot-wasm')
    await wasm.default()
    timeSlotWasmExports = wasm
    moduleStates.timeSlot = 'ready'
    if (import.meta.env.DEV) {
      console.info('[wasmEngine] timeSlot ready — dual-run compare available')
    }
  } catch (e) {
    moduleStates.timeSlot = 'error'
    console.warn('[wasmEngine] timeSlot WASM initialization failed, falling back to TS:', e)
  }
}

/* ── 状態取得 ─────────────────────────────────── */

/** 個別モジュールの状態を取得する */
export function getWasmModuleState(name: WasmModuleName): WasmState {
  return moduleStates[name]
}

/** 全モジュールの状態スナップショットを取得する（UI ステータス表示用） */
export function getAllWasmStates(): Readonly<Record<WasmModuleName, WasmState>> {
  return { ...moduleStates }
}

export function getWasmExports(): typeof import('factor-decomposition-wasm') | null {
  return wasmExports
}

export function getGrossProfitWasmExports(): typeof import('gross-profit-wasm') | null {
  return grossProfitWasmExports
}

export function getBudgetAnalysisWasmExports(): typeof import('budget-analysis-wasm') | null {
  return budgetAnalysisWasmExports
}

export function getForecastWasmExports(): typeof import('forecast-wasm') | null {
  return forecastWasmExports
}

export function getTimeSlotWasmExports(): typeof import('time-slot-wasm') | null {
  return timeSlotWasmExports
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
