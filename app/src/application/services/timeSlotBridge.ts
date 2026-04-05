/**
 * timeSlot WASM authoritative bridge
 *
 * WASM が ready なら WASM 実装を使用し、未初期化時は TS にフォールバックする。
 * public API と import path は従来と同一。
 *
 * @see references/02-status/engine-promotion-matrix.md — authoritative
 */
import {
  findCoreTime as findCoreTimeTS,
  findTurnaroundHour as findTurnaroundHourTS,
} from '@/domain/calculations/timeSlotCalculations'

import { getTimeSlotWasmExports } from './wasmEngine'
import { findCoreTimeWasm, findTurnaroundHourWasm } from './timeSlotWasm'

// Re-export for consumer convenience
export { buildHourlyMap } from '@/domain/calculations/timeSlotCalculations'

function isWasmReady(): boolean {
  return getTimeSlotWasmExports() !== null
}

export function findCoreTime(
  hourlyMap: Map<number, number>,
): { startHour: number; endHour: number; total: number } | null {
  if (isWasmReady()) return findCoreTimeWasm(hourlyMap) ?? findCoreTimeTS(hourlyMap)
  return findCoreTimeTS(hourlyMap)
}

export function findTurnaroundHour(hourlyMap: Map<number, number>): number | null {
  if (isWasmReady()) return findTurnaroundHourWasm(hourlyMap) ?? findTurnaroundHourTS(hourlyMap)
  return findTurnaroundHourTS(hourlyMap)
}
