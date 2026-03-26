/**
 * store_day_summary → DailySeriesSourceRow 変換 adapter
 *
 * MovingAverageHandler（および将来の rolling sum / trend handler）から
 * row 変換責務を分離する。handler は orchestration のみに専念できる。
 */
import type { CalendarDate } from '@/domain/models/CalendarDate'
import type { DailySeriesSourceRow } from './DailySeriesTypes'
import { toYearMonthKey } from './DailySeriesTypes'
import { resolveAllMetrics } from './temporalMetricResolvers'

/** store_day_summary row の temporal adapter 用最小型 */
export interface StoreDaySummaryRowForTemporal {
  readonly dateKey: string
  readonly year: number
  readonly month: number
  readonly day: number
  readonly sales: number
  readonly customers: number
  readonly coreSales: number
}

/**
 * store_day_summary の row を DailySeriesSourceRow に変換する。
 *
 * metric 値の解釈は temporalMetricResolvers に委譲する。
 */
export function adaptStoreDaySummaryRow(row: StoreDaySummaryRowForTemporal): DailySeriesSourceRow {
  const date: CalendarDate = { year: row.year, month: row.month, day: row.day }
  return {
    date,
    dateKey: row.dateKey,
    sourceMonthKey: toYearMonthKey(date),
    values: resolveAllMetrics(row),
  }
}
