import { useCallback, useRef, useState } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import {
  processDroppedFiles,
  validateImportedData,
} from '@/application/services/FileImportService'
import type { ImportSummary } from '@/application/services/FileImportService'
import type { AppSettings, DataType, ImportedData } from '@/domain/models'

/** インポート進捗 */
export interface ImportProgress {
  readonly current: number
  readonly total: number
  readonly filename: string
}

/** ファイルインポートフック */
export function useImport() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [progress, setProgress] = useState<ImportProgress | null>(null)

  // ref で最新の値を保持し、ステール・クロージャを回避
  const dataRef = useRef<ImportedData>(state.data)
  dataRef.current = state.data

  const settingsRef = useRef<AppSettings>(state.settings)
  settingsRef.current = state.settings

  const importFiles = useCallback(
    async (files: FileList | File[], overrideType?: DataType): Promise<ImportSummary> => {
      dispatch({ type: 'SET_IMPORTING', payload: true })
      setProgress(null)

      try {
        const { summary, data, detectedYearMonth } = await processDroppedFiles(
          files,
          settingsRef.current,
          dataRef.current,
          (current, total, filename) => {
            setProgress({ current, total, filename })
          },
          overrideType,
        )

        if (summary.successCount > 0) {
          // データの日付から対象年月が検出された場合、設定を更新
          if (detectedYearMonth) {
            const updatedSettings = {
              targetYear: detectedYearMonth.year,
              targetMonth: detectedYearMonth.month,
            }
            dispatch({ type: 'UPDATE_SETTINGS', payload: updatedSettings })
            settingsRef.current = { ...settingsRef.current, ...updatedSettings }
          }

          dispatch({ type: 'SET_IMPORTED_DATA', payload: data })
          // ref も即座に更新（連続インポートに備える）
          dataRef.current = data

          const messages = validateImportedData(data)
          dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: messages })
        }

        return summary
      } finally {
        dispatch({ type: 'SET_IMPORTING', payload: false })
        setProgress(null)
      }
    },
    [dispatch],
  )

  return {
    importFiles,
    isImporting: state.ui.isImporting,
    progress,
    data: state.data,
    validationMessages: state.validationMessages,
  }
}
