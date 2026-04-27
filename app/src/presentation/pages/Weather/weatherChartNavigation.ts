/**
 * weatherChartNavigation — 月区切り検出と連続スクロールのロジック
 *
 * 純粋関数のみ。ECharts の dataZoom パーセントから
 * 表示中心がどの月にあるかを判定する。
 *
 * @responsibility R:unclassified
 */

import type { MonthBoundaries } from '@/application/hooks/useWeatherTriple'

/**
 * dataZoom の表示範囲（パーセント）から中心月を判定する。
 *
 * @returns -1: 前月が中心、0: 当月が中心、1: 翌月が中心
 */
export function detectCenterMonth(
  startPercent: number,
  endPercent: number,
  boundaries: MonthBoundaries,
): -1 | 0 | 1 {
  const total = boundaries.prevCount + boundaries.curCount + boundaries.nextCount
  if (total === 0) return 0

  const centerPercent = (startPercent + endPercent) / 2
  const centerIdx = (centerPercent / 100) * total

  const curStart = boundaries.prevCount
  const curEnd = boundaries.prevCount + boundaries.curCount

  if (centerIdx < curStart) return -1
  if (centerIdx >= curEnd) return 1
  return 0
}

/**
 * 連続スクロール用の X 軸ラベルフォーマッター。
 *
 * dateKey ('YYYY-MM-DD') から日付を解析し、月初日には月名を表示。
 */
export function formatContinuousLabel(dateKey: string): string {
  const month = Number(dateKey.slice(5, 7))
  const day = Number(dateKey.slice(8, 10))
  const d = new Date(Number(dateKey.slice(0, 4)), month - 1, day)
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]

  if (day === 1) {
    return `{monthLabel|${month}月}\n${day}(${dow})`
  }
  return `${day}(${dow})`
}

/**
 * dataZoom の初期表示範囲（パーセント）を計算する。
 * 当月部分だけが見えるように start/end を返す。
 */
export function calcInitialZoomRange(boundaries: MonthBoundaries): {
  start: number
  end: number
} {
  const total = boundaries.prevCount + boundaries.curCount + boundaries.nextCount
  if (total === 0) return { start: 0, end: 100 }

  const start = (boundaries.prevCount / total) * 100
  const end = ((boundaries.prevCount + boundaries.curCount) / total) * 100
  return { start, end }
}
