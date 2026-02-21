import { useCallback, useEffect, useState } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import { calculateAllStores } from '../services/CalculationOrchestrator'
import { calculationCache } from '../services/calculationCache'
import {
  validateImportedData,
  hasValidationErrors,
} from '@/application/services/FileImportService'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { useWorkerCalculation } from '@/application/workers'

/** 計算実行フック（データ変更時に自動計算、Web Worker対応、キャッシュ付き） */
export function useCalculation() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const { calculateAsync, isComputing, isWorkerAvailable } = useWorkerCalculation()
  const [useWorker, setUseWorker] = useState(true)

  const canCalculate =
    Object.keys(state.data.purchase).length > 0 &&
    Object.keys(state.data.sales).length > 0

  const daysInMonth = getDaysInMonth(state.settings.targetYear, state.settings.targetMonth)

  const calculate = useCallback(
    () => {
      const messages = validateImportedData(state.data)
      dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: messages })

      if (hasValidationErrors(messages)) {
        return false
      }

      // キャッシュチェック: 同一入力なら再計算をスキップ
      const cached = calculationCache.getGlobalResult(state.data, state.settings, daysInMonth)
      if (cached) {
        dispatch({ type: 'SET_STORE_RESULTS', payload: cached })
        return true
      }

      if (useWorker && isWorkerAvailable) {
        // Web Worker 非同期計算
        calculateAsync(state.data, state.settings, daysInMonth)
          .then((results) => {
            calculationCache.setGlobalResult(state.data, state.settings, daysInMonth, results)
            dispatch({ type: 'SET_STORE_RESULTS', payload: results })
          })
          .catch(() => {
            // Worker失敗時はフォールバック
            const results = calculateAllStores(state.data, state.settings, daysInMonth)
            calculationCache.setGlobalResult(state.data, state.settings, daysInMonth, results)
            dispatch({ type: 'SET_STORE_RESULTS', payload: results })
          })
        return true
      }

      // 同期フォールバック
      const results = calculateAllStores(state.data, state.settings, daysInMonth)
      calculationCache.setGlobalResult(state.data, state.settings, daysInMonth, results)
      dispatch({ type: 'SET_STORE_RESULTS', payload: results })
      return true
    },
    [state.data, state.settings, daysInMonth, dispatch, useWorker, isWorkerAvailable, calculateAsync],
  )

  // データ変更時に自動計算
  useEffect(() => {
    if (!canCalculate || state.ui.isImporting || state.ui.isCalculated) return
    calculate()
  }, [canCalculate, state.ui.isImporting, state.ui.isCalculated, calculate])

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
