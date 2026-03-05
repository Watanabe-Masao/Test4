/**
 * useDowGapAnalysis — 曜日ギャップ分析のアプリケーション層ラッパー
 *
 * domain/calculations/dowGapAnalysis を presentation 層から直接呼ばないようにするための
 * application 層フック。
 */
import { useMemo } from 'react'
import { analyzeDowGap, ZERO_DOW_GAP_ANALYSIS } from '@/domain/calculations/dowGapAnalysis'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'

export type { DowGapAnalysis }

export function useDowGapAnalysis(
  currentYear: number,
  currentMonth: number,
  previousYear: number,
  previousMonth: number,
  dailyAverageSales: number,
  enabled = true,
): DowGapAnalysis {
  return useMemo(() => {
    if (!enabled || previousYear === 0) return ZERO_DOW_GAP_ANALYSIS
    return analyzeDowGap(currentYear, currentMonth, previousYear, previousMonth, dailyAverageSales)
  }, [currentYear, currentMonth, previousYear, previousMonth, dailyAverageSales, enabled])
}
