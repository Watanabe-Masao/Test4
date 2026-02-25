/**
 * カレンダー日付とその操作ユーティリティ
 *
 * データが「いつのデータか」を常に自分自身で知っている状態を保証するための
 * 基本型。インデックスキー、クエリパラメータ、表示ラベル全てでこの型を使う。
 *
 * ## 設計原則
 *
 * - 全ての日付は year/month/day の3要素で表現する（Dateオブジェクトは使わない）
 * - DateKey (YYYYMMDD数値) はインデックスキーとして O(1) アクセスを提供する
 * - DateRange は inclusive（from/to 両端含む）
 * - 曜日計算は必要時に算出する（保存しない）
 */

/** カレンダー日付（年月日） */
export interface CalendarDate {
  readonly year: number
  /** 月 (1-12) */
  readonly month: number
  /** 日 (1-31) */
  readonly day: number
}

/** 日付範囲（inclusive: from と to 両端を含む） */
export interface DateRange {
  readonly from: CalendarDate
  readonly to: CalendarDate
}

/**
 * 日付キー (YYYYMMDD 形式の数値)
 *
 * インデックスの Map キーとして使用する。
 * 数値型なので比較演算子で範囲判定が可能:
 *   fromKey <= dateKey && dateKey <= toKey
 */
export type DateKey = number

/**
 * CalendarDate → DateKey (YYYYMMDD) に変換する。
 *
 * @example
 * toDateKey({ year: 2026, month: 2, day: 3 }) // → 20260203
 */
export function toDateKey(date: CalendarDate): DateKey {
  return date.year * 10000 + date.month * 100 + date.day
}

/**
 * year, month, day の個別引数から DateKey を生成する。
 *
 * CategoryTimeSalesRecord のフィールドから直接生成する場合に使用。
 */
export function toDateKeyFromParts(year: number, month: number, day: number): DateKey {
  return year * 10000 + month * 100 + day
}

/**
 * DateKey → CalendarDate に逆変換する。
 *
 * @example
 * fromDateKey(20260203) // → { year: 2026, month: 2, day: 3 }
 */
export function fromDateKey(key: DateKey): CalendarDate {
  const day = key % 100
  const month = Math.floor(key / 100) % 100
  const year = Math.floor(key / 10000)
  return { year, month, day }
}

/**
 * CalendarDate の曜日を取得する (0=日, 1=月, ..., 6=土)。
 */
export function getDow(date: CalendarDate): number {
  return new Date(date.year, date.month - 1, date.day).getDay()
}

/**
 * CalendarDate を YYYY-MM-DD 形式の文字列に変換する（表示用）。
 */
export function formatCalendarDate(date: CalendarDate): string {
  const y = date.year
  const m = String(date.month).padStart(2, '0')
  const d = String(date.day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 2つの CalendarDate が同じ日かどうかを比較する。
 */
export function isSameDate(a: CalendarDate, b: CalendarDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day
}

/**
 * DateRange に含まれる日数を返す（inclusive）。
 */
export function dateRangeDays(range: DateRange): number {
  const from = new Date(range.from.year, range.from.month - 1, range.from.day)
  const to = new Date(range.to.year, range.to.month - 1, range.to.day)
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1
}

/**
 * DateRange の from/to を DateKey に変換したペアを返す。
 * range クエリの境界判定に使用。
 */
export function dateRangeToKeys(range: DateRange): { fromKey: DateKey; toKey: DateKey } {
  return {
    fromKey: toDateKey(range.from),
    toKey: toDateKey(range.to),
  }
}
