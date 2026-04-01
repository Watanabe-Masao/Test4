/**
 * 指標説明フック
 *
 * StoreResult と入力データから Explanation を遅延生成する。
 * useMemo で計算結果に連動してキャッシュし、再レンダリングを最小化する。
 *
 * 計算パイプラインは変更せず、結果の「解釈」のみを担う。
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
    const calcData = useDataStore.getState()._calculationData
    const base = generateExplanations(currentResult, calcData, settings)

    // 前年予算比較の Explanation をマージ
    if (comparisonKpi.hasPrevYear && currentResult.budget > 0) {
      const prevYearExplanations = generatePrevYearBudgetExplanations({
        prevYearMonthlyKpi: comparisonKpi,
        budget: currentResult.budget,
        budgetDaily: currentResult.budgetDaily,
        storeId: currentResult.storeId,
        year: settings.targetYear,
        month: settings.targetMonth,
        stores: calcData.stores,
        dowGap: comparisonDowGap,
        averageDailySales: currentResult.averageDailySales,
      })
      // base は内部的に Map なのでマージ可能
      const merged = new Map(base)
      for (const [id, exp] of prevYearExplanations) {
        merged.set(id, exp)
      }
      return merged
    }

    return base
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
