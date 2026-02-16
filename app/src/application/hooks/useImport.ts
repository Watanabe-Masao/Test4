import { useCallback } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import {
  processDroppedFiles,
  validateImportedData,
} from '@/infrastructure/ImportService'
import type { ImportSummary } from '@/infrastructure/ImportService'

/** ファイルインポートフック */
export function useImport() {
  const state = useAppState()
  const dispatch = useAppDispatch()

  const importFiles = useCallback(
    async (files: FileList | File[]): Promise<ImportSummary> => {
      dispatch({ type: 'SET_IMPORTING', payload: true })

      try {
        const { summary, data } = await processDroppedFiles(
          files,
          state.settings,
          state.data,
        )

        if (summary.successCount > 0) {
          dispatch({ type: 'SET_IMPORTED_DATA', payload: data })

          const messages = validateImportedData(data)
          dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: messages })
        }

        return summary
      } finally {
        dispatch({ type: 'SET_IMPORTING', payload: false })
      }
    },
    [state.settings, state.data, dispatch],
  )

  return {
    importFiles,
    isImporting: state.ui.isImporting,
    data: state.data,
    validationMessages: state.validationMessages,
  }
}
