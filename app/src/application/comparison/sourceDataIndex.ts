/**
 * SourceDataIndex — CalendarDate ベースの前年データ参照
 *
 * allAgg のリナンバリング（mergeAdjacentMonthRecords が生成する
 * 負値/31超の日番号空間）を封じ込め、消費者は CalendarDate で参照する。
 *
 * ## 設計意図
 *
 * allAgg の内部構造（リナンバリング日番号）が集計関数に漏洩していたため、
 * sourceMonthCtx の省略・誤りで月跨ぎ時に間違ったデータを引くバグが発生した。
 * この抽象で変換責務を1箇所に閉じ込め、型レベルで誤用を防ぐ。
 */
import type { CalendarDate } from '@/domain/models/CalendarDate'
import type { ClassifiedSalesDaySummary } from '@/domain/models/ClassifiedSales'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models/record'

// ── 型定義 ──

/**
 * allAgg のソース月コンテキスト。
 *
 * mergeAdjacentMonthRecords が生成するリナンバリング空間と
 * alignmentMap の実日付を対応付けるために使う。
 */
export interface SourceMonthContext {
  readonly year: number
  readonly month: number
  readonly daysInMonth: number
}

/** CalendarDate ベースの前年データ参照。allAgg のリナンバリングを封じ込める */
export interface SourceDataIndex {
  /** 分類別売上サマリーを CalendarDate で取得 */
  getSummary(storeId: string, date: CalendarDate): ClassifiedSalesDaySummary | undefined
  /** 客数（花データ）を CalendarDate で取得。月跨ぎ時は undefined */
  getFlowers(storeId: string, date: CalendarDate): SpecialSalesDayEntry | undefined
  /** インデックスに含まれる全店舗ID */
  readonly storeIds: readonly string[]
}

// ── 内部: リナンバリング変換 ──

/**
 * CalendarDate を allAgg のリナンバリング日番号に変換する。
 *
 * allAgg は mergeAdjacentMonthRecords により以下のリナンバリング済み:
 * - 当月: day そのまま (1〜daysInMonth)
 * - 翌月: daysInMonth + day (例: 28日の月なら3月1日→29)
 * - 前月: day - daysInPrevMonth (負の値)
 */
function resolveSourceDay(date: CalendarDate, ctx: SourceMonthContext): number {
  if (date.year === ctx.year && date.month === ctx.month) {
    return date.day
  }
  const nextMonth = ctx.month === 12 ? 1 : ctx.month + 1
  const nextYear = ctx.month === 12 ? ctx.year + 1 : ctx.year
  if (date.year === nextYear && date.month === nextMonth) {
    return ctx.daysInMonth + date.day
  }
  const prevMonth = ctx.month === 1 ? 12 : ctx.month - 1
  const prevYear = ctx.month === 1 ? ctx.year - 1 : ctx.year
  if (date.year === prevYear && date.month === prevMonth) {
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate()
    return date.day - daysInPrevMonth
  }
  return date.day
}

// ── ファクトリ ──

/** allAgg + flowersIndex + sourceMonthCtx から SourceDataIndex を構築 */
export function buildSourceDataIndex(
  allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>>,
  flowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined,
  ctx: SourceMonthContext,
): SourceDataIndex {
  const storeIds = Object.keys(allAgg)

  return {
    getSummary(storeId: string, date: CalendarDate) {
      const storeDays = allAgg[storeId]
      if (!storeDays) return undefined
      const day = resolveSourceDay(date, ctx)
      return storeDays[day]
    },

    getFlowers(storeId: string, date: CalendarDate) {
      if (!flowersIndex) return undefined
      // flowersIndex はリナンバリングされていないため、同月のみ正確に参照可能。
      // 月跨ぎ時は undefined を返す（データが存在しない）。
      if (date.year !== ctx.year || date.month !== ctx.month) return undefined
      return flowersIndex[storeId]?.[date.day]
    },

    storeIds,
  }
}
