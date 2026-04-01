import { useCallback, useEffect, useRef, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { calculateAllStores } from '@/application/usecases/calculation'
import { calculationCache, computeCacheKey } from '../services/calculationCache'
import { validateImportedData, hasValidationErrors } from '@/application/usecases/import'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { useWorkerCalculation } from '@/application/workers'

/** 計算実行フック（データ変更時に自動計算、Web Worker対応、キャッシュ付き） */
export function useCalculation() {
  const dataVersion = useDataStore((s) => s.dataVersion)
  const canCalculate = useDataStore(
    (s) => (s.currentMonthData?.classifiedSales.records.length ?? 0) > 0,
  )
  const storeResults = useDataStore((s) => s.storeResults)
  const isImporting = useUiStore((s) => s.isImporting)
  const isCalculated = useUiStore((s) => s.isCalculated)
  const settings = useSettingsStore((s) => s.settings)
  const { calculateAsync, isComputing, isWorkerAvailable } = useWorkerCalculation()
  const [useWorker, setUseWorker] = useState(true)

  // ref で最新の値を保持（Worker の非同期コールバックで stale にならない）
  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  })

  // 計算エポック: 非同期結果の順序逆転を防止する
  const epochRef = useRef(0)

  const daysInMonth = getDaysInMonth(settings.targetYear, settings.targetMonth)

  const calculate = useCallback(() => {
    // 呼び出し時点の値をスナップショットとして取得
    const currentData = useDataStore.getState().data
    const currentSettings = settingsRef.current
    const currentDays = getDaysInMonth(currentSettings.targetYear, currentSettings.targetMonth)

    const messages = validateImportedData(currentData)
    useDataStore.getState().setValidationMessages(messages)

    if (hasValidationErrors(messages)) {
      return false
    }

    // cacheKey ベースの O(1) キャッシュチェック（dataVersion はクロージャから直接参照）
    const cacheKey = computeCacheKey(dataVersion, currentSettings, currentDays)
    const cached = calculationCache.getGlobalResultByCacheKey(cacheKey)
    if (cached) {
      useDataStore.getState().setStoreResults(cached)
      useUiStore.getState().setCalculated(true)
      return true
    }

    if (useWorker && isWorkerAvailable) {
      // Web Worker 非同期計算
      const thisEpoch = ++epochRef.current
      const lastCacheKey = calculationCache.currentGlobalCacheKey ?? undefined
      calculateAsync(currentData, dataVersion, currentSettings, currentDays, lastCacheKey)
        .then((result) => {
          // エポックが一致しない場合は、より新しい計算が開始されているので結果を破棄
          if (epochRef.current !== thisEpoch) return

          if ('cacheHit' in result) {
            // Worker がキャッシュヒットを検出: ローカルキャッシュから取得
            const localCached = calculationCache.getGlobalResultByCacheKey(result.cacheKey)
            if (localCached) {
              useDataStore.getState().setStoreResults(localCached)
              useUiStore.getState().setCalculated(true)
            }
            return
          }

          // 新規計算結果: cacheKey 付きでキャッシュ
          calculationCache.setGlobalResultWithCacheKey(result.cacheKey, result.results)
          useDataStore.getState().setStoreResults(result.results)
          useUiStore.getState().setCalculated(true)
        })
        .catch(() => {
          if (epochRef.current !== thisEpoch) return
          // Worker失敗時はフォールバック（スナップショット値を使用）
          const results = calculateAllStores(currentData, currentSettings, currentDays)
          calculationCache.setGlobalResultWithCacheKey(cacheKey, results)
          useDataStore.getState().setStoreResults(results)
          useUiStore.getState().setCalculated(true)
        })
      return true
    }

    // 同期フォールバック
    const results = calculateAllStores(currentData, currentSettings, currentDays)
    calculationCache.setGlobalResultWithCacheKey(cacheKey, results)
    useDataStore.getState().setStoreResults(results)
    useUiStore.getState().setCalculated(true)
    return true
  }, [dataVersion, useWorker, isWorkerAvailable, calculateAsync])

  // データ変更時・設定変更時に自動計算
  // dataVersion / settings を依存に含め、変更時に再計算を起動する
  useEffect(() => {
    if (!canCalculate || isImporting || isCalculated) return
    calculate()
  }, [canCalculate, dataVersion, isImporting, isCalculated, calculate, settings])

  return {
    calculate,
    canCalculate,
    isCalculated,
    storeResults,
    daysInMonth,
    isComputing,
    isWorkerAvailable,
    setUseWorker,
  }
}
