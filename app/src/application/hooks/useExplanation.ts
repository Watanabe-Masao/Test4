/**
 * 指標説明フック
 *
 * StoreResult と入力データから Explanation を遅延生成する。
 * useMemo で計算結果に連動してキャッシュし、再レンダリングを最小化する。
 *
 * 計算パイプラインは変更せず、結果の「解釈」のみを担う。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useStoreSelection } from './useStoreSelection'
import type { PrevYearMonthlyKpi } from '@/application/comparison/comparisonTypes'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import {
  generateExplanations,
  generatePrevYearBudgetExplanations,
} from '@/application/usecases/explanation'
import type { StoreExplanations, MetricId, Explanation } from '@/domain/models/analysis'
import type { StoreResult, AppSettings } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'

function buildExplanations(
  currentResult: StoreResult | null,
  current: MonthlyData | null,
  settings: AppSettings,
  comparisonKpi: PrevYearMonthlyKpi,
  comparisonDowGap: DowGapAnalysis,
): StoreExplanations {
  if (!currentResult || !current) return new Map()
  const base = generateExplanations(currentResult, current, settings)

  if (comparisonKpi.hasPrevYear && currentResult.budget > 0) {
    const prevYearExplanations = generatePrevYearBudgetExplanations({
      prevYearMonthlyKpi: comparisonKpi,
      budget: currentResult.budget,
      budgetDaily: currentResult.budgetDaily,
      storeId: currentResult.storeId,
      year: settings.targetYear,
      month: settings.targetMonth,
      stores: current.stores,
      dowGap: comparisonDowGap,
      averageDailySales: currentResult.averageDailySales,
    })
    const merged = new Map(base)
    for (const [id, exp] of prevYearExplanations) {
      merged.set(id, exp)
    }
    return merged
  }

  return base
}

/**
 * 選択中の店舗に対する全指標の Explanation を返す
 *
 * StoreResult ベースの説明に加え、前年予算比較の説明もマージして返す。
 *
 * @param comparisonKpi useComparisonModule から取得した前年月間KPI
 * @param comparisonDowGap useComparisonModule から取得した曜日ギャップ分析
 */
export function useExplanations(
  comparisonKpi: PrevYearMonthlyKpi,
  comparisonDowGap: DowGapAnalysis,
): StoreExplanations {
  const settings = useSettingsStore((s) => s.settings)
  const { currentResult } = useStoreSelection()

  return useMemo(() => {
    if (!currentResult) return new Map()
    // data はスナップショットで取得（購読ではなく useMemo 内で参照）
    const current = useDataStore.getState().currentMonthData
    return buildExplanations(currentResult, current, settings, comparisonKpi, comparisonDowGap)
  }, [currentResult, settings, comparisonKpi, comparisonDowGap])
}

/**
 * 特定の指標の Explanation を返す
 */
export function useMetricExplanation(
  metricId: MetricId,
  comparisonKpi: PrevYearMonthlyKpi,
  comparisonDowGap: DowGapAnalysis,
): Explanation | undefined {
  const explanations = useExplanations(comparisonKpi, comparisonDowGap)
  return explanations.get(metricId)
}
