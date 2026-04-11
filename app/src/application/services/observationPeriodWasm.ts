/**
 * observationPeriod WASM wrapper (candidate)
 *
 * Flat contract → WASM FFI → ObservationPeriod 型変換。
 * ReadonlyMap<number, DailyRecord> は adapter の責務であり、この層には来ない。
 *
 * @contractId BIZ-010
 * @semanticClass business
 * @authorityKind candidate-authoritative
 */
import type { ObservationPeriod, ObservationStatus } from '@/domain/models/ObservationPeriod'
import type { ObservationThresholds } from '@/domain/calculations/observationPeriod'
import { DEFAULT_OBSERVATION_THRESHOLDS } from '@/domain/calculations/observationPeriod'
import { getObservationPeriodWasmExports } from './wasmEngine'

/* ── Status / Warning decode ──────────────────── */

const STATUS_MAP: readonly ObservationStatus[] = ['ok', 'partial', 'invalid', 'undefined']

const WARNING_FLAGS: ReadonlyArray<{ flag: number; code: string }> = [
  { flag: 1, code: 'obs_no_sales_data' },
  { flag: 2, code: 'obs_insufficient_sales_days' },
  { flag: 4, code: 'obs_window_incomplete' },
  { flag: 8, code: 'obs_stale_sales_data' },
]

function decodeWarnings(flags: number): readonly string[] {
  return WARNING_FLAGS.filter((w) => (flags & w.flag) !== 0).map((w) => w.code)
}

/* ── Adapter: ReadonlyMap → Float64Array ───────── */

/**
 * ReadonlyMap<number, { sales: number }> を canonical flat contract に正規化する。
 *
 * TS orchestration 層の責務。Rust 側には正規化済みの flat array のみを渡す。
 * index i = day (i+1), length === daysInMonth。
 */
export function normalizeObservationPeriodInput(
  daily: ReadonlyMap<number, { readonly sales: number }>,
  daysInMonth: number,
): Float64Array {
  const arr = new Float64Array(daysInMonth)
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    arr[d - 1] = rec ? rec.sales : 0
  }
  return arr
}

/* ── WASM 呼び出し ────────────────────────────── */

function getWasm() {
  return getObservationPeriodWasmExports()!
}

export function evaluateObservationPeriodWasm(
  daily: ReadonlyMap<number, { readonly sales: number }>,
  daysInMonth: number,
  currentElapsedDays: number,
  thresholds: ObservationThresholds = DEFAULT_OBSERVATION_THRESHOLDS,
): ObservationPeriod {
  const wasm = getWasm()
  const dailySales = normalizeObservationPeriodInput(daily, daysInMonth)

  const arr = wasm.evaluate_observation_period(
    dailySales,
    daysInMonth,
    currentElapsedDays,
    thresholds.minDaysForValid,
    thresholds.minDaysForOk,
    thresholds.staleDaysThreshold,
    thresholds.minSalesDays,
  )

  return {
    lastRecordedSalesDay: arr[0],
    elapsedDays: arr[1],
    salesDays: arr[2],
    daysInMonth: arr[3],
    remainingDays: arr[4],
    status: STATUS_MAP[arr[5]] ?? 'undefined',
    warnings: decodeWarnings(arr[6]),
  }
}
