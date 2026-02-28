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
import { generateExplanations } from '@/application/usecases/explanation'
import type { StoreExplanations, MetricId, Explanation } from '@/domain/models'

/**
 * 選択中の店舗に対する全指標の Explanation を返す
 */
export function useExplanations(): StoreExplanations {
  const data = useDataStore((s) => s.data)
  const settings = useSettingsStore((s) => s.settings)
  const { currentResult } = useStoreSelection()

  return useMemo(() => {
    if (!currentResult) return new Map()
    return generateExplanations(currentResult, data, settings)
  }, [currentResult, data, settings])
}

/**
 * 特定の指標の Explanation を返す
 */
export function useMetricExplanation(metricId: MetricId): Explanation | undefined {
  const explanations = useExplanations()
  return explanations.get(metricId)
}
