/**
 * useChartInteractionSlice — チャート操作状態 slice
 *
 * monthlyHistory、currentCtsQuantity、chartPeriodProps を統合して返す。
 * useUnifiedWidgetContext の context slice としてチャート操作関連の依存を局所化する。
 */
import { useMemo } from 'react'
import {
  useMonthlyHistory,
  currentResultToMonthlyPoint,
  useMonthlyDataPoints,
} from '@/application/hooks/useMonthlyHistory'
import { useCtsQuantity, type CurrentCtsQuantity } from '@/application/hooks/useCtsQuantity'
import { useDualPeriodRange } from '@/presentation/components/charts/useDualPeriodRange'
import { buildChartPeriodProps, type ChartPeriodProps } from '@/presentation/hooks/dualPeriod'
import type { MonthlyDataPoint } from '@/application/hooks/useStatistics'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { DataRepository } from '@/domain/repositories/DataRepository'
import type { ComparisonPreset } from '@/domain/models/PeriodSelection'

export interface ChartInteractionSlice {
  readonly monthlyHistory: readonly MonthlyDataPoint[]
  readonly currentCtsQuantity: CurrentCtsQuantity | undefined
  readonly chartPeriodProps: ChartPeriodProps
}

export function useChartInteractionSlice(
  repo: DataRepository | null,
  targetYear: number,
  targetMonth: number,
  daysInMonth: number,
  storeCount: number,
  selectedStoreIds: ReadonlySet<string>,
  currentResult: StoreResult | null,
  activePreset: ComparisonPreset,
): ChartInteractionSlice {
  // 過去月データ（季節性分析用）
  const historicalMonths = useMonthlyHistory(repo, targetYear, targetMonth)
  const currentMonthlyPoint = useMemo(() => {
    if (!currentResult) return null
    return currentResultToMonthlyPoint(targetYear, targetMonth, currentResult, storeCount)
  }, [currentResult, targetYear, targetMonth, storeCount])
  const monthlyHistory = useMonthlyDataPoints(
    historicalMonths,
    targetYear,
    targetMonth,
    currentMonthlyPoint,
  )

  // CTS 販売点数の事前集計
  const effectiveDayForCts =
    currentResult?.elapsedDays != null && currentResult.elapsedDays > 0
      ? Math.min(currentResult.elapsedDays, daysInMonth)
      : daysInMonth
  const currentCtsQuantity = useCtsQuantity(effectiveDayForCts, selectedStoreIds)

  // 比較期間入力（ページレベル DualPeriodSlider）
  const dualPeriodRange = useDualPeriodRange(daysInMonth)
  const chartPeriodProps = useMemo(
    () => buildChartPeriodProps(dualPeriodRange, activePreset),
    [dualPeriodRange, activePreset],
  )

  return useMemo(
    () => ({
      monthlyHistory,
      currentCtsQuantity,
      chartPeriodProps,
    }),
    [monthlyHistory, currentCtsQuantity, chartPeriodProps],
  )
}
