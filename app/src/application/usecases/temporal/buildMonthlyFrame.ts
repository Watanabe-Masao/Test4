/**
 * buildMonthlyFrame — MonthlyContext → MonthlyFrame
 *
 * ヘッダ月次指定から MonthlyFrame を生成する。
 * 月末日算出は PeriodSelection.lastDayOfMonth と同一規則（new Date(year, month, 0).getDate()）。
 * DateRange は inclusive（from/to 両端含む）。
 *
 * @responsibility R:unclassified
 */
import type { MonthlyContext } from '@/domain/models/temporal'
import type { MonthlyFrame } from './TemporalFrameTypes'

/** 月末日を算出する（PeriodSelection.lastDayOfMonth と同一規則） */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * MonthlyContext から MonthlyFrame を生成する。
 *
 * @param ctx ヘッダ月次指定
 * @returns 月範囲の MonthlyFrame（inclusive DateRange）
 */
export function buildMonthlyFrame(ctx: MonthlyContext): MonthlyFrame {
  const lastDay = lastDayOfMonth(ctx.year, ctx.month)
  return {
    kind: 'monthly-frame',
    monthRange: {
      from: { year: ctx.year, month: ctx.month, day: 1 },
      to: { year: ctx.year, month: ctx.month, day: lastDay },
    },
    storeIds: ctx.storeIds,
    missingnessPolicy: 'strict',
  }
}
