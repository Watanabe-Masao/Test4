/**
 * WASM Engine ローダーシングルトン
 *
 * WASM モジュールの初期化・状態管理・モード切替を担当する。
 * 対応モジュール: factorDecomposition, grossProfit, budgetAnalysis, forecast, timeSlot
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
 * 各 bridge（例: `factorDecompositionBridge.ts`）は `getWasmModuleState(name)` を
 * チェックし、`'ready'` なら WASM、それ以外なら TS 実装を使う。
 * `getExecutionMode()` が `'ts-only'` なら WASM は常にスキップされる。
 *
 * 保証:
 * 1. WASM 未初期化でも UI は通常どおり動く（PROD: ts-only、DEV: wasm-only）
 * 2. 初期化失敗時も TS 実装へ確実にフォールバック（state → 'error' → 以降 TS 固定）
 * 3. モード切替が render 順に影響しない（bridge は同期関数）
 * 4. 初期化は UI イベントループをブロックしない（非同期）
 * 5. 再初期化は不要（一度 'ready' or 'error' に到達したら state は変わらない）
 */

export type WasmState = 'idle' | 'loading' | 'ready' | 'error'
export const WASM_MODULE_NAMES = [
  'factorDecomposition',
  'grossProfit',
  'budgetAnalysis',
  'forecast',
  'timeSlot',
] as const

export type WasmModuleName = (typeof WASM_MODULE_NAMES)[number]
export type ExecutionMode = 'ts-only' | 'wasm-only'

/**
 * Candidate WASM モジュール名。
 * current 群（WASM_MODULE_NAMES）とは分離管理する。
 * Phase 5 で導入。candidate → current 昇格は Phase 8 の Promote Ceremony を経る。
 */
export const WASM_CANDIDATE_MODULE_NAMES = ['piValue'] as const
export type WasmCandidateModuleName = (typeof WASM_CANDIDATE_MODULE_NAMES)[number]

/**
 * WASM モジュールの意味分類メタデータ。
 * Phase 3 で導入。bridge 境界の意味責任を明示する。
 *
 * @see references/03-guides/contract-definition-policy.md
 * @see references/01-principles/semantic-classification-policy.md
 */
export interface WasmModuleMetadata {
  readonly semanticClass: 'business' | 'analytic'
  readonly bridgeKind: 'business' | 'analytics'
}

export const WASM_MODULE_METADATA: Readonly<Record<WasmModuleName, WasmModuleMetadata>> = {
  factorDecomposition: { semanticClass: 'business', bridgeKind: 'business' },
  grossProfit: { semanticClass: 'business', bridgeKind: 'business' },
  budgetAnalysis: { semanticClass: 'business', bridgeKind: 'business' },
  forecast: { semanticClass: 'analytic', bridgeKind: 'analytics' },
  timeSlot: { semanticClass: 'analytic', bridgeKind: 'analytics' },
}

/**
 * Candidate WASM モジュールのメタデータ。
 * authorityKind は candidate-authoritative（current とは異なる）。
 */
export interface WasmCandidateModuleMetadata extends WasmModuleMetadata {
  readonly authorityKind: 'candidate-authoritative'
  readonly contractId: string
}

export const WASM_CANDIDATE_MODULE_METADATA: Readonly<
  Record<WasmCandidateModuleName, WasmCandidateModuleMetadata>
> = {
  piValue: {
    semanticClass: 'business',
    bridgeKind: 'business',
    authorityKind: 'candidate-authoritative',
    contractId: 'BIZ-012',
  },
}

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

// WASM モジュールの export を保持（current 群）
let wasmExports: typeof import('factor-decomposition-wasm') | null = null
let grossProfitWasmExports: typeof import('gross-profit-wasm') | null = null
let budgetAnalysisWasmExports: typeof import('budget-analysis-wasm') | null = null
let forecastWasmExports: typeof import('forecast-wasm') | null = null
let timeSlotWasmExports: typeof import('time-slot-wasm') | null = null

// WASM モジュールの export を保持（candidate 群 — current とは分離管理）
let piValueWasmExports: typeof import('pi-value-wasm') | null = null

// candidate 群の状態管理（current とは分離）
const candidateModuleStates: Record<WasmCandidateModuleName, WasmState> = {
  piValue: 'idle',
}

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
      console.info('[wasmEngine] factorDecomposition ready — WASM authoritative ready')
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
      console.info('[wasmEngine] grossProfit ready — WASM authoritative ready')
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
      console.info('[wasmEngine] budgetAnalysis ready — WASM authoritative ready')
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
      console.info('[wasmEngine] forecast ready — WASM authoritative ready')
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
      console.info('[wasmEngine] timeSlot ready — WASM authoritative ready')
    }
  } catch (e) {
    moduleStates.timeSlot = 'error'
    console.warn('[wasmEngine] timeSlot WASM initialization failed, falling back to TS:', e)
  }
}

/* ── Candidate 初期化 ────────────────────────────── */

/**
 * piValue candidate WASM モジュールを非同期で初期化する。
 * current 群とは独立して初期化される。
 */
export async function initPiValueCandidateWasm(): Promise<void> {
  if (candidateModuleStates.piValue !== 'idle') return

  candidateModuleStates.piValue = 'loading'
  try {
    const wasm = await import('pi-value-wasm')
    await wasm.default()
    piValueWasmExports = wasm
    candidateModuleStates.piValue = 'ready'
    if (import.meta.env.DEV) {
      console.info('[wasmEngine] piValue candidate ready — WASM candidate-authoritative ready')
    }
  } catch (e) {
    candidateModuleStates.piValue = 'error'
    console.warn(
      '[wasmEngine] piValue candidate WASM initialization failed, falling back to TS:',
      e,
    )
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

/* ── Candidate export 取得 ───────────────────── */

export function getPiValueWasmExports(): typeof import('pi-value-wasm') | null {
  return piValueWasmExports
}

/** candidate モジュールの状態を取得する */
export function getCandidateModuleState(name: WasmCandidateModuleName): WasmState {
  return candidateModuleStates[name]
}

/** 全 candidate モジュールの状態スナップショットを取得する */
export function getAllCandidateWasmStates(): Readonly<Record<WasmCandidateModuleName, WasmState>> {
  return { ...candidateModuleStates }
}

/* ── 一括初期化 ──────────────────────────────── */

const initFns: Record<WasmModuleName, () => Promise<void>> = {
  factorDecomposition: initFactorDecompositionWasm,
  grossProfit: initGrossProfitWasm,
  budgetAnalysis: initBudgetAnalysisWasm,
  forecast: initForecastWasm,
  timeSlot: initTimeSlotWasm,
}

/**
 * 全 WASM モジュールを並列初期化する。
 * main.tsx から呼び出し、モジュール一覧と初期化の不一致を防ぐ。
 */
export async function initAllWasmModules(): Promise<void> {
  await Promise.allSettled(WASM_MODULE_NAMES.map((name) => initFns[name]()))
}

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
