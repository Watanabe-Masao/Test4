/**
 * 曜日ギャップ分析
 *
 * 2つの月の曜日構成差から、売上への推定影響額を算出する。
 *
 * ## ロジック
 *
 * 月ごとに曜日別の日数が異なる（例: 2026年3月は月曜5日、2025年3月は月曜4日）。
 * 前年同曜日比較と前年同日比較の差は、この曜日構成の違いに起因する。
 * 各曜日の日数差 × 当年の日平均売上 で影響額を概算する。
 *
 * ## 計算式
 *
 * estimatedImpact = Σ(曜日ごとの日数差) × 日平均売上
 *   = (当年の合計日数 - 前年の合計日数) × 日平均売上
 *
 * 曜日別の精緻な単価が無い段階では、全体の日平均を使用する。
 * 将来、曜日別売上が取れるようになれば曜日別単価に進化可能。
 */

import type { DowDayCount, DowGapAnalysis } from '@/domain/models/ComparisonContext'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/**
 * 指定年月の曜日別日数を算出する
 *
 * @returns 長さ7の配列 [日曜の日数, 月曜の日数, ..., 土曜の日数]
 */
export function countDowsInMonth(year: number, month: number): readonly number[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month - 1, day).getDay()
    counts[dow]++
  }
  return counts
}

/**
 * 曜日ギャップ分析を実行する
 *
 * @param currentYear  当年
 * @param currentMonth 当月
 * @param previousYear 前年
 * @param previousMonth 前年月
 * @param dailyAverageSales 当年の日平均売上（曜日ギャップ影響額の見積もり用）
 */
export function analyzeDowGap(
  currentYear: number,
  currentMonth: number,
  previousYear: number,
  previousMonth: number,
  dailyAverageSales: number,
): DowGapAnalysis {
  const currentCounts = countDowsInMonth(currentYear, currentMonth)
  const previousCounts = countDowsInMonth(previousYear, previousMonth)

  const dowCounts: DowDayCount[] = []
  let totalDiff = 0

  for (let dow = 0; dow < 7; dow++) {
    const diff = currentCounts[dow] - previousCounts[dow]
    totalDiff += diff
    dowCounts.push({
      dow,
      label: DOW_LABELS[dow],
      currentCount: currentCounts[dow],
      previousCount: previousCounts[dow],
      diff,
    })
  }

  // 影響額 = 合計日数差 × 日平均売上
  const estimatedImpact = totalDiff * dailyAverageSales

  return {
    dowCounts,
    estimatedImpact,
    isValid: dailyAverageSales > 0,
  }
}

/** ゼロ値の DowGapAnalysis（データ不足時のフォールバック） */
export const ZERO_DOW_GAP_ANALYSIS: DowGapAnalysis = {
  dowCounts: DOW_LABELS.map((label, dow) => ({
    dow,
    label,
    currentCount: 0,
    previousCount: 0,
    diff: 0,
  })),
  estimatedImpact: 0,
  isValid: false,
}
