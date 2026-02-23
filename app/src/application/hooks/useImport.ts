import { useCallback, useRef, useState } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import { useRepository } from '../context/RepositoryContext'
import {
  processDroppedFiles,
  validateImportedData,
} from '@/application/services/FileImportService'
import type { ImportSummary } from '@/application/services/FileImportService'
import type { AppSettings, DataType, ImportedData, DiffResult, CategoryTimeSalesData, DepartmentKpiData } from '@/domain/models'
import { categoryTimeSalesRecordKey, createEmptyImportedData } from '@/domain/models'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { calculateDiff } from '@/infrastructure/storage/diffCalculator'

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
  const repo = useRepository()
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [pendingDiff, setPendingDiff] = useState<PendingDiffCheck | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ref で最新の値を保持し、ステール・クロージャを回避
  const dataRef = useRef<ImportedData>(state.data)
  dataRef.current = state.data

  const settingsRef = useRef<AppSettings>(state.settings)
  settingsRef.current = state.settings

  // 同時インポート防止ロック
  const importingRef = useRef(false)

  /** インポート後にデータ末日スライダーを自動調整する */
  const autoSetDataEndDay = useCallback(
    (data: ImportedData) => {
      const maxDay = detectDataMaxDay(data)
      if (maxDay <= 0) return
      const { targetYear, targetMonth } = settingsRef.current
      const dim = getDaysInMonth(targetYear, targetMonth)
      // データが月末まである場合は null（全日）、それ以外は検出末日を設定
      dispatch({ type: 'UPDATE_SETTINGS', payload: { dataEndDay: maxDay >= dim ? null : maxDay } })
    },
    [dispatch],
  )

  /**
   * 前年データを実際の年月に通常データタイプとして保存する。
   * prevYearDiscount → discount, prevYearSales → sales,
   * prevYearCategoryTimeSales → categoryTimeSales として保存。
   */
  const savePrevYearData = useCallback(
    async (
      data: ImportedData,
      yearMonth: { year: number; month: number },
      hasSalesDiscount: boolean,
      hasCTS: boolean,
    ): Promise<void> => {
      const { year, month } = yearMonth
      // 前年データを通常データとして一時的な ImportedData を構築
      const prevData: ImportedData = {
        ...createEmptyImportedData(),
        sales: hasSalesDiscount ? data.prevYearSales : {},
        discount: hasSalesDiscount ? data.prevYearDiscount : {},
        categoryTimeSales: hasCTS ? data.prevYearCategoryTimeSales : { records: [] },
        // stores/suppliers は現在のデータから引き継ぐ（店舗情報は共通）
        stores: data.stores,
        suppliers: data.suppliers,
      }
      const dataTypes: DataType[] = []
      if (hasSalesDiscount) {
        dataTypes.push('sales', 'discount')
      }
      if (hasCTS) {
        dataTypes.push('categoryTimeSales')
      }
      if (dataTypes.length > 0) {
        await repo.saveDataSlice(prevData, year, month, dataTypes)
      }
    },
    [repo],
  )

  const importFiles = useCallback(
    async (files: FileList | File[], overrideType?: DataType): Promise<ImportSummary> => {
      if (importingRef.current) {
        return { successCount: 0, failureCount: 0, results: [] }
      }
      importingRef.current = true
      dispatch({ type: 'SET_IMPORTING', payload: true })
      setProgress(null)
      setSaveError(null)

      try {
        const { summary, data, detectedYearMonth, prevYearDetectedYearMonth } = await processDroppedFiles(
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
          // ※ 前年データは prevYearDetectedYearMonth に分離済みのため影響しない
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
            summary.results
              .filter((r): r is typeof r & { type: DataType } => r.ok && r.type !== null)
              .map((r) => r.type),
          )
          // salesDiscount → sales + discount として扱う
          if (importedTypes.has('salesDiscount')) {
            importedTypes.add('sales')
            importedTypes.add('discount')
          }
          // 前年種別は当年保存対象から除外（実際の年月に別途保存する）
          const hasPrevYearSalesDiscount = importedTypes.has('prevYearSalesDiscount')
          const hasPrevYearCTS = importedTypes.has('prevYearCategoryTimeSales')
          importedTypes.delete('prevYearSalesDiscount')
          importedTypes.delete('prevYearCategoryTimeSales')

          // 既存データがあれば差分チェック（当年データのみ）
          if (repo.isAvailable()) {
            const { targetYear, targetMonth } = settingsRef.current
            try {
              const existing = await repo.loadMonthlyData(targetYear, targetMonth)
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
                  // ただし前年データは実際の年月に別途保存する
                  if (prevYearDetectedYearMonth && repo.isAvailable()) {
                    savePrevYearData(data, prevYearDetectedYearMonth, hasPrevYearSalesDiscount, hasPrevYearCTS).catch((e) => {
                      console.error('[useImport] prevYear save failed:', e)
                    })
                  }
                  return summary
                }
              }
            } catch {
              // ストレージエラーは無視して通常フローへ
            }
          }

          // 差分確認不要 → 通常通り state に反映 & 保存
          dispatch({ type: 'SET_IMPORTED_DATA', payload: data })
          dataRef.current = data
          autoSetDataEndDay(data)

          const messages = validateImportedData(data, summary)
          dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: messages })

          // ストレージに保存（当年データ）
          if (repo.isAvailable()) {
            const { targetYear, targetMonth } = settingsRef.current
            try {
              await repo.saveMonthlyData(data, targetYear, targetMonth)
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'データ保存に失敗しました'
              console.error('[useImport] save failed:', e)
              setSaveError(msg)
            }
          }

          // 前年データを実際の年月に通常データタイプとして別途保存
          if (prevYearDetectedYearMonth && repo.isAvailable()) {
            savePrevYearData(data, prevYearDetectedYearMonth, hasPrevYearSalesDiscount, hasPrevYearCTS).catch((e) => {
              console.error('[useImport] prevYear save failed:', e)
            })
          }
        }

        return summary
      } finally {
        importingRef.current = false
        dispatch({ type: 'SET_IMPORTING', payload: false })
        setProgress(null)
      }
    },
    [dispatch, autoSetDataEndDay, repo, savePrevYearData],
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
      autoSetDataEndDay(finalData)

      const messages = validateImportedData(finalData, summary)
      dispatch({ type: 'SET_VALIDATION_MESSAGES', payload: messages })

      // ストレージに保存
      if (repo.isAvailable()) {
        const { targetYear, targetMonth } = settingsRef.current
        repo.saveMonthlyData(finalData, targetYear, targetMonth).catch((e) => {
          const msg = e instanceof Error ? e.message : 'データ保存に失敗しました'
          console.error('[useImport] save failed:', e)
          setSaveError(msg)
        })
      }

      setPendingDiff(null)
    },
    [pendingDiff, dispatch, autoSetDataEndDay, repo],
  )

  return {
    importFiles,
    isImporting: state.ui.isImporting,
    progress,
    data: state.data,
    validationMessages: state.validationMessages,
    pendingDiff,
    resolveDiff,
    saveError,
  }
}

// ─── 挿入のみマージ ─────────────────────────────────────

/** StoreDayRecord の挿入のみマージ（既存キーは上書きしない） */
function mergeStoreDayRecords<T>(
  existing: { readonly [storeId: string]: { readonly [day: number]: T } },
  incoming: { readonly [storeId: string]: { readonly [day: number]: T } },
): { readonly [storeId: string]: { readonly [day: number]: T } } {
  if (Object.keys(existing).length === 0) return incoming
  if (Object.keys(incoming).length === 0) return existing

  const merged: Record<string, Record<number, T>> = { ...existing }
  for (const [storeId, incomingDays] of Object.entries(incoming)) {
    if (!merged[storeId]) {
      merged[storeId] = incomingDays
    } else {
      const mergedDays: Record<number, T> = { ...merged[storeId] }
      for (const [dayStr, entry] of Object.entries(incomingDays)) {
        const day = Number(dayStr)
        if (!mergedDays[day]) {
          mergedDays[day] = entry
        }
      }
      merged[storeId] = mergedDays
    }
  }
  return merged
}

/** CategoryTimeSalesData の挿入のみマージ */
function mergeCTSInserts(
  existing: CategoryTimeSalesData,
  incoming: CategoryTimeSalesData,
): CategoryTimeSalesData {
  if (existing.records.length === 0) return incoming
  if (incoming.records.length === 0) return existing
  const existingKeys = new Set(existing.records.map(categoryTimeSalesRecordKey))
  const newRecords = incoming.records.filter(
    (r) => !existingKeys.has(categoryTimeSalesRecordKey(r)),
  )
  return { records: [...existing.records, ...newRecords] }
}

/** DepartmentKpiData の挿入のみマージ（既存deptCodeは上書きしない） */
function mergeDepartmentKpiInserts(
  existing: DepartmentKpiData,
  incoming: DepartmentKpiData,
): DepartmentKpiData {
  if (existing.records.length === 0) return incoming
  if (incoming.records.length === 0) return existing
  const existingCodes = new Set(existing.records.map((r) => r.deptCode))
  const newRecords = incoming.records.filter((r) => !existingCodes.has(r.deptCode))
  return { records: [...existing.records, ...newRecords] }
}

/** ReadonlyMap の挿入のみマージ */
function mergeMapInserts<K, V>(
  existing: ReadonlyMap<K, V>,
  incoming: ReadonlyMap<K, V>,
): ReadonlyMap<K, V> {
  const merged = new Map(existing)
  for (const [k, v] of incoming) {
    if (!merged.has(k)) merged.set(k, v)
  }
  return merged
}

/**
 * 既存データに新規挿入分のみをマージして返す。
 * 既存に値がある場合は変更しない。
 */
export function mergeInsertsOnly(
  existing: ImportedData,
  incoming: ImportedData,
  importedTypes: ReadonlySet<string>,
): ImportedData {
  const has = (t: string) => importedTypes.has(t)

  return {
    ...existing,
    purchase: has('purchase') ? mergeStoreDayRecords(existing.purchase, incoming.purchase) : existing.purchase,
    sales: has('sales') ? mergeStoreDayRecords(existing.sales, incoming.sales) : existing.sales,
    discount: has('discount') ? mergeStoreDayRecords(existing.discount, incoming.discount) : existing.discount,
    prevYearSales: has('prevYearSales') ? mergeStoreDayRecords(existing.prevYearSales, incoming.prevYearSales) : existing.prevYearSales,
    prevYearDiscount: has('prevYearDiscount') ? mergeStoreDayRecords(existing.prevYearDiscount, incoming.prevYearDiscount) : existing.prevYearDiscount,
    interStoreIn: has('interStoreIn') ? mergeStoreDayRecords(existing.interStoreIn, incoming.interStoreIn) : existing.interStoreIn,
    interStoreOut: has('interStoreOut') ? mergeStoreDayRecords(existing.interStoreOut, incoming.interStoreOut) : existing.interStoreOut,
    flowers: has('flowers') ? mergeStoreDayRecords(existing.flowers, incoming.flowers) : existing.flowers,
    directProduce: has('directProduce') ? mergeStoreDayRecords(existing.directProduce, incoming.directProduce) : existing.directProduce,
    consumables: has('consumables') ? mergeStoreDayRecords(existing.consumables, incoming.consumables) : existing.consumables,
    categoryTimeSales: has('categoryTimeSales') ? mergeCTSInserts(existing.categoryTimeSales, incoming.categoryTimeSales) : existing.categoryTimeSales,
    prevYearCategoryTimeSales: has('prevYearCategoryTimeSales') ? mergeCTSInserts(existing.prevYearCategoryTimeSales, incoming.prevYearCategoryTimeSales) : existing.prevYearCategoryTimeSales,
    departmentKpi: has('departmentKpi') ? mergeDepartmentKpiInserts(existing.departmentKpi, incoming.departmentKpi) : existing.departmentKpi,
    stores: mergeMapInserts(existing.stores, incoming.stores),
    suppliers: mergeMapInserts(existing.suppliers, incoming.suppliers),
    settings: has('initialSettings') ? mergeMapInserts(existing.settings, incoming.settings) : existing.settings,
    budget: has('budget') ? mergeMapInserts(existing.budget, incoming.budget) : existing.budget,
  }
}
