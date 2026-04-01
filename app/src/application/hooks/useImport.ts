import { useCallback, useRef, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { invalidateAfterStateChange } from '@/application/services/stateInvalidation'
import { useRepository } from '../context/useRepository'
import { validateImportedData } from '@/application/usecases/import'
import type { ImportSummary } from '@/application/usecases/import'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { AppSettings, DataType } from '@/domain/models/storeTypes'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { rawFileStore } from '@/infrastructure/storage/rawFileStore'
import {
  orchestrateImport,
  resolveImportDiff,
} from '@/application/usecases/import/ImportOrchestrator'
import type {
  PendingDiffCheck,
  ImportSideEffects,
} from '@/application/usecases/import/ImportOrchestrator'

/** インポート進捗 */
export interface ImportProgress {
  readonly current: number
  readonly total: number
  readonly filename: string
}

// Re-export PendingDiffCheck for external consumers
export type { PendingDiffCheck }

/** ファイルインポートフック */
export function useImport() {
  const data = useDataStore((s) => s.data)
  const validationMessages = useDataStore((s) => s.validationMessages)
  const isImporting = useUiStore((s) => s.isImporting)
  const settings = useSettingsStore((s) => s.settings)
  const repo = useRepository()
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [pendingDiff, setPendingDiff] = useState<PendingDiffCheck | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const settingsRef = useRef<AppSettings>(settings)
  settingsRef.current = settings

  // 同時インポート防止ロック
  const importingRef = useRef(false)

  /** データ末日に基づき設定を更新する */
  const applyDataEndDay = useCallback((maxDay: number) => {
    if (maxDay <= 0) return
    const { targetYear, targetMonth } = settingsRef.current
    const dim = getDaysInMonth(targetYear, targetMonth)
    useSettingsStore.getState().updateSettings({ dataEndDay: maxDay >= dim ? null : maxDay })
    invalidateAfterStateChange()
  }, [])

  /** インポート結果を state に反映する */
  const applyImportResult = useCallback(
    (finalData: MonthlyData, maxDay: number, messages: ReturnType<typeof validateImportedData>) => {
      useDataStore.getState().setCurrentMonthData(finalData)
      invalidateAfterStateChange()
      applyDataEndDay(maxDay)
      useDataStore.getState().setValidationMessages(messages)
    },
    [applyDataEndDay],
  )

  /** 検出年月を設定に反映する */
  const applyDetectedYearMonth = useCallback((ym: { year: number; month: number } | null) => {
    if (!ym) return
    useSettingsStore.getState().updateSettings({ targetYear: ym.year, targetMonth: ym.month })
    invalidateAfterStateChange()
    settingsRef.current = { ...settingsRef.current, targetYear: ym.year, targetMonth: ym.month }
  }, [])

  const importFiles = useCallback(
    async (files: FileList | File[], overrideType?: DataType): Promise<ImportSummary> => {
      if (importingRef.current) {
        return { successCount: 0, failureCount: 0, results: [] }
      }
      importingRef.current = true
      useUiStore.getState().setImporting(true)
      setProgress(null)
      setSaveError(null)

      try {
        const effects: ImportSideEffects = {
          repo,
          saveRawFile: (year, month, dataType, file, filename, relativePath) =>
            rawFileStore
              .saveFile(year, month, dataType, file, filename, relativePath)
              .then(() => {}),
        }

        const result = await orchestrateImport(
          files,
          settingsRef.current,
          useDataStore.getState().data,
          effects,
          (current, total, filename) => setProgress({ current, total, filename }),
          overrideType,
        )

        // 検出年月の適用
        applyDetectedYearMonth(result.detectedYearMonth)

        if (result.pendingDiff) {
          setPendingDiff(result.pendingDiff)
        } else if (result.finalData && result.validationMessages) {
          applyImportResult(result.finalData, result.detectedMaxDay, result.validationMessages)
        }

        return result.summary
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'データ保存に失敗しました'
        console.error('[useImport] import failed:', e)
        setSaveError(msg)
        return { successCount: 0, failureCount: 0, results: [] }
      } finally {
        importingRef.current = false
        useUiStore.getState().setImporting(false)
        setProgress(null)
      }
    },
    [repo, applyDetectedYearMonth, applyImportResult],
  )

  /** 差分確認結果を適用する */
  const resolveDiff = useCallback(
    (action: 'overwrite' | 'keep-existing' | 'cancel') => {
      if (!pendingDiff) return

      if (action === 'cancel') {
        setPendingDiff(null)
        return
      }

      const effects: ImportSideEffects = {
        repo,
        saveRawFile: (year, month, dataType, file, filename, relativePath) =>
          rawFileStore.saveFile(year, month, dataType, file, filename, relativePath).then(() => {}),
      }

      resolveImportDiff(pendingDiff, action, settingsRef.current, effects)
        .then((result) => {
          applyImportResult(result.finalData, result.detectedMaxDay, result.validationMessages)
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : 'データ保存に失敗しました'
          console.error('[useImport] resolveDiff failed:', e)
          setSaveError(msg)
        })

      setPendingDiff(null)
    },
    [pendingDiff, repo, applyImportResult],
  )

  return {
    importFiles,
    isImporting,
    progress,
    data,
    validationMessages,
    pendingDiff,
    resolveDiff,
    saveError,
  }
}

// Re-export helpers used by external consumers
export { mergeInsertsOnly } from './useImport.helpers'
