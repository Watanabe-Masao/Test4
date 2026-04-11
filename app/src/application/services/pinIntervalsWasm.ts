/**
 * pinIntervals WASM wrapper (candidate)
 *
 * Flat contract → WASM FFI → PinInterval[] 型変換。
 * ReadonlyMap<number, DailyRecord> は adapter の責務であり、この層には来ない。
 *
 * @contractId BIZ-011
 * @semanticClass business
 * @authorityKind candidate-authoritative
 */
import type { DailyRecord } from '@/domain/models/record'
import { getDailyTotalCost } from '@/domain/models/record'
import type { PinInterval } from '@/domain/calculations/pinIntervals'
import { getPinIntervalsWasmExports } from './wasmEngine'

const FIELDS_PER_INTERVAL = 9

/* ── Adapter: ReadonlyMap → flat arrays ───────── */

/**
 * ReadonlyMap<number, DailyRecord> を pinIntervals 用 flat contract に正規化する。
 *
 * 列指向で dailySales + dailyTotalCost を分離。
 * getDailyTotalCost の合算は TS adapter の責務（Rust 側は合算済みの値を受ける）。
 */
export function normalizePinIntervalsInput(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
): { dailySales: Float64Array; dailyTotalCost: Float64Array } {
  const dailySales = new Float64Array(daysInMonth)
  const dailyTotalCost = new Float64Array(daysInMonth)
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    if (rec) {
      dailySales[d - 1] = rec.sales
      dailyTotalCost[d - 1] = getDailyTotalCost(rec)
    }
  }
  return { dailySales, dailyTotalCost }
}

/**
 * pins: [day, closingInv][] を pinDays + pinClosingInventory に分離する。
 */
export function normalizePins(pins: [number, number][]): {
  pinDays: Int32Array
  pinClosingInventory: Float64Array
} {
  const pinDays = new Int32Array(pins.length)
  const pinClosingInventory = new Float64Array(pins.length)
  for (let i = 0; i < pins.length; i++) {
    pinDays[i] = pins[i][0]
    pinClosingInventory[i] = pins[i][1]
  }
  return { pinDays, pinClosingInventory }
}

/* ── WASM 呼び出し ────────────────────────────── */

function getWasm() {
  return getPinIntervalsWasmExports()!
}

export function calculatePinIntervalsWasm(
  daily: ReadonlyMap<number, DailyRecord>,
  openingInventory: number | null,
  pins: [number, number][],
  daysInMonth: number,
): PinInterval[] {
  if (pins.length === 0) return []

  const wasm = getWasm()
  const { dailySales, dailyTotalCost } = normalizePinIntervalsInput(daily, daysInMonth)
  const { pinDays, pinClosingInventory } = normalizePins(pins)

  const arr = wasm.calculate_pin_intervals(
    dailySales,
    dailyTotalCost,
    openingInventory ?? NaN, // contract null → FFI NaN
    pinDays,
    pinClosingInventory,
    daysInMonth,
  )

  // Unflatten: every 9 fields = 1 interval
  const intervals: PinInterval[] = []
  for (let i = 0; i < arr.length; i += FIELDS_PER_INTERVAL) {
    intervals.push({
      startDay: arr[i],
      endDay: arr[i + 1],
      openingInventory: arr[i + 2],
      closingInventory: arr[i + 3],
      totalSales: arr[i + 4],
      totalPurchaseCost: arr[i + 5],
      cogs: arr[i + 6],
      grossProfit: arr[i + 7],
      grossProfitRate: arr[i + 8],
    })
  }
  return intervals
}
