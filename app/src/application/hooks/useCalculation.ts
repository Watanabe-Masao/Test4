import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import { calculateAllStores } from '@/application/usecases/calculation'
import { calculationCache } from '../services/calculationCache'
import {
  validateImportedData,
  hasValidationErrors,
} from '@/application/usecases/import'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { useWorkerCalculation } from '@/application/workers'

/** 計算実行フック（データ変更時に自動計算、Web Worker対応、キャッシュ付き） */
export function useCalculation() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const { calculateAsync, isComputing, isWorkerAvailable } = useWorkerCalculation()
  const [useWorker, setUseWorker] = useState(true)

  // ref で最新の state を保持（Worker の非同期コールバックで stale にならない）
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state })

  // 計算エポック: 非同期結果の順序逆転を防止する
  const epochRef = useRef(0)

  const canCalculate =
    Object.keys(state.data.purchase).length > 0 &&
    Object.keys(state.data.sales).length > 0

  const daysInMonth = getDaysInMonth(state.settings.targetYear, state.settings.targetMonth)

  const calculate = useCallback(
    () => {
      // 呼び出し時点の値をスナップショットとして取得
      const currentData = stateRef.current.data
      const currentSettings = stateRef.current.settings
      const currentDays = getDaysInMonth(currentSettings.targetYear, currentSettings.targetMonth)

      const messages = validateImportedData(currentData)
      dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: messages })

      if (hasValidationErrors(messages)) {
        return false
      }

      // キャッシュチェック: 同一入力なら再計算をスキップ
      const cached = calculationCache.getGlobalResult(currentData, currentSettings, currentDays)
      if (cached) {
        dispatch({ type: 'SET_STORE_RESULTS', payload: cached })
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
                dispatch({ type: 'SET_STORE_RESULTS', payload: localCached })
              }
              return
            }

            // 新規計算結果: フィンガープリント付きでキャッシュ
            calculationCache.setGlobalResultWithFingerprint(result.fingerprint, result.results)
            dispatch({ type: 'SET_STORE_RESULTS', payload: result.results })
          })
          .catch(() => {
            if (epochRef.current !== thisEpoch) return
            // Worker失敗時はフォールバック（スナップショット値を使用）
            const results = calculateAllStores(currentData, currentSettings, currentDays)
            calculationCache.setGlobalResult(currentData, currentSettings, currentDays, results)
            dispatch({ type: 'SET_STORE_RESULTS', payload: results })
          })
        return true
      }

      // 同期フォールバック
      const results = calculateAllStores(currentData, currentSettings, currentDays)
      calculationCache.setGlobalResult(currentData, currentSettings, currentDays, results)
      dispatch({ type: 'SET_STORE_RESULTS', payload: results })
      return true
    },
    [dispatch, useWorker, isWorkerAvailable, calculateAsync],
  )

  // データ変更時・設定変更時に自動計算
  // state.settings を依存に含め、Worker 計算中に設定が変更された場合も
  // 新しい設定で再計算を起動する（エポック機構で古い結果は破棄される）
  useEffect(() => {
    if (!canCalculate || state.ui.isImporting || state.ui.isCalculated) return
    calculate()
  }, [canCalculate, state.ui.isImporting, state.ui.isCalculated, calculate, state.settings])

  return {
    calculate,
    canCalculate,
    isCalculated: state.ui.isCalculated,
    storeResults: state.storeResults,
    daysInMonth,
    isComputing,
    isWorkerAvailable,
    setUseWorker,
  }
}
