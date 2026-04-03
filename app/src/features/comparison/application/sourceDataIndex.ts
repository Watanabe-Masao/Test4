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
import type { CategoryTimeSalesRecord } from '@/domain/models/DataTypes'

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
  /** 販売点数（CTS totalQuantity）を CalendarDate で取得。データなし時は 0 */
  getCtsQuantity(storeId: string, date: CalendarDate): number
  /** インデックスに含まれる全店舗ID */
  readonly storeIds: readonly string[]
}

/** CTS レコードを storeId × day で集約したインデックス（totalQuantity 合計） */
export type CtsStoreDayIndex = Record<string, Record<number, number>>

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
  /** 花データの完全インデックス（year-month-day キー）。月跨ぎ参照用 */
  flowersFullIndex?: ReadonlyMap<string, SpecialSalesDayEntry>,
  /** CTS 数量インデックス（storeId × day → totalQuantity） */
  ctsIndex?: CtsStoreDayIndex,
  /** CTS 完全インデックス（"storeId:year-month-day" → totalQuantity）。月跨ぎ参照用 */
  ctsFullIndex?: ReadonlyMap<string, number>,
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
      // 同月なら日番号でダイレクト参照
      if (date.year === ctx.year && date.month === ctx.month) {
        return flowersIndex[storeId]?.[date.day]
      }
      // 月跨ぎ: flowersFullIndex がある場合は year-month-day キーで参照
      if (flowersFullIndex) {
        const key = `${storeId}:${date.year}-${date.month}-${date.day}`
        return flowersFullIndex.get(key)
      }
      return undefined
    },

    getCtsQuantity(storeId: string, date: CalendarDate): number {
      if (!ctsIndex) return 0
      // 同月なら日番号でダイレクト参照
      if (date.year === ctx.year && date.month === ctx.month) {
        return ctsIndex[storeId]?.[date.day] ?? 0
      }
      // 月跨ぎ: ctsFullIndex がある場合は year-month-day キーで参照
      if (ctsFullIndex) {
        const key = `${storeId}:${date.year}-${date.month}-${date.day}`
        return ctsFullIndex.get(key) ?? 0
      }
      return 0
    },

    storeIds,
  }
}

/** 花レコード配列から storeId:year-month-day キーの完全マップを構築する */
export function buildFlowersFullIndex(
  records: readonly SpecialSalesDayEntry[],
): ReadonlyMap<string, SpecialSalesDayEntry> {
  const map = new Map<string, SpecialSalesDayEntry>()
  for (const r of records) {
    map.set(`${r.storeId}:${r.year}-${r.month}-${r.day}`, r)
  }
  return map
}

/**
 * CTS レコードを storeId × day で集約する。
 * 同一 storeId・day の複数カテゴリの totalQuantity を合算する。
 */
export function indexCtsQuantityByStoreDay(
  records: readonly CategoryTimeSalesRecord[],
): CtsStoreDayIndex {
  const idx: Record<string, Record<number, number>> = {}
  for (const r of records) {
    if (!idx[r.storeId]) idx[r.storeId] = {}
    const storeDays = idx[r.storeId]
    storeDays[r.day] = (storeDays[r.day] ?? 0) + r.totalQuantity
  }
  return idx
}

/**
 * CTS レコードから storeId:year-month-day キーの完全マップを構築する。
 * 月跨ぎ参照用。同一キーの複数カテゴリの totalQuantity を合算する。
 */
export function buildCtsFullIndex(
  records: readonly CategoryTimeSalesRecord[],
): ReadonlyMap<string, number> {
  const map = new Map<string, number>()
  for (const r of records) {
    const key = `${r.storeId}:${r.year}-${r.month}-${r.day}`
    map.set(key, (map.get(key) ?? 0) + r.totalQuantity)
  }
  return map
}
