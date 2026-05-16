/**
 * WASM Engine ローダーシングルトン
 *
 * WASM モジュールの初期化・状態管理・モード切替を担当する。
 * **Registry-driven**: `WASM_MODULES` が唯一の正本。新規モジュール追加は
 * registry に 1 record を足し、bridge / wasm wrapper が呼ぶ named wrapper
 * 2 個（init / getter）を 1 行ずつ追加するだけ。
 *
 * ## 初期化経路
 *
 * - **DEV:** `main.tsx` が `initAllWasmModules()` を非同期呼び出し。
 *   全 5 モジュールが並列で初期化される。モードは `wasm-only`（localStorage 未設定時）。
 * - **PROD:** WASM は初期化されない（`initAllWasmModules` は呼ばれない）。
 *   モードは `ts-only` 固定。Bridge は同期関数のため、WASM 未 ready なら TS fallback を返す。
 * - **E2E (Playwright):** DEV ビルドと同じ経路で WASM が初期化される。
 *   Observation テストは `window.__runObservation` 経由で WASM 直接呼び出しを検証する。
 *
 * ## Fallback ポリシー
 *
 * 各 bridge（例: `factorDecompositionBridge.ts`）は `getXxxWasmExports()` を
 * チェックし、non-null なら WASM、null なら TS 実装を使う。
 * `getExecutionMode()` が `'ts-only'` なら WASM は常にスキップされる。
 *
 * 保証:
 * 1. WASM 未初期化でも UI は通常どおり動く（PROD: ts-only、DEV: wasm-only）
 * 2. 初期化失敗時も TS 実装へ確実にフォールバック（state → 'error' → 以降 TS 固定）
 * 3. モード切替が render 順に影響しない（bridge は同期関数）
 * 4. 初期化は UI イベントループをブロックしない（非同期）
 * 5. 再初期化は不要（一度 'ready' or 'error' に到達したら state は変わらない）
 *
 * @responsibility R:unclassified
 */

export type WasmState = 'idle' | 'loading' | 'ready' | 'error'
export type ExecutionMode = 'ts-only' | 'wasm-only'

/**
 * WASM モジュールの意味分類メタデータ。
 * Phase 3 で導入。bridge 境界の意味責任を明示する。
 *
 * @see references/03-implementation/contract-definition-policy.md
 * @see references/01-foundation/semantic-classification-policy.md
 */
export interface WasmModuleMetadata {
  readonly semanticClass: 'business' | 'analytic'
  readonly bridgeKind: 'business' | 'analytics'
}

/* ── Registry (唯一の正本) ──────────────────────── */

const WASM_MODULES = {
  factorDecomposition: {
    packageName: 'factor-decomposition-wasm',
    metadata: { semanticClass: 'business', bridgeKind: 'business' },
    loader: () => import('factor-decomposition-wasm'),
  },
  grossProfit: {
    packageName: 'gross-profit-wasm',
    metadata: { semanticClass: 'business', bridgeKind: 'business' },
    loader: () => import('gross-profit-wasm'),
  },
  budgetAnalysis: {
    packageName: 'budget-analysis-wasm',
    metadata: { semanticClass: 'business', bridgeKind: 'business' },
    loader: () => import('budget-analysis-wasm'),
  },
  forecast: {
    packageName: 'forecast-wasm',
    metadata: { semanticClass: 'analytic', bridgeKind: 'analytics' },
    loader: () => import('forecast-wasm'),
  },
  timeSlot: {
    packageName: 'time-slot-wasm',
    metadata: { semanticClass: 'analytic', bridgeKind: 'analytics' },
    loader: () => import('time-slot-wasm'),
  },
} as const satisfies Readonly<
  Record<
    string,
    {
      readonly packageName: string
      readonly metadata: WasmModuleMetadata
      readonly loader: () => Promise<unknown>
    }
  >
>

export type WasmModuleName = keyof typeof WASM_MODULES
type ModuleExports<N extends WasmModuleName> = Awaited<
  ReturnType<(typeof WASM_MODULES)[N]['loader']>
>

/* ── Derived views (registry から派生) ───────────── */

export const WASM_MODULE_NAMES = Object.keys(WASM_MODULES) as readonly WasmModuleName[]

export const WASM_MODULE_METADATA = Object.fromEntries(
  WASM_MODULE_NAMES.map((name) => [name, WASM_MODULES[name].metadata]),
) as Readonly<Record<WasmModuleName, WasmModuleMetadata>>

/* ── 内部状態 (registry から自動生成) ──────────── */

const moduleStates: Record<WasmModuleName, WasmState> = Object.fromEntries(
  WASM_MODULE_NAMES.map((name) => [name, 'idle' as WasmState]),
) as Record<WasmModuleName, WasmState>

const moduleExports: Partial<Record<WasmModuleName, unknown>> = {}

let currentMode: ExecutionMode = 'ts-only'

/* ── 初期化 (generic + named wrapper) ────────────── */

/**
 * 単一 WASM モジュールを非同期で初期化する。
 * 複数回呼ばれても安全（idle 以外では no-op）。
 */
async function initWasmModule(name: WasmModuleName): Promise<void> {
  if (moduleStates[name] !== 'idle') return

  moduleStates[name] = 'loading'
  try {
    const wasm = await WASM_MODULES[name].loader()
    // wasm-bindgen が生成する WASM モジュールは default export の `init()` を持つ
    await (wasm as { default: () => Promise<unknown> }).default()
    moduleExports[name] = wasm
    moduleStates[name] = 'ready'
    if (import.meta.env.DEV) {
      console.info(`[wasmEngine] ${name} ready — WASM authoritative ready`)
    }
  } catch (e) {
    moduleStates[name] = 'error'
    console.warn(`[wasmEngine] ${name} WASM initialization failed, falling back to TS:`, e)
  }
}

// Named init wrappers — consumer API 互換。
// 新規モジュール追加時はここに 1 行追加（registry の N record と対称）。
export const initFactorDecompositionWasm = (): Promise<void> =>
  initWasmModule('factorDecomposition')
export const initGrossProfitWasm = (): Promise<void> => initWasmModule('grossProfit')
export const initBudgetAnalysisWasm = (): Promise<void> => initWasmModule('budgetAnalysis')
export const initForecastWasm = (): Promise<void> => initWasmModule('forecast')
export const initTimeSlotWasm = (): Promise<void> => initWasmModule('timeSlot')

/**
 * 全 WASM モジュールを並列初期化する。
 * main.tsx から呼び出し、モジュール一覧と初期化の不一致を防ぐ。
 */
export async function initAllWasmModules(): Promise<void> {
  await Promise.allSettled(WASM_MODULE_NAMES.map((name) => initWasmModule(name)))
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

/** Generic typed getter — module 名から型安全に exports を引く */
function getWasmModuleExports<N extends WasmModuleName>(name: N): ModuleExports<N> | null {
  return (moduleExports[name] as ModuleExports<N> | undefined) ?? null
}

// Named getter wrappers — consumer API 互換。
// 新規モジュール追加時はここに 1 行追加（registry の N record と対称）。
export const getWasmExports = (): ModuleExports<'factorDecomposition'> | null =>
  getWasmModuleExports('factorDecomposition')
export const getGrossProfitWasmExports = (): ModuleExports<'grossProfit'> | null =>
  getWasmModuleExports('grossProfit')
export const getBudgetAnalysisWasmExports = (): ModuleExports<'budgetAnalysis'> | null =>
  getWasmModuleExports('budgetAnalysis')
export const getForecastWasmExports = (): ModuleExports<'forecast'> | null =>
  getWasmModuleExports('forecast')
export const getTimeSlotWasmExports = (): ModuleExports<'timeSlot'> | null =>
  getWasmModuleExports('timeSlot')

/* ── Availability 統合 ───────────────────────── */

import type { AvailabilityState } from '@/domain/models/Availability'

/**
 * WASM エンジン全体の AvailabilityState を返す。
 *
 * - 全 ready → 'ready'
 * - 一部 error → 'degraded'
 * - 全 error → 'failed'
 * - 全 idle → 'disabled'（PROD で未初期化）
 */
export function getWasmAvailability(): AvailabilityState<Record<WasmModuleName, WasmState>> {
  const states = getAllWasmStates()
  const values = Object.values(states)

  if (values.every((s) => s === 'ready')) {
    return { status: 'ready', data: states }
  }
  if (values.every((s) => s === 'error')) {
    return { status: 'failed', data: states, reason: 'All WASM modules failed to initialize' }
  }
  if (values.some((s) => s === 'error')) {
    const failed = Object.entries(states)
      .filter(([, s]) => s === 'error')
      .map(([n]) => n)
    return { status: 'degraded', data: states, reason: `Failed modules: ${failed.join(', ')}` }
  }
  if (values.every((s) => s === 'idle')) {
    return { status: 'disabled', data: states, reason: 'WASM not initialized' }
  }
  return { status: 'degraded', data: states, reason: 'Some modules still loading' }
}

/* ── モード管理 ───────────────────────────────── */

/**
 * 実行モードを取得する。
 */
export function getExecutionMode(): ExecutionMode {
  return currentMode
}

import { loadRaw, saveRaw, STORAGE_KEYS } from '@/application/adapters/uiPersistenceAdapter'

/**
 * 実行モードを設定する。
 * localStorage にも永続化する（DEV 環境での切替用）。
 */
export function setExecutionMode(mode: ExecutionMode): void {
  currentMode = mode
  saveRaw(STORAGE_KEYS.EXECUTION_MODE, mode)
}

/* ── 初期化時に localStorage から設定を読み込む ── */

function loadModeFromStorage(): void {
  const stored = loadRaw(STORAGE_KEYS.EXECUTION_MODE)
  if (stored === 'ts-only' || stored === 'wasm-only') {
    currentMode = stored
  } else if (import.meta.env.DEV) {
    currentMode = 'wasm-only'
  }
}

// モジュール読み込み時に設定を復元
loadModeFromStorage()
