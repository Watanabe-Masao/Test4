/**
 * timeSlot WASM wrapper
 *
 * Rust/WASM 実装から Float64Array / f64 を受け取り、TS 型に変換する。
 *
 * compare 対象:
 *   - findCoreTime
 *   - findTurnaroundHour
 */
import { getTimeSlotWasmExports } from './wasmEngine'

/* ── 内部ヘルパー ── */

function getTimeSlotWasm() {
  return getTimeSlotWasmExports()!
}

/** Map<number, number> を並列配列に変換する（WASM FFI 用） */
function mapToParallelArrays(hourlyMap: ReadonlyMap<number, number>): {
  hours: Float64Array
  amounts: Float64Array
} {
  const entries = [...hourlyMap.entries()].sort((a, b) => a[0] - b[0])
  const hours = new Float64Array(entries.map(([h]) => h))
  const amounts = new Float64Array(entries.map(([, a]) => a))
  return { hours, amounts }
}

/* ── WASM adapter 実装 ── */

export function findCoreTimeWasm(
  hourlyMap: ReadonlyMap<number, number>,
): { startHour: number; endHour: number; total: number } | null {
  const wasm = getTimeSlotWasm()
  const { hours, amounts } = mapToParallelArrays(hourlyMap)
  const arr = wasm.find_core_time(hours, amounts)
  // NaN sentinel → null
  if (Number.isNaN(arr[0])) return null
  return { startHour: arr[0], endHour: arr[1], total: arr[2] }
}

export function findTurnaroundHourWasm(hourlyMap: ReadonlyMap<number, number>): number | null {
  const wasm = getTimeSlotWasm()
  const { hours, amounts } = mapToParallelArrays(hourlyMap)
  const result = wasm.find_turnaround_hour(hours, amounts)
  return Number.isNaN(result) ? null : result
}
