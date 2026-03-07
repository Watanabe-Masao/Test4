/**
 * 曜日ギャップ分析
 *
 * 2つの月の曜日構成差から、売上への推定影響額を算出する。
 *
 * ## ロジック
 *
 * 月ごとに曜日別の日数が異なる（例: 2026年3月は月曜5日、2025年3月は月曜4日）。
 * 前年同曜日比較と前年同日比較の差は、この曜日構成の違いに起因する。
 *
 * ## 計算式
 *
 * estimatedImpact = Σ(前年の曜日i日平均売上 × 曜日iの日数差)
 *
 * 前年の曜日別日平均売上を使って重み付けすることで、
 * 売上の高い曜日（土日）と低い曜日（平日）の入れ替わりを正確に反映する。
 */

import type {
  DowDayCount,
  DowGapAnalysis,
  ActualDayImpact,
  ShiftedDay,
} from '@/domain/models/ComparisonContext'

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
 * @param dailyAverageSales 全体の日平均売上（曜日別データなし時のフォールバック）
 * @param prevDowSales 前年の曜日別合計売上（長さ7: 日〜土）。undefinedなら全体平均で代替
 */
export function analyzeDowGap(
  currentYear: number,
  currentMonth: number,
  previousYear: number,
  previousMonth: number,
  dailyAverageSales: number,
  prevDowSales?: readonly number[],
): DowGapAnalysis {
  const currentCounts = countDowsInMonth(currentYear, currentMonth)
  const previousCounts = countDowsInMonth(previousYear, previousMonth)

  // 前年の曜日別日平均売上を算出
  const prevDowDailyAvg: number[] = []
  for (let dow = 0; dow < 7; dow++) {
    if (prevDowSales && previousCounts[dow] > 0) {
      prevDowDailyAvg.push(prevDowSales[dow] / previousCounts[dow])
    } else {
      prevDowDailyAvg.push(dailyAverageSales)
    }
  }

  const dowCounts: DowDayCount[] = []
  let estimatedImpact = 0

  for (let dow = 0; dow < 7; dow++) {
    const diff = currentCounts[dow] - previousCounts[dow]
    estimatedImpact += diff * prevDowDailyAvg[dow]
    dowCounts.push({
      dow,
      label: DOW_LABELS[dow],
      currentCount: currentCounts[dow],
      previousCount: previousCounts[dow],
      diff,
    })
  }

  const isSameStructure = dowCounts.every((d) => d.diff === 0)
  const hasPrevDowSalesFlag = prevDowSales != null && prevDowSales.some((v) => v > 0)

  const missingDataWarnings: string[] = []
  if (!hasPrevDowSalesFlag) {
    missingDataWarnings.push('前年の曜日別売上データがありません（全体平均で代替しています）')
  }
  if (dailyAverageSales <= 0) {
    missingDataWarnings.push('当年の日平均売上データがありません')
  }
  if (isSameStructure) {
    missingDataWarnings.push(
      `${currentYear}年${currentMonth}月と${previousYear}年${previousMonth}月は曜日構成が同一のため、曜日ギャップは0です`,
    )
  }

  return {
    dowCounts,
    estimatedImpact,
    isValid: dailyAverageSales > 0,
    prevDowDailyAvg,
    hasPrevDowSales: hasPrevDowSalesFlag,
    isSameStructure,
    missingDataWarnings,
  }
}

/**
 * 実日法による曜日ギャップ分析
 *
 * 同日マッピング (offset=0) と同曜日マッピング (offset=N) の前年日集合を比較し、
 * マッピング境界で「加わった日」「失われた日」の実売上から影響額を算出する。
 *
 * ## 計算式
 *
 * estimatedImpact = Σ(shiftedIn の prevSales) - Σ(shiftedOut の prevSales)
 *
 * @param sameDateMapping 同日マッピングの日別データ（prevDay + prevSales）
 * @param sameDowMapping  同曜日マッピングの日別データ（prevDay + prevSales）
 * @param prevYear  前年
 * @param prevMonth 前年月
 */
export function analyzeDowGapActualDay(
  sameDateMapping: readonly { readonly prevDay: number; readonly prevSales: number }[],
  sameDowMapping: readonly { readonly prevDay: number; readonly prevSales: number }[],
  prevYear: number,
  prevMonth: number,
): ActualDayImpact {
  if (sameDateMapping.length === 0 || sameDowMapping.length === 0) {
    return ZERO_ACTUAL_DAY_IMPACT
  }

  // prevDay → prevSales のルックアップを構築
  const sameDateByDay = new Map(sameDateMapping.map((r) => [r.prevDay, r.prevSales]))
  const sameDowByDay = new Map(sameDowMapping.map((r) => [r.prevDay, r.prevSales]))

  const shiftedIn: ShiftedDay[] = []
  const shiftedOut: ShiftedDay[] = []

  // sameDow にあるが sameDate にない → DOW alignment で「加わった日」
  for (const [prevDay, prevSales] of sameDowByDay) {
    if (!sameDateByDay.has(prevDay)) {
      const dow = new Date(prevYear, prevMonth - 1, prevDay).getDay()
      shiftedIn.push({ prevDay, dow, label: DOW_LABELS[dow], prevSales })
    }
  }

  // sameDate にあるが sameDow にない → DOW alignment で「失われた日」
  for (const [prevDay, prevSales] of sameDateByDay) {
    if (!sameDowByDay.has(prevDay)) {
      const dow = new Date(prevYear, prevMonth - 1, prevDay).getDay()
      shiftedOut.push({ prevDay, dow, label: DOW_LABELS[dow], prevSales })
    }
  }

  // 日付順にソート
  shiftedIn.sort((a, b) => a.prevDay - b.prevDay)
  shiftedOut.sort((a, b) => a.prevDay - b.prevDay)

  const gainedTotal = shiftedIn.reduce((s, d) => s + d.prevSales, 0)
  const lostTotal = shiftedOut.reduce((s, d) => s + d.prevSales, 0)

  return {
    estimatedImpact: gainedTotal - lostTotal,
    shiftedIn,
    shiftedOut,
    isValid: shiftedIn.length > 0 || shiftedOut.length > 0,
  }
}

/** ゼロ値の ActualDayImpact */
export const ZERO_ACTUAL_DAY_IMPACT: ActualDayImpact = {
  estimatedImpact: 0,
  shiftedIn: [],
  shiftedOut: [],
  isValid: false,
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
  prevDowDailyAvg: [0, 0, 0, 0, 0, 0, 0],
  hasPrevDowSales: false,
  isSameStructure: true,
  missingDataWarnings: ['前年データが読み込まれていません'],
}
