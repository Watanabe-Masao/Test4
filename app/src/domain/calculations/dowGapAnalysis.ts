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
import { DAYS_PER_WEEK } from '@/domain/constants'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/**
 * 指定年月の曜日別日数を算出する
 *
 * @returns 長さ7の配列 [日曜の日数, 月曜の日数, ..., 土曜の日数]
 */
export function countDowsInMonth(year: number, month: number): readonly number[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  const counts = Array(DAYS_PER_WEEK).fill(0) as number[]
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
  for (let dow = 0; dow < DAYS_PER_WEEK; dow++) {
    if (prevDowSales && previousCounts[dow] > 0) {
      prevDowDailyAvg.push(prevDowSales[dow] / previousCounts[dow])
    } else {
      prevDowDailyAvg.push(dailyAverageSales)
    }
  }

  const dowCounts: DowDayCount[] = []
  let estimatedImpact = 0

  for (let dow = 0; dow < DAYS_PER_WEEK; dow++) {
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
      `${currentYear}年${currentMonth}月と${previousYear}年${previousMonth}月は曜日構成が同一のため、平均法の影響額は0です（実日法で境界日の売上差を確認できます）`,
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
 * 同日マッピング (offset=0) と同曜日マッピング (offset=N) を **当年日 (currentDay)** で
 * 突き合わせ、同じ当年日に対して前年の対応日が異なる箇所を「境界シフト」として検出する。
 *
 * ## なぜ currentDay で比較するか
 *
 * prevDay（前年日番号）で比較すると、同曜日マッピングが月境界を跨ぐ場合に
 * 翌月の日番号が同月の日番号と衝突する（例: 2月28日→3月1日 で prevDay=1 が 2月1日と衝突）。
 * currentDay は常に当年の1ヶ月内に収まるため衝突しない。
 *
 * ## 計算式
 *
 * estimatedImpact = Σ(shiftedIn の prevSales) - Σ(shiftedOut の prevSales)
 *
 * @param sameDateMapping 同日マッピングの日別データ（currentDay + prevDay + prevSales）
 * @param sameDowMapping  同曜日マッピングの日別データ（currentDay + prevDay + prevSales）
 * @param prevYear  前年
 * @param prevMonth 前年月
 * @param currentYear  当年（shiftedIn の曜日算出用）
 * @param currentMonth 当月（shiftedIn の曜日算出用）
 */
export function analyzeDowGapActualDay(
  sameDateMapping: readonly {
    readonly currentDay: number
    readonly prevDay: number
    readonly prevMonth: number
    readonly prevYear: number
    readonly prevSales: number
  }[],
  sameDowMapping: readonly {
    readonly currentDay: number
    readonly prevDay: number
    readonly prevMonth: number
    readonly prevYear: number
    readonly prevSales: number
  }[],
  _prevYear: number,
  _prevMonth: number,
  currentYear: number,
  currentMonth: number,
): ActualDayImpact {
  if (sameDateMapping.length === 0 || sameDowMapping.length === 0) {
    return ZERO_ACTUAL_DAY_IMPACT
  }

  // 境界値計算: 全日を列挙するのではなく、
  // 2つのマッピングの前年日付の集合差分（境界日のみ）で影響額を算出する。
  //
  // sameDate の前年日付集合 A と sameDow の前年日付集合 B の差分:
  //   shiftedIn  = B \ A (DOW alignment で加わった境界日)
  //   shiftedOut = A \ B (DOW alignment で失われた境界日)

  // 前年日付をキーとして集合を構築（年月日で一意化）
  type PrevDateKey = string
  const makePrevKey = (y: number, m: number, d: number): PrevDateKey => `${y}-${m}-${d}`

  const sameDatePrevDates = new Map<
    PrevDateKey,
    { prevDay: number; prevMonth: number; prevYear: number; prevSales: number }
  >()
  for (const r of sameDateMapping) {
    sameDatePrevDates.set(makePrevKey(r.prevYear, r.prevMonth, r.prevDay), {
      prevDay: r.prevDay,
      prevMonth: r.prevMonth,
      prevYear: r.prevYear,
      prevSales: r.prevSales,
    })
  }

  const sameDowPrevDates = new Map<
    PrevDateKey,
    {
      prevDay: number
      prevMonth: number
      prevYear: number
      prevSales: number
      currentDay: number
    }
  >()
  for (const r of sameDowMapping) {
    sameDowPrevDates.set(makePrevKey(r.prevYear, r.prevMonth, r.prevDay), {
      prevDay: r.prevDay,
      prevMonth: r.prevMonth,
      prevYear: r.prevYear,
      prevSales: r.prevSales,
      currentDay: r.currentDay,
    })
  }

  const shiftedIn: ShiftedDay[] = []
  const shiftedOut: ShiftedDay[] = []

  // B \ A: sameDow にあるが sameDate にない前年日 → DOW alignment で加わった境界日
  for (const [key, entry] of sameDowPrevDates) {
    if (!sameDatePrevDates.has(key)) {
      const inDow = new Date(currentYear, currentMonth - 1, entry.currentDay).getDay()
      shiftedIn.push({
        prevDay: entry.prevDay,
        dow: inDow,
        label: DOW_LABELS[inDow],
        prevSales: entry.prevSales,
      })
    }
  }

  // A \ B: sameDate にあるが sameDow にない前年日 → DOW alignment で失われた境界日
  for (const [key, entry] of sameDatePrevDates) {
    if (!sameDowPrevDates.has(key)) {
      const outDow = new Date(entry.prevYear, entry.prevMonth - 1, entry.prevDay).getDay()
      shiftedOut.push({
        prevDay: entry.prevDay,
        dow: outDow,
        label: DOW_LABELS[outDow],
        prevSales: entry.prevSales,
      })
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
  prevDowDailyAvg: Array(DAYS_PER_WEEK).fill(0) as number[],
  hasPrevDowSales: false,
  isSameStructure: true,
  missingDataWarnings: ['前年データが読み込まれていません'],
}
