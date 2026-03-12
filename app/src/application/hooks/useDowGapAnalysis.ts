/**
 * useDowGapAnalysis — 曜日ギャップ分析のアプリケーション層ラッパー
 *
 * domain/calculations/dowGapAnalysis を presentation 層から直接呼ばないようにするための
 * application 層フック。平均法と実日法の両方を算出する。
 */
import { useMemo } from 'react'
import {
  analyzeDowGap,
  analyzeDowGapActualDay,
  ZERO_DOW_GAP_ANALYSIS,
} from '@/domain/calculations/dowGapAnalysis'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'

export type { DowGapAnalysis }

/** 日別マッピングの最小型（DayMappingRow の部分型） */
interface DayMapping {
  readonly currentDay: number
  readonly prevDay: number
  readonly prevSales: number
}

export function useDowGapAnalysis(
  currentYear: number,
  currentMonth: number,
  previousYear: number,
  previousMonth: number,
  dailyAverageSales: number,
  enabled = true,
  prevDowSales?: readonly number[],
  sameDateMapping?: readonly DayMapping[],
  sameDowMapping?: readonly DayMapping[],
): DowGapAnalysis {
  return useMemo(() => {
    if (!enabled || previousYear === 0) return ZERO_DOW_GAP_ANALYSIS
    const base = analyzeDowGap(
      currentYear,
      currentMonth,
      previousYear,
      previousMonth,
      dailyAverageSales,
      prevDowSales,
    )
    // 実日法: マッピングデータがあれば算出
    if (
      sameDateMapping &&
      sameDowMapping &&
      sameDateMapping.length > 0 &&
      sameDowMapping.length > 0
    ) {
      const actualDay = analyzeDowGapActualDay(
        sameDateMapping,
        sameDowMapping,
        previousYear,
        previousMonth,
        currentYear,
        currentMonth,
      )
      return { ...base, actualDayImpact: actualDay }
    }
    return base
  }, [
    currentYear,
    currentMonth,
    previousYear,
    previousMonth,
    dailyAverageSales,
    enabled,
    prevDowSales,
    sameDateMapping,
    sameDowMapping,
  ])
}
