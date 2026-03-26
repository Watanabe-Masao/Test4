/**
 * dailySeriesMissingness — 欠損判定の純粋関数
 *
 * buildDailySeries から呼び出され、各日付の値と欠損状態を判定する。
 * 欠損の扱いを独立責務にすることで、Phase 3 以降の policy 拡張に備える。
 */
import type { CalendarDate } from '@/domain/models/CalendarDate'
import type {
  DailySeriesPoint,
  DailySeriesSourceRow,
  DailySeriesMetricKey,
} from './DailySeriesTypes'
import { toYearMonthKey } from './DailySeriesTypes'

/**
 * 単一日付の series point を解決する。
 *
 * - row あり + values[metric] が number → ok
 * - row あり + values[metric] が null/undefined → missing（sourceMonthKey は row 由来）
 * - row なし → missing（sourceMonthKey は date 由来）
 */
export function resolveDailyPoint(
  date: CalendarDate,
  dateKey: string,
  row: DailySeriesSourceRow | undefined,
  metric: DailySeriesMetricKey,
): DailySeriesPoint {
  if (row) {
    const rawValue = row.values[metric]
    if (rawValue != null && typeof rawValue === 'number') {
      return {
        date,
        dateKey,
        value: rawValue,
        sourceMonthKey: row.sourceMonthKey,
        status: 'ok',
      }
    }
    // row exists but metric value is null/undefined
    return {
      date,
      dateKey,
      value: null,
      sourceMonthKey: row.sourceMonthKey,
      status: 'missing',
    }
  }

  // no row for this date
  return {
    date,
    dateKey,
    value: null,
    sourceMonthKey: toYearMonthKey(date),
    status: 'missing',
  }
}
