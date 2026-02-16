import { useCallback } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import { calculateAllStores } from '../services/CalculationOrchestrator'
import {
  validateImportedData,
  hasValidationErrors,
} from '@/infrastructure/ImportService'

/** 計算実行フック */
export function useCalculation() {
  const state = useAppState()
  const dispatch = useAppDispatch()

  const calculate = useCallback(
    (daysInMonth: number) => {
      const messages = validateImportedData(state.data)
      dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: messages })

      if (hasValidationErrors(messages)) {
        return false
      }

      const results = calculateAllStores(state.data, state.settings, daysInMonth)
      dispatch({ type: 'SET_STORE_RESULTS', payload: results })
      return true
    },
    [state.data, state.settings, dispatch],
  )

  const canCalculate =
    Object.keys(state.data.purchase).length > 0 &&
    Object.keys(state.data.sales).length > 0

  return {
    calculate,
    canCalculate,
    isCalculated: state.ui.isCalculated,
    storeResults: state.storeResults,
  }
}
