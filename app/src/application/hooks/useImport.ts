import { useCallback, useRef } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import {
  processDroppedFiles,
  validateImportedData,
} from '@/infrastructure/ImportService'
import type { ImportSummary } from '@/infrastructure/ImportService'
import type { AppSettings, DataType, ImportedData } from '@/domain/models'

/** ファイルインポートフック */
export function useImport() {
  const state = useAppState()
  const dispatch = useAppDispatch()

  // ref で最新の値を保持し、ステール・クロージャを回避
  const dataRef = useRef<ImportedData>(state.data)
  dataRef.current = state.data

  const settingsRef = useRef<AppSettings>(state.settings)
  settingsRef.current = state.settings

  const importFiles = useCallback(
    async (files: FileList | File[], overrideType?: DataType): Promise<ImportSummary> => {
      dispatch({ type: 'SET_IMPORTING', payload: true })

      try {
        const { summary, data } = await processDroppedFiles(
          files,
          settingsRef.current,
          dataRef.current,
          undefined,
          overrideType,
        )

        if (summary.successCount > 0) {
          dispatch({ type: 'SET_IMPORTED_DATA', payload: data })
          // ref も即座に更新（連続インポートに備える）
          dataRef.current = data

          const messages = validateImportedData(data)
          dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: messages })
        }

        return summary
      } finally {
        dispatch({ type: 'SET_IMPORTING', payload: false })
      }
    },
    [dispatch],
  )

  return {
    importFiles,
    isImporting: state.ui.isImporting,
    data: state.data,
    validationMessages: state.validationMessages,
  }
}
