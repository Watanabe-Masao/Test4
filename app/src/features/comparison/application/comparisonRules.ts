/**
 * 比較ルール — current row から requested compare dateKey を算出する純粋関数
 *
 * ## 責務
 *
 * - 暦上の requested compare dateKey を決めるだけ
 * - データ存在確認はしない（それは resolveComparisonRows の責務）
 * - previous rows の検索・index 参照は一切しない
 *
 * ## sameDayOfWeek 仕様
 *
 * 当期各日に対し、前年同日を基準日として前後7日以内から
 * 同曜日の最も近い日を比較先として一意に選ぶ。
 * 同距離の場合は未来側を優先する。
 *
 * @responsibility R:unclassified
 */
import type { CompareModeV2, MatchableRow } from './comparisonTypes'

/** YYYY-MM-DD 形式の日付キーを生成 */
function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * sameDayOfWeek 用の候補比較関数
 *
 * anchor からの距離が近い方を優先。
 * 同距離の場合は未来側（anchor + n）を優先する。
 */
function compareCandidateDates(a: Date, b: Date, anchor: Date): number {
  const da = Math.abs(a.getTime() - anchor.getTime())
  const db = Math.abs(b.getTime() - anchor.getTime())

  if (da !== db) return da - db

  // 同距離なら未来側優先
  const aFuture = a.getTime() >= anchor.getTime()
  const bFuture = b.getTime() >= anchor.getTime()

  if (aFuture !== bFuture) return aFuture ? -1 : 1

  return a.getTime() - b.getTime()
}

/**
 * sameDayOfWeek: 前年同日を anchor として ±7日から同曜日最近傍を選択
 *
 * 1. anchor = new Date(year - 1, month - 1, day)（Date 正規化に従う）
 * 2. 候補 = anchor ±7日（15日間）
 * 3. フィルタ = currentDate と同じ曜日
 * 4. ソート = anchor からの距離昇順、同距離なら未来側優先
 * 5. 先頭を採用
 */
export function resolveSameDayOfWeekDateKey(row: MatchableRow): string {
  const currentDate = new Date(row.year, row.month - 1, row.day)
  const currentDow = currentDate.getDay()

  // anchor: 前年同日（Date 正規化で 2024-02-29 → 2023-03-01 等を吸収）
  const anchorDate = new Date(row.year - 1, row.month - 1, row.day)

  const candidates: Date[] = []
  for (let diff = -7; diff <= 7; diff++) {
    const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() + diff)
    if (d.getDay() === currentDow) {
      candidates.push(d)
    }
  }

  candidates.sort((a, b) => compareCandidateDates(a, b, anchorDate))

  return formatDateKey(candidates[0])
}

/**
 * current row から requested compare dateKey を算出する
 *
 * compareMode に応じて比較先の日付を決定する。
 * データの存在確認は行わない。
 */
export function resolveRequestedCompareDateKey(row: MatchableRow, mode: CompareModeV2): string {
  switch (mode) {
    case 'sameDate': {
      const d = new Date(row.year - 1, row.month - 1, row.day)
      return formatDateKey(d)
    }

    case 'sameDayOfWeek': {
      return resolveSameDayOfWeekDateKey(row)
    }

    case 'prevMonth': {
      const d = new Date(row.year, row.month - 2, row.day)
      return formatDateKey(d)
    }
  }
}
