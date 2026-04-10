import { useCallback, useEffect, useRef, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { calculateAllStores } from '@/application/usecases/calculation'
import { calculationCache, computeCacheKey } from '../services/calculationCache'
import { validateImportData, hasValidationErrors } from '@/application/usecases/import'
import { buildCalculationFrame } from '@/domain/models/CalculationFrame'
import { useWorkerCalculation } from '@/application/workers'

/** 計算実行フック（データ変更時に自動計算、Web Worker対応、キャッシュ付き） */
export function useCalculation() {
  const dataVersion = useDataStore((s) => s.authoritativeDataVersion)
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

  const frame = buildCalculationFrame(settings)

  const calculate = useCallback(() => {
    const currentData = useDataStore.getState().currentMonthData
    if (!currentData) return false
    const currentSettings = settingsRef.current
    const currentFrame = buildCalculationFrame(currentSettings)

    const messages = validateImportData(currentData)
    useDataStore.getState().setValidationMessages(messages)

    if (hasValidationErrors(messages)) {
      return false
    }

    // cacheKey ベースの O(1) キャッシュチェック
    const cacheKey = computeCacheKey(dataVersion, currentSettings, currentFrame)
    const cached = calculationCache.getGlobalResultByCacheKey(cacheKey)
    if (cached) {
      useDataStore.getState().setStoreResults(cached)
      useUiStore.getState().setCalculated(true)
      return true
    }

    if (useWorker && isWorkerAvailable) {
      const thisEpoch = ++epochRef.current
      const lastCacheKey = calculationCache.currentGlobalCacheKey ?? undefined
      calculateAsync(currentData, dataVersion, currentSettings, currentFrame, lastCacheKey)
        .then((result) => {
          if (epochRef.current !== thisEpoch) return

          if ('cacheHit' in result) {
            const localCached = calculationCache.getGlobalResultByCacheKey(result.cacheKey)
            if (localCached) {
              useDataStore.getState().setStoreResults(localCached)
              useUiStore.getState().setCalculated(true)
            }
            return
          }

          calculationCache.setGlobalResultWithCacheKey(result.cacheKey, result.results)
          useDataStore.getState().setStoreResults(result.results)
          useUiStore.getState().setCalculated(true)
        })
        .catch((err) => {
          if (epochRef.current !== thisEpoch) return
          console.warn('[useCalculation] Worker 計算失敗、同期フォールバック:', err)
          const results = calculateAllStores(currentData, currentSettings, currentFrame)
          calculationCache.setGlobalResultWithCacheKey(cacheKey, results)
          useDataStore.getState().setStoreResults(results)
          useUiStore.getState().setCalculated(true)
        })
      return true
    }

    // 同期フォールバック
    const results = calculateAllStores(currentData, currentSettings, currentFrame)
    calculationCache.setGlobalResultWithCacheKey(cacheKey, results)
    useDataStore.getState().setStoreResults(results)
    useUiStore.getState().setCalculated(true)
    return true
  }, [dataVersion, useWorker, isWorkerAvailable, calculateAsync])

  // データ変更時・設定変更時に自動計算
  useEffect(() => {
    if (!canCalculate || isImporting || isCalculated) return
    calculate()
  }, [canCalculate, dataVersion, isImporting, isCalculated, calculate, settings])

  return {
    calculate,
    canCalculate,
    isCalculated,
    storeResults,
    daysInMonth: frame.daysInMonth,
    isComputing,
    isWorkerAvailable,
    setUseWorker,
  }
}
