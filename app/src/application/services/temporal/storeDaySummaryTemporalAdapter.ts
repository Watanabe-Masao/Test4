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

/**
 * store_day_summary row の temporal adapter 用最小型。
 *
 * 型変換の責務はこの adapter に閉じる。handler は adapter 経由でのみ
 * query result を DailySeriesSourceRow に変換する。
 * 将来 rolling 系 handler を増やしても、cast が handler へ戻らない。
 *
 * 変換チェーン:
 *   queryStoreDaySummary → StoreDaySummaryRow（query result 生型）
 *     → StoreDaySummaryRowForTemporal（adapter 入力型、必要フィールドの Pick）
 *       → DailySeriesSourceRow（series 構築用の正規化型）
 */
export interface StoreDaySummaryRowForTemporal {
  readonly dateKey: string
  readonly year: number
  readonly month: number
  readonly day: number
  readonly sales: number
  readonly customers: number
  readonly coreSales: number
  readonly totalQuantity: number
  readonly discountAbsolute: number
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
