/**
 * カレンダー日付とその操作ユーティリティ
 *
 * データが「いつのデータか」を常に自分自身で知っている状態を保証するための
 * 基本型。インデックスキー、クエリパラメータ、表示ラベル全てでこの型を使う。
 *
 * ## 設計原則
 *
 * - 全ての日付は year/month/day の3要素で表現する（Dateオブジェクトは使わない）
 * - DateKey ('YYYY-MM-DD' 文字列) はインデックスキーとして O(1) アクセスを提供する
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
 * 日付キー ('YYYY-MM-DD' 形式の ISO 8601 文字列)
 *
 * インデックスの Map キーとして使用する。
 * 文字列型なので Map の値比較で一致判定が可能。
 * 辞書順ソートが日付順と一致する:
 *   '2025-12-31' < '2026-01-01' < '2026-02-28'
 */
export type DateKey = string

/**
 * CalendarDate → DateKey ('YYYY-MM-DD') に変換する。
 *
 * @example
 * toDateKey({ year: 2026, month: 2, day: 3 }) // → '2026-02-03'
 */
export function toDateKey(date: CalendarDate): DateKey {
  const y = date.year
  const m = String(date.month).padStart(2, '0')
  const d = String(date.day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * year, month, day の個別引数から DateKey を生成する。
 *
 * CategoryTimeSalesRecord のフィールドから直接生成する場合に使用。
 */
export function toDateKeyFromParts(year: number, month: number, day: number): DateKey {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/**
 * DateKey → CalendarDate に逆変換する。
 *
 * @example
 * fromDateKey('2026-02-03') // → { year: 2026, month: 2, day: 3 }
 */
export function fromDateKey(key: DateKey): CalendarDate {
  const [y, m, d] = key.split('-')
  return { year: Number(y), month: Number(m), day: Number(d) }
}

/**
 * CalendarDate の曜日を取得する (0=日, 1=月, ..., 6=土)。
 */
export function getDow(date: CalendarDate): number {
  return new Date(date.year, date.month - 1, date.day).getDay()
}

/**
 * CalendarDate を JavaScript Date に変換する。
 *
 * month は 1-index なので new Date には -1 して渡す。
 * local timezone で生成される（UTC ではない）。
 *
 * @example
 * toJsDate({ year: 2026, month: 3, day: 15 }) // → Date(2026-03-15 local)
 */
export function toJsDate(date: CalendarDate): Date {
  return new Date(date.year, date.month - 1, date.day)
}

/**
 * JavaScript Date を CalendarDate に変換する。
 *
 * getMonth() は 0-index なので +1 して 1-index 化する。
 * local timezone で解釈される。
 *
 * @example
 * fromJsDate(new Date(2026, 2, 15)) // → { year: 2026, month: 3, day: 15 }
 */
export function fromJsDate(jsDate: Date): CalendarDate {
  return { year: jsDate.getFullYear(), month: jsDate.getMonth() + 1, day: jsDate.getDate() }
}

/**
 * CalendarDate の月曜始まりの週番号 (1-based) を取得する。
 *
 * 月初の曜日を基準に、月曜を週の開始日として week 番号を算出する。
 * 例: 月初が水曜なら、1〜5 日が第 1 週、6〜12 日が第 2 週、…
 *
 * @example
 * weekNumber({ year: 2026, month: 3, day: 1 }) // → 1
 */
export function weekNumber(date: CalendarDate): number {
  const firstDow = new Date(date.year, date.month - 1, 1).getDay()
  const mondayBased = firstDow === 0 ? 6 : firstDow - 1
  return Math.floor((date.day - 1 + mondayBased) / 7) + 1
}

// formatCalendarDate は toDateKey と同一出力のため統合。toDateKey を使用すること

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
 *
 * 'YYYY-MM-DD' は辞書順 === 日付順なので、
 * fromKey <= dateKey && dateKey <= toKey で範囲判定が可能。
 */
export function dateRangeToKeys(range: DateRange): { fromKey: DateKey; toKey: DateKey } {
  return {
    fromKey: toDateKey(range.from),
    toKey: toDateKey(range.to),
  }
}

// MonthDayChunk / splitDateRangeByMonth は DateRangeChunks.ts に分離
