import { useCallback, useRef, useState } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import {
  processDroppedFiles,
  validateImportedData,
} from '@/application/services/FileImportService'
import type { ImportSummary } from '@/application/services/FileImportService'
import type { AppSettings, DataType, ImportedData } from '@/domain/models'
import {
  saveImportedData,
  loadImportedData,
  isIndexedDBAvailable,
} from '@/infrastructure/storage/IndexedDBStore'
import { calculateDiff } from '@/infrastructure/storage/diffCalculator'
import type { DiffResult } from '@/infrastructure/storage/diffCalculator'
import { categoryTimeSalesRecordKey } from '@/infrastructure/dataProcessing/CategoryTimeSalesProcessor'

/** インポート進捗 */
export interface ImportProgress {
  readonly current: number
  readonly total: number
  readonly filename: string
}

/** 差分確認の保留情報 */
export interface PendingDiffCheck {
  readonly diffResult: DiffResult
  readonly incomingData: ImportedData
  readonly existingData: ImportedData
  readonly importedTypes: ReadonlySet<string>
  readonly summary: ImportSummary
}

/** ファイルインポートフック */
export function useImport() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [pendingDiff, setPendingDiff] = useState<PendingDiffCheck | null>(null)

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

          // インポートされたデータ種別を特定
          const importedTypes = new Set<string>(
            summary.results.filter((r) => r.ok && r.type).map((r) => r.type!),
          )
          // salesDiscount → sales + discount として扱う
          if (importedTypes.has('salesDiscount')) {
            importedTypes.add('sales')
            importedTypes.add('discount')
          }
          if (importedTypes.has('prevYearSalesDiscount')) {
            importedTypes.add('prevYearSales')
            importedTypes.add('prevYearDiscount')
          }

          // IndexedDB に既存データがあれば差分チェック
          if (isIndexedDBAvailable()) {
            const { targetYear, targetMonth } = settingsRef.current
            try {
              const existing = await loadImportedData(targetYear, targetMonth)
              if (existing) {
                const diff = calculateDiff(existing, data, importedTypes)
                if (diff.needsConfirmation) {
                  // 差分確認が必要 → 保留状態にして一旦state更新は保留
                  setPendingDiff({
                    diffResult: diff,
                    incomingData: data,
                    existingData: existing,
                    importedTypes,
                    summary,
                  })
                  // state にはまだ反映しない
                  return summary
                }
              }
            } catch {
              // IndexedDB エラーは無視して通常フローへ
            }
          }

          // 差分確認不要 → 通常通り state に反映 & 保存
          dispatch({ type: 'SET_IMPORTED_DATA', payload: data })
          dataRef.current = data

          const messages = validateImportedData(data, summary)
          dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: messages })

          // IndexedDB に保存
          if (isIndexedDBAvailable()) {
            const { targetYear, targetMonth } = settingsRef.current
            saveImportedData(data, targetYear, targetMonth).catch(() => {})
          }
        }

        return summary
      } finally {
        dispatch({ type: 'SET_IMPORTING', payload: false })
        setProgress(null)
      }
    },
    [dispatch],
  )

  /** 差分確認結果を適用する */
  const resolveDiff = useCallback(
    (action: 'overwrite' | 'keep-existing' | 'cancel') => {
      if (!pendingDiff) return

      const { incomingData, existingData, importedTypes, summary } = pendingDiff

      if (action === 'cancel') {
        setPendingDiff(null)
        return
      }

      let finalData: ImportedData
      if (action === 'overwrite') {
        finalData = incomingData
      } else {
        // keep-existing: 挿入のみマージ
        finalData = mergeInsertsOnly(existingData, incomingData, importedTypes)
      }

      dispatch({ type: 'SET_IMPORTED_DATA', payload: finalData })
      dataRef.current = finalData

      const messages = validateImportedData(finalData, summary)
      dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: messages })

      // IndexedDB に保存
      if (isIndexedDBAvailable()) {
        const { targetYear, targetMonth } = settingsRef.current
        saveImportedData(finalData, targetYear, targetMonth).catch(() => {})
      }

      setPendingDiff(null)
    },
    [pendingDiff, dispatch],
  )

  return {
    importFiles,
    isImporting: state.ui.isImporting,
    progress,
    data: state.data,
    validationMessages: state.validationMessages,
    pendingDiff,
    resolveDiff,
  }
}

// ─── 挿入のみマージ ─────────────────────────────────────

/**
 * 既存データに新規挿入分のみをマージして返す。
 * 既存に値がある場合は変更しない。
 */
export function mergeInsertsOnly(
  existing: ImportedData,
  incoming: ImportedData,
  importedTypes: ReadonlySet<string>,
): ImportedData {
  const result = { ...existing }
  const storeDayFields: readonly { field: keyof ImportedData; type: string }[] = [
    { field: 'purchase', type: 'purchase' },
    { field: 'sales', type: 'sales' },
    { field: 'discount', type: 'discount' },
    { field: 'prevYearSales', type: 'prevYearSales' },
    { field: 'prevYearDiscount', type: 'prevYearDiscount' },
    { field: 'interStoreIn', type: 'interStoreIn' },
    { field: 'interStoreOut', type: 'interStoreOut' },
    { field: 'flowers', type: 'flowers' },
    { field: 'directProduce', type: 'directProduce' },
    { field: 'consumables', type: 'consumables' },
  ]

  for (const { field, type } of storeDayFields) {
    if (!importedTypes.has(type)) continue

    const existingRecord = existing[field] as Record<string, Record<number, unknown>>
    const incomingRecord = incoming[field] as Record<string, Record<number, unknown>>

    if (Object.keys(existingRecord).length === 0) {
      ;(result as Record<string, unknown>)[field] = incomingRecord
      continue
    }

    if (Object.keys(incomingRecord).length === 0) continue

    const merged: Record<string, Record<number, unknown>> = { ...existingRecord }
    for (const [storeId, incomingDays] of Object.entries(incomingRecord)) {
      if (!merged[storeId]) {
        merged[storeId] = incomingDays
      } else {
        const mergedDays = { ...merged[storeId] }
        for (const [dayStr, entry] of Object.entries(incomingDays)) {
          const day = Number(dayStr)
          if (!mergedDays[day]) {
            mergedDays[day] = entry
          }
        }
        merged[storeId] = mergedDays
      }
    }
    ;(result as Record<string, unknown>)[field] = merged
  }

  // categoryTimeSales: フラット配列形式のため個別処理
  if (importedTypes.has('categoryTimeSales')) {
    const existingCTS = existing.categoryTimeSales
    const incomingCTS = incoming.categoryTimeSales

    if (existingCTS.records.length === 0) {
      ;(result as Record<string, unknown>).categoryTimeSales = incomingCTS
    } else if (incomingCTS.records.length > 0) {
      // 既存にないレコードのみ追加（keep-existing）
      const existingKeys = new Set(existingCTS.records.map(categoryTimeSalesRecordKey))
      const newRecords = incomingCTS.records.filter(
        (r) => !existingKeys.has(categoryTimeSalesRecordKey(r)),
      )
      ;(result as Record<string, unknown>).categoryTimeSales = {
        records: [...existingCTS.records, ...newRecords],
      }
    }
  }

  // stores, suppliers は新規追加のみ
  const mergedStores = new Map(existing.stores)
  for (const [k, v] of incoming.stores) {
    if (!mergedStores.has(k)) mergedStores.set(k, v)
  }
  ;(result as Record<string, unknown>).stores = mergedStores

  const mergedSuppliers = new Map(existing.suppliers)
  for (const [k, v] of incoming.suppliers) {
    if (!mergedSuppliers.has(k)) mergedSuppliers.set(k, v)
  }
  ;(result as Record<string, unknown>).suppliers = mergedSuppliers

  return result as ImportedData
}
