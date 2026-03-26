/**
 * timeSlot モード切替ディスパッチャ (Bridge)
 *
 * 既存 bridge（forecastBridge / grossProfitBridge 等）と同一パターン。
 * 3モードディスパッチ:
 *   - ts-only: TS 実装のみ
 *   - wasm-only: WASM のみ（初期化未完了時は TS フォールバック）
 *   - dual-run-compare: 両方実行→結果比較→差分ログ→TS 結果を返却
 *
 * compare 対象:
 *   - findCoreTime
 *   - findTurnaroundHour
 *
 * bridge の責務: mode dispatch, fallback, dual-run compare, logging
 * bridge に含めないもの: metrics, timings, cache, mode persistence
 */
import {
  findCoreTime as findCoreTimeTS,
  findTurnaroundHour as findTurnaroundHourTS,
} from '@/domain/calculations/timeSlotCalculations'

import { getExecutionMode, getWasmModuleState, getTimeSlotWasmExports } from './wasmEngine'
import type { WasmState, ExecutionMode } from './wasmEngine'
import { findCoreTimeWasm, findTurnaroundHourWasm } from './timeSlotWasm'
import { recordCall, recordMismatch } from './dualRunObserver'

// Re-export for consumer convenience
export { buildHourlyMap } from '@/domain/calculations/timeSlotCalculations'

/* ── dual-run 差分ログフォーマット ────────────── */

type TimeSlotFnName = 'findCoreTime' | 'findTurnaroundHour'

interface TimeSlotMismatchLog {
  readonly function: TimeSlotFnName
  readonly inputSummary: { readonly mapSize: number }
  readonly tsResult: Record<string, number | string>
  readonly wasmResult: Record<string, number | string>
  readonly diffs: Record<string, number>
  readonly maxAbsDiff: number
  readonly wasmState: WasmState
  readonly executionMode: ExecutionMode
}

/* ── 内部ヘルパー ─────────────────────────────── */

function isWasmReady(): boolean {
  return getTimeSlotWasmExports() !== null
}

/* ── compare 対象: 2 関数 ────────────────────── */

/**
 * 3連続時間帯の累計合計が最大となるウィンドウを検出する
 */
export function findCoreTime(
  hourlyMap: Map<number, number>,
): { startHour: number; endHour: number; total: number } | null {
  if (import.meta.env.DEV) recordCall('findCoreTime')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return findCoreTimeTS(hourlyMap)
  }

  if (mode === 'wasm-only') {
    return findCoreTimeWasm(hourlyMap) ?? findCoreTimeTS(hourlyMap)
  }

  // dual-run-compare
  const tsResult = findCoreTimeTS(hourlyMap)
  const wasmResult = findCoreTimeWasm(hourlyMap)

  // null vs non-null mismatch
  if ((tsResult === null) !== (wasmResult === null)) {
    console.warn('[timeSlot dual-run null mismatch] findCoreTime', {
      tsResult,
      wasmResult,
      mapSize: hourlyMap.size,
    })
    recordMismatch('findCoreTime', Infinity, 'violated', 'violated', {
      mapSize: hourlyMap.size,
    })
    return tsResult
  }

  // both null
  if (tsResult === null || wasmResult === null) return tsResult

  // both non-null — compare fields
  const diffs: Record<string, number> = {
    startHour: wasmResult.startHour - tsResult.startHour,
    endHour: wasmResult.endHour - tsResult.endHour,
    total: wasmResult.total - tsResult.total,
  }
  const maxAbsDiff = Math.max(...Object.values(diffs).map(Math.abs))

  if (maxAbsDiff > 1e-10) {
    const log: TimeSlotMismatchLog = {
      function: 'findCoreTime',
      inputSummary: { mapSize: hourlyMap.size },
      tsResult: { startHour: tsResult.startHour, endHour: tsResult.endHour, total: tsResult.total },
      wasmResult: {
        startHour: wasmResult.startHour,
        endHour: wasmResult.endHour,
        total: wasmResult.total,
      },
      diffs,
      maxAbsDiff,
      wasmState: getWasmModuleState('timeSlot'),
      executionMode: getExecutionMode(),
    }
    console.warn('[timeSlot dual-run mismatch]', log)
    recordMismatch('findCoreTime', maxAbsDiff, 'ok', 'ok', { mapSize: hourlyMap.size })
  }

  return tsResult
}

/**
 * 累積売上が50%に到達する時間帯を検出する
 */
export function findTurnaroundHour(hourlyMap: Map<number, number>): number | null {
  if (import.meta.env.DEV) recordCall('findTurnaroundHour')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return findTurnaroundHourTS(hourlyMap)
  }

  if (mode === 'wasm-only') {
    return findTurnaroundHourWasm(hourlyMap) ?? findTurnaroundHourTS(hourlyMap)
  }

  // dual-run-compare
  const tsResult = findTurnaroundHourTS(hourlyMap)
  const wasmResult = findTurnaroundHourWasm(hourlyMap)

  // null vs non-null mismatch
  if ((tsResult === null) !== (wasmResult === null)) {
    console.warn('[timeSlot dual-run null mismatch] findTurnaroundHour', {
      tsResult,
      wasmResult,
      mapSize: hourlyMap.size,
    })
    recordMismatch('findTurnaroundHour', Infinity, 'violated', 'violated', {
      mapSize: hourlyMap.size,
    })
    return tsResult
  }

  // both null
  if (tsResult === null || wasmResult === null) return tsResult

  // both non-null — compare
  const diff = Math.abs(wasmResult - tsResult)
  if (diff > 1e-10) {
    const log: TimeSlotMismatchLog = {
      function: 'findTurnaroundHour',
      inputSummary: { mapSize: hourlyMap.size },
      tsResult: { hour: tsResult },
      wasmResult: { hour: wasmResult },
      diffs: { hour: wasmResult - tsResult },
      maxAbsDiff: diff,
      wasmState: getWasmModuleState('timeSlot'),
      executionMode: getExecutionMode(),
    }
    console.warn('[timeSlot dual-run mismatch]', log)
    recordMismatch('findTurnaroundHour', diff, 'ok', 'ok', { mapSize: hourlyMap.size })
  }

  return tsResult
}
