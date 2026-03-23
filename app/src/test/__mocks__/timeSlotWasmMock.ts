/**
 * time-slot-wasm 型付きモック
 *
 * Rust WASM モジュールの API サーフェスを模倣する。
 * TS ドメイン関数へのパススルーで実装。
 */
import {
  findCoreTime as findCoreTimeTS,
  findTurnaroundHour as findTurnaroundHourTS,
} from '@/domain/calculations/timeSlotCalculations'

export default function init(): Promise<void> {
  return Promise.resolve()
}

/** [startHour, endHour, total] or all NaN for null */
export function find_core_time(hours: Float64Array, amounts: Float64Array): Float64Array {
  const hourlyMap = new Map<number, number>()
  for (let i = 0; i < hours.length; i++) {
    hourlyMap.set(hours[i], amounts[i])
  }
  const result = findCoreTimeTS(hourlyMap)
  if (result === null) {
    return Float64Array.from([NaN, NaN, NaN])
  }
  return Float64Array.from([result.startHour, result.endHour, result.total])
}

/** hour or NaN for null */
export function find_turnaround_hour(hours: Float64Array, amounts: Float64Array): number {
  const hourlyMap = new Map<number, number>()
  for (let i = 0; i < hours.length; i++) {
    hourlyMap.set(hours[i], amounts[i])
  }
  const result = findTurnaroundHourTS(hourlyMap)
  return result ?? NaN
}
