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
import { usePrevYearMonthlyKpi } from './usePrevYearMonthlyKpi'
import { useDowGapAnalysis } from './useDowGapAnalysis'
import {
  generateExplanations,
  generatePrevYearBudgetExplanations,
} from '@/application/usecases/explanation'
import type { StoreExplanations, MetricId, Explanation } from '@/domain/models'

/**
 * 選択中の店舗に対する全指標の Explanation を返す
 *
 * StoreResult ベースの説明に加え、前年予算比較の説明もマージして返す。
 */
export function useExplanations(): StoreExplanations {
  const data = useDataStore((s) => s.data)
  const settings = useSettingsStore((s) => s.settings)
  const { currentResult } = useStoreSelection()
  const prevYearMonthlyKpi = usePrevYearMonthlyKpi()
  // 前年の曜日別合計売上を算出（前年同日の dailyMapping から）
  const prevDowSales = useMemo(() => {
    if (!prevYearMonthlyKpi.hasPrevYear) return undefined
    const srcYear = prevYearMonthlyKpi.sourceYear
    const srcMonth = prevYearMonthlyKpi.sourceMonth
    if (srcYear === 0) return undefined
    const sales = [0, 0, 0, 0, 0, 0, 0]
    for (const row of prevYearMonthlyKpi.sameDate.dailyMapping) {
      const dow = new Date(srcYear, srcMonth - 1, row.prevDay).getDay()
      sales[dow] += row.prevSales
    }
    return sales
  }, [prevYearMonthlyKpi])

  const dowGap = useDowGapAnalysis(
    settings.targetYear,
    settings.targetMonth,
    prevYearMonthlyKpi.sourceYear,
    prevYearMonthlyKpi.sourceMonth,
    currentResult?.averageDailySales ?? 0,
    prevYearMonthlyKpi.hasPrevYear,
    prevDowSales,
  )

  return useMemo(() => {
    if (!currentResult) return new Map()
    const base = generateExplanations(currentResult, data, settings)

    // 前年予算比較の Explanation をマージ
    if (prevYearMonthlyKpi.hasPrevYear && currentResult.budget > 0) {
      const prevYearExplanations = generatePrevYearBudgetExplanations({
        prevYearMonthlyKpi,
        budget: currentResult.budget,
        budgetDaily: currentResult.budgetDaily,
        storeId: currentResult.storeId,
        year: settings.targetYear,
        month: settings.targetMonth,
        stores: data.stores,
        dowGap,
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
  }, [currentResult, data, settings, prevYearMonthlyKpi, dowGap])
}

/**
 * 特定の指標の Explanation を返す
 */
export function useMetricExplanation(metricId: MetricId): Explanation | undefined {
  const explanations = useExplanations()
  return explanations.get(metricId)
}
