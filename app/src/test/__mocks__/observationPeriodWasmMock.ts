/**
 * observation-period-wasm 型付きモック（candidate: BIZ-010）
 */
import {
  evaluateObservationPeriod,
  DEFAULT_OBSERVATION_THRESHOLDS,
} from '@/domain/calculations/observationPeriod'

export default function init(): Promise<void> {
  return Promise.resolve()
}

const STATUS_CODE: Record<string, number> = {
  ok: 0,
  partial: 1,
  invalid: 2,
  undefined: 3,
}

const WARNING_CODE: Record<string, number> = {
  obs_no_sales_data: 1,
  obs_insufficient_sales_days: 2,
  obs_window_incomplete: 4,
  obs_stale_sales_data: 8,
}

export function evaluate_observation_period(
  dailySales: Float64Array,
  daysInMonth: number,
  currentElapsedDays: number,
  minDaysForValid: number,
  minDaysForOk: number,
  staleDaysThreshold: number,
  minSalesDays: number,
): Float64Array {
  // Float64Array → Map に戻して TS 実装に渡す
  const daily = new Map<number, { sales: number }>()
  for (let i = 0; i < dailySales.length; i++) {
    if (dailySales[i] !== 0) {
      daily.set(i + 1, { sales: dailySales[i] })
    }
  }

  const thresholds = {
    ...DEFAULT_OBSERVATION_THRESHOLDS,
    minDaysForValid,
    minDaysForOk,
    staleDaysThreshold,
    minSalesDays,
  }

  const r = evaluateObservationPeriod(daily, daysInMonth, currentElapsedDays, thresholds)

  let warningFlags = 0
  for (const w of r.warnings) {
    warningFlags |= WARNING_CODE[w] ?? 0
  }

  const arr = new Float64Array(7)
  arr[0] = r.lastRecordedSalesDay
  arr[1] = r.elapsedDays
  arr[2] = r.salesDays
  arr[3] = r.daysInMonth
  arr[4] = r.remainingDays
  arr[5] = STATUS_CODE[r.status] ?? 3
  arr[6] = warningFlags
  return arr
}
