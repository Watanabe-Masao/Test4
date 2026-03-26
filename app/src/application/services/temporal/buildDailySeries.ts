/**
 * buildDailySeries — TemporalFetchPlan + rows + metric → DailySeriesPoint[]
 *
 * requiredRange を唯一の正本とし、入力 rows の並び順や余剰行に依存しない。
 * 同一 dateKey の row が複数存在する場合は後勝ち（Map 化時の挙動）。
 *
 * Phase 2: 連続日次系列の構成のみ。計算（moving average 等）はしない。
 */
import type { CalendarDate } from '@/domain/models/CalendarDate'
import { toDateKey } from '@/domain/models/CalendarDate'
import type { TemporalFetchPlan } from '@/application/usecases/temporal/TemporalFrameTypes'
import type {
  DailySeriesPoint,
  DailySeriesSourceRow,
  DailySeriesMetricKey,
} from './DailySeriesTypes'
import { resolveDailyPoint } from './dailySeriesMissingness'

/**
 * TemporalFetchPlan と source rows から連続日次系列を構築する。
 *
 * - requiredRange の全日を 1日も欠けず出力
 * - requiredRange 外の rows は無視
 * - 出力は from→to の昇順
 *
 * @param plan Phase 1 で導出した TemporalFetchPlan
 * @param rows query 結果から変換した source rows
 * @param metric 取得するメトリックキー（values Record のキー）
 */
export function buildDailySeries(
  plan: TemporalFetchPlan,
  rows: readonly DailySeriesSourceRow[],
  metric: DailySeriesMetricKey,
): readonly DailySeriesPoint[] {
  // rows を dateKey で index 化（同一 dateKey は後勝ち）
  const rowMap = new Map<string, DailySeriesSourceRow>()
  for (const row of rows) {
    rowMap.set(row.dateKey, row)
  }

  // requiredRange を 1日ずつ列挙し、各日付で resolveDailyPoint を呼ぶ
  const result: DailySeriesPoint[] = []
  const cursor = new Date(
    plan.requiredRange.from.year,
    plan.requiredRange.from.month - 1,
    plan.requiredRange.from.day,
  )
  const end = new Date(
    plan.requiredRange.to.year,
    plan.requiredRange.to.month - 1,
    plan.requiredRange.to.day,
  )

  while (cursor <= end) {
    const date: CalendarDate = {
      year: cursor.getFullYear(),
      month: cursor.getMonth() + 1,
      day: cursor.getDate(),
    }
    const dateKeyStr = toDateKey(date)
    const row = rowMap.get(dateKeyStr)
    result.push(resolveDailyPoint(date, dateKeyStr, row, metric))
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}
