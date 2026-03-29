/**
 * IntegratedSalesChart — 純粋ロジック層
 *
 * 日別点数データの集約ロジック。React 非依存。副作用なし。
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 */
import type { DateRange } from '@/domain/models/calendar'
import { alignPrevYearDay } from '@/application/services/temporal/prevYearAlignment'
import type { DailyQuantityData } from './useDailySalesData'

interface QuantityRecord {
  readonly dateKey: string
  readonly dailyQuantity: number
}

/**
 * DuckDB 由来の点数レコードを日別 Map に集約する。
 * 前年データは曜日アラインメント済みの日に配置する。
 */
export function aggregateDailyQuantity(
  curRecords: readonly QuantityRecord[] | undefined,
  prevRecords: readonly QuantityRecord[] | undefined,
  prevYearDateRange: DateRange | undefined,
  currentDateRange: DateRange,
  daysInMonth: number,
): DailyQuantityData | undefined {
  if (!curRecords) return undefined

  const current = new Map<number, number>()
  for (const r of curRecords) {
    const day = Number(r.dateKey.split('-')[2])
    current.set(day, (current.get(day) ?? 0) + r.dailyQuantity)
  }

  const prev = new Map<number, number>()
  if (prevRecords && prevYearDateRange) {
    const curFromDay = currentDateRange.from.day
    for (const r of prevRecords) {
      const targetDay = alignPrevYearDay(r.dateKey, prevYearDateRange.from, curFromDay)
      if (targetDay >= 1 && targetDay <= daysInMonth) {
        prev.set(targetDay, (prev.get(targetDay) ?? 0) + r.dailyQuantity)
      }
    }
  }

  return { current, prev }
}
