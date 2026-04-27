/**
 * 曜日ギャップ分析
 *
 * 2つの月の曜日構成差から、売上・客数への推定影響額を算出する。
 *
 * ## 3つの手法
 *
 * - **mean（平均）**: 曜日別日平均 = 合計 / 日数。従来方式
 * - **median（中央値）**: 曜日別の日次値を並べ替えて中央値を採用。外れ値に強い
 * - **adjustedMean（調整平均）**: MADベースで外れ値を除外して平均。
 *   データ件数4-5の小標本では外れ値1件で平均が大きくずれるため有効
 *
 * ## 計算式
 *
 * estimatedImpact = Σ(前年の曜日i日平均 × 曜日iの日数差)
 *
 * @responsibility R:unclassified
 */

import type {
  DowDayCount,
  DowGapAnalysis,
  DowGapMethod,
  DowMethodResult,
} from '@/domain/models/ComparisonContext'
import { DAYS_PER_WEEK } from '@/domain/constants'
import { safeDivide } from './utils'
import { computeDowStatistics, pickStatValue } from './dowGapStatistics'

// re-export for backward compat
export { calcMedian, calcAdjustedMean } from './dowGapStatistics'
export { analyzeDowGapActualDay, ZERO_ACTUAL_DAY_IMPACT } from './dowGapActualDay'

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

/** 日次データから手法別結果を生成するオプション */
export interface DowGapDailyData {
  readonly salesByDow: readonly (readonly number[])[]
  readonly customersByDow: readonly (readonly number[])[]
  readonly dailyAverageCustomers: number
}

/**
 * 曜日ギャップ分析を実行する
 */
export function analyzeDowGap(
  currentYear: number,
  currentMonth: number,
  previousYear: number,
  previousMonth: number,
  dailyAverageSales: number,
  prevDowSales?: readonly number[],
  dailyData?: DowGapDailyData,
): DowGapAnalysis {
  const currentCounts = countDowsInMonth(currentYear, currentMonth)
  const previousCounts = countDowsInMonth(previousYear, previousMonth)

  const prevDowDailyAvg: number[] = []
  for (let dow = 0; dow < DAYS_PER_WEEK; dow++) {
    if (prevDowSales && previousCounts[dow] > 0) {
      prevDowDailyAvg.push(safeDivide(prevDowSales[dow], previousCounts[dow], dailyAverageSales))
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

  // 曜日別日平均客数（mean 手法 = 従来互換）
  const prevDowDailyAvgCustomers: number[] = []
  if (dailyData) {
    for (let dow = 0; dow < DAYS_PER_WEEK; dow++) {
      const custValues = dailyData.customersByDow[dow]
      if (custValues && custValues.length > 0) {
        prevDowDailyAvgCustomers.push(
          safeDivide(
            custValues.reduce((s, v) => s + v, 0),
            custValues.length,
            dailyData.dailyAverageCustomers,
          ),
        )
      } else {
        prevDowDailyAvgCustomers.push(dailyData.dailyAverageCustomers)
      }
    }
  } else {
    for (let dow = 0; dow < DAYS_PER_WEEK; dow++) {
      prevDowDailyAvgCustomers.push(0)
    }
  }

  // 手法別結果
  const result = buildMethodResults(dailyData, dowCounts)

  return {
    dowCounts,
    estimatedImpact,
    isValid: dailyAverageSales > 0,
    prevDowDailyAvg,
    prevDowDailyAvgCustomers,
    ...result,
    hasPrevDowSales: hasPrevDowSalesFlag,
    isSameStructure,
    missingDataWarnings,
  }
}

function buildMethodResults(
  dailyData: DowGapDailyData | undefined,
  dowCounts: readonly DowDayCount[],
) {
  if (!dailyData) return {}

  const dowSalesStats = Array.from({ length: DAYS_PER_WEEK }, (_, dow) =>
    computeDowStatistics(dailyData.salesByDow[dow] ?? []),
  )
  const dowCustomerStats = Array.from({ length: DAYS_PER_WEEK }, (_, dow) =>
    computeDowStatistics(dailyData.customersByDow[dow] ?? []),
  )

  const methods: DowGapMethod[] = ['mean', 'median', 'adjustedMean']
  const methodResults = {} as Record<DowGapMethod, DowMethodResult>
  for (const method of methods) {
    const dowAvgSales: number[] = []
    const dowAvgCustomers: number[] = []
    let salesImp = 0
    let custImp = 0
    for (let dow = 0; dow < DAYS_PER_WEEK; dow++) {
      const sVal = pickStatValue(dowSalesStats[dow], method)
      const cVal = pickStatValue(dowCustomerStats[dow], method)
      dowAvgSales.push(sVal)
      dowAvgCustomers.push(cVal)
      salesImp += dowCounts[dow].diff * sVal
      custImp += dowCounts[dow].diff * cVal
    }
    methodResults[method] = {
      salesImpact: salesImp,
      customerImpact: custImp,
      dowAvgSales,
      dowAvgCustomers,
    }
  }

  return { methodResults, dowSalesStats, dowCustomerStats }
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
  prevDowDailyAvgCustomers: Array(DAYS_PER_WEEK).fill(0) as number[],
  hasPrevDowSales: false,
  isSameStructure: true,
  missingDataWarnings: ['前年データが読み込まれていません'],
}
