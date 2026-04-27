/**
 * @responsibility R:unclassified
 */

import { parseDate } from '../fileImport/dateParser'

/**
 * overflow day ユーティリティ
 *
 * 前年データ取込時、同曜日オフセットにより月末付近の対応日が翌月にはみ出す場合に
 * 翌月先頭の数日を拡張 day 番号（例: 2月28日の翌日 → day 29）として保持するロジック。
 *
 * ClassifiedSalesProcessor / CategoryTimeSalesProcessor で共通利用される。
 */

/**
 * 対象月の日数を行データから検出する。
 * 最初に targetMonth に合致する日付を見つけ、その月の日数を返す。
 *
 * @param rows      CSV行データ
 * @param dateColIndex 日付列のインデックス
 * @param dataStartRow データ開始行
 * @param targetMonth  対象月 (1-12)
 */
export function detectDaysInTargetMonth(
  rows: readonly unknown[][],
  dateColIndex: number,
  dataStartRow: number,
  targetMonth: number,
): number {
  for (let i = dataStartRow; i < rows.length; i++) {
    const d = parseDate((rows[i] as unknown[])[dateColIndex])
    if (d && d.getMonth() + 1 === targetMonth) {
      return new Date(d.getFullYear(), targetMonth, 0).getDate()
    }
  }
  return 0
}

/**
 * 日付から day 番号を解決する（overflow day 対応）。
 *
 * - targetMonth 未指定 → date.getDate() をそのまま返す
 * - 対象月に合致 → date.getDate()
 * - 翌月先頭で overflowDays 以内 → daysInTargetMonth + date.getDate()
 * - いずれにも該当しない → null（スキップ対象）
 */
export function resolveDay(
  date: Date,
  targetMonth: number | undefined,
  daysInTargetMonth: number,
  overflowDays: number,
): number | null {
  if (targetMonth == null) return date.getDate()

  const dateMonth = date.getMonth() + 1
  if (dateMonth === targetMonth) return date.getDate()

  const nextMonth = (targetMonth % 12) + 1
  if (
    overflowDays > 0 &&
    daysInTargetMonth > 0 &&
    dateMonth === nextMonth &&
    date.getDate() <= overflowDays
  ) {
    return daysInTargetMonth + date.getDate()
  }

  return null
}
