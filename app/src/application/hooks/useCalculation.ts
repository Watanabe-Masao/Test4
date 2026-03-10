import { useCallback, useEffect, useRef, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { calculateAllStores } from '@/application/usecases/calculation'
import { calculationCache } from '../services/calculationCache'
import { validateImportedData, hasValidationErrors } from '@/application/usecases/import'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { useWorkerCalculation } from '@/application/workers'

/** 計算実行フック（データ変更時に自動計算、Web Worker対応、キャッシュ付き） */
export function useCalculation() {
  const data = useDataStore((s) => s.data)
  const storeResults = useDataStore((s) => s.storeResults)
  const isImporting = useUiStore((s) => s.isImporting)
  const isCalculated = useUiStore((s) => s.isCalculated)
  const settings = useSettingsStore((s) => s.settings)
  const { calculateAsync, isComputing, isWorkerAvailable } = useWorkerCalculation()
  const [useWorker, setUseWorker] = useState(true)

  // ref で最新の値を保持（Worker の非同期コールバックで stale にならない）
  const dataRef = useRef(data)
  const settingsRef = useRef(settings)
  useEffect(() => {
    dataRef.current = data
    settingsRef.current = settings
  })

  // 計算エポック: 非同期結果の順序逆転を防止する
  const epochRef = useRef(0)

  const canCalculate = data.classifiedSales.records.length > 0

  const daysInMonth = getDaysInMonth(settings.targetYear, settings.targetMonth)

  const calculate = useCallback(() => {
    // 呼び出し時点の値をスナップショットとして取得
    const currentData = dataRef.current
    const currentSettings = settingsRef.current
    const currentDays = getDaysInMonth(currentSettings.targetYear, currentSettings.targetMonth)

    const messages = validateImportedData(currentData)
    useDataStore.getState().setValidationMessages(messages)

    if (hasValidationErrors(messages)) {
      return false
    }

    // キャッシュチェック: 同一入力なら再計算をスキップ
    const cached = calculationCache.getGlobalResult(currentData, currentSettings, currentDays)
    if (cached) {
      useDataStore.getState().setStoreResults(cached)
      useUiStore.getState().setCalculated(true)
      return true
    }

    if (useWorker && isWorkerAvailable) {
      // Web Worker 非同期計算（フィンガープリントもWorker内で生成）
      const thisEpoch = ++epochRef.current
      const lastFp = calculationCache.currentGlobalFingerprint ?? undefined
      calculateAsync(currentData, currentSettings, currentDays, lastFp)
        .then((result) => {
          // エポックが一致しない場合は、より新しい計算が開始されているので結果を破棄
          if (epochRef.current !== thisEpoch) return

          if ('cacheHit' in result) {
            // Worker がキャッシュヒットを検出: ローカルキャッシュから取得
            const localCached = calculationCache.getGlobalResultByFingerprint(result.fingerprint)
            if (localCached) {
              useDataStore.getState().setStoreResults(localCached)
              useUiStore.getState().setCalculated(true)
            }
            return
          }

          // 新規計算結果: フィンガープリント付きでキャッシュ
          calculationCache.setGlobalResultWithFingerprint(result.fingerprint, result.results)
          useDataStore.getState().setStoreResults(result.results)
          useUiStore.getState().setCalculated(true)
        })
        .catch(() => {
          if (epochRef.current !== thisEpoch) return
          // Worker失敗時はフォールバック（スナップショット値を使用）
          const results = calculateAllStores(currentData, currentSettings, currentDays)
          calculationCache.setGlobalResult(currentData, currentSettings, currentDays, results)
          useDataStore.getState().setStoreResults(results)
          useUiStore.getState().setCalculated(true)
        })
      return true
    }

    // 同期フォールバック
    const results = calculateAllStores(currentData, currentSettings, currentDays)
    calculationCache.setGlobalResult(currentData, currentSettings, currentDays, results)
    useDataStore.getState().setStoreResults(results)
    useUiStore.getState().setCalculated(true)
    return true
  }, [useWorker, isWorkerAvailable, calculateAsync])

  // データ変更時・設定変更時に自動計算
  // settings を依存に含め、Worker 計算中に設定が変更された場合も
  // 新しい設定で再計算を起動する（エポック機構で古い結果は破棄される）
  useEffect(() => {
    if (!canCalculate || isImporting || isCalculated) return
    calculate()
  }, [canCalculate, isImporting, isCalculated, calculate, settings])

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
