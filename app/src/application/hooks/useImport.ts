import { useCallback, useRef, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { calculationCache } from '@/application/services/calculationCache'
import { useRepository } from '../context/useRepository'
import {
  processDroppedFiles,
  validateImportedData,
  extractRecordMonths,
  filterDataForMonth,
} from '@/application/usecases/import'
import type { ImportSummary, MonthPartitions } from '@/application/usecases/import'
import type {
  AppSettings,
  DataType,
  ImportedData,
  DiffResult,
  DataTypeDiff,
  ImportHistoryEntry,
  CategoryTimeSalesData,
  ClassifiedSalesData,
  DepartmentKpiData,
} from '@/domain/models'
import {
  categoryTimeSalesRecordKey,
  classifiedSalesRecordKey,
  createEmptyImportedData,
} from '@/domain/models'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { calculateDiff } from '@/application/services/diffCalculator'
import { buildStoreDaySummaryCache } from '@/application/usecases/calculation'

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
  /** MonthPartitions（StoreDayRecord の年月分割情報） */
  readonly monthPartitions: MonthPartitions
  /** 複数月インポート時の追加情報 */
  readonly multiMonth?: {
    readonly months: readonly { year: number; month: number }[]
    readonly existingByMonth: ReadonlyMap<string, ImportedData>
  }
}

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

  // ref で最新の値を保持し、ステール・クロージャを回避
  const dataRef = useRef<ImportedData>(data)
  dataRef.current = data

  const settingsRef = useRef<AppSettings>(settings)
  settingsRef.current = settings

  // 同時インポート防止ロック
  const importingRef = useRef(false)

  /** インポート後にデータ末日スライダーを自動調整する */
  const autoSetDataEndDay = useCallback((importedData: ImportedData) => {
    const maxDay = detectDataMaxDay(importedData)
    if (maxDay <= 0) return
    const { targetYear, targetMonth } = settingsRef.current
    const dim = getDaysInMonth(targetYear, targetMonth)
    // データが月末まである場合は null（全日）、それ以外は検出末日を設定
    // UPDATE_SETTINGS side effects: calculationCache.clear() + invalidateCalculation()
    useSettingsStore.getState().updateSettings({ dataEndDay: maxDay >= dim ? null : maxDay })
    calculationCache.clear()
    useUiStore.getState().invalidateCalculation()
  }, [])

  /** ImportSummary からインポート履歴エントリを生成して保存する */
  const saveHistory = useCallback(
    (summary: ImportSummary, year: number, month: number) => {
      if (!repo.isAvailable()) return
      const entry: ImportHistoryEntry = {
        importedAt: new Date().toISOString(),
        files: summary.results
          .filter((r) => r.ok)
          .map((r) => ({
            filename: r.filename,
            type: r.type,
            typeName: r.typeName,
            rowCount: r.rowCount,
          })),
        successCount: summary.successCount,
        failureCount: summary.failureCount,
      }
      repo.saveImportHistory(year, month, entry).catch((e) => {
        console.error('[useImport] saveImportHistory failed:', e)
      })
    },
    [repo],
  )

  /** データ保存後にサマリーキャッシュを非同期構築・保存する（fire-and-forget） */
  const buildAndSaveSummaryCache = useCallback(
    (cacheData: ImportedData, year: number, month: number) => {
      if (!repo.isAvailable()) return
      try {
        const daysInMonth = getDaysInMonth(year, month)
        const cache = buildStoreDaySummaryCache(cacheData, daysInMonth)
        repo.saveSummaryCache(cache, year, month).catch((e) => {
          console.warn('[useImport] saveSummaryCache failed:', e)
        })
      } catch (e) {
        console.warn('[useImport] buildStoreDaySummaryCache failed:', e)
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
      useUiStore.getState().setImporting(true)
      setProgress(null)
      setSaveError(null)

      try {
        const {
          summary,
          data: processedData,
          detectedYearMonth,
          monthPartitions,
        } = await processDroppedFiles(
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
            // UPDATE_SETTINGS side effects: calculationCache.clear() + invalidateCalculation()
            useSettingsStore.getState().updateSettings(updatedSettings)
            calculationCache.clear()
            useUiStore.getState().invalidateCalculation()
            settingsRef.current = { ...settingsRef.current, ...updatedSettings }
          }

          // インポートされたデータ種別を特定
          const importedTypes = new Set<string>(
            summary.results
              .filter((r): r is typeof r & { type: DataType } => r.ok && r.type !== null)
              .map((r) => r.type),
          )

          // 複数月にまたがるデータかチェック（パーティション情報も考慮）
          const recordMonths = extractRecordMonths(processedData, monthPartitions)
          const isMultiMonth = recordMonths.length > 1

          if (isMultiMonth) {
            // ── 複数月インポート: 月ごとに差分チェック + 保存 ──

            // 各月の既存データを読み込み
            const existingByMonth = new Map<string, ImportedData>()
            if (repo.isAvailable()) {
              try {
                for (const { year, month } of recordMonths) {
                  const existing = await repo.loadMonthlyData(year, month)
                  if (existing) {
                    existingByMonth.set(`${year}-${month}`, existing)
                  }
                }
              } catch {
                // ストレージエラーは無視
              }
            }

            // 既存データがある月について差分チェック
            if (existingByMonth.size > 0) {
              const aggregatedDiffs: DataTypeDiff[] = []
              const aggregatedAutoApproved: string[] = []

              for (const { year, month } of recordMonths) {
                const mk = `${year}-${month}`
                const existing = existingByMonth.get(mk)
                if (!existing) continue

                const monthData = filterDataForMonth(processedData, year, month, monthPartitions)
                const diff = calculateDiff(existing, monthData, importedTypes)

                for (const d of diff.diffs) {
                  aggregatedDiffs.push({
                    ...d,
                    dataType: `${mk}:${d.dataType}`,
                    dataTypeName: `${year}年${month}月 ${d.dataTypeName}`,
                  })
                }
                aggregatedAutoApproved.push(...diff.autoApproved.map((a) => `${mk}:${a}`))
              }

              const needsConfirmation = aggregatedDiffs.some(
                (d) => d.modifications.length > 0 || d.removals.length > 0,
              )

              if (needsConfirmation) {
                setPendingDiff({
                  diffResult: {
                    diffs: aggregatedDiffs,
                    needsConfirmation,
                    autoApproved: aggregatedAutoApproved,
                  },
                  incomingData: processedData,
                  existingData: createEmptyImportedData(),
                  importedTypes,
                  summary,
                  monthPartitions,
                  multiMonth: {
                    months: recordMonths,
                    existingByMonth,
                  },
                })
                return summary
              }
            }

            // 差分確認不要 → 保存
            if (repo.isAvailable()) {
              try {
                for (const { year, month } of recordMonths) {
                  const mk = `${year}-${month}`
                  const monthData = filterDataForMonth(processedData, year, month, monthPartitions)
                  const existing = existingByMonth.get(mk) ?? null
                  const finalData = buildMonthData(existing, monthData, action)
                  await repo.saveMonthlyData(finalData, year, month)
                  buildAndSaveSummaryCache(finalData, year, month)
                }
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'データ保存に失敗しました'
                console.error('[useImport] multi-month save failed:', e)
                setSaveError(msg)
              }
            }

            // 主月のフィルタ済みデータを state に反映
            const { targetYear, targetMonth } = settingsRef.current
            const primaryData = filterDataForMonth(
              processedData,
              targetYear,
              targetMonth,
              monthPartitions,
            )
            // SET_IMPORTED_DATA side effects: calculationCache.clear() + invalidateCalculation()
            useDataStore.getState().setImportedData(primaryData)
            calculationCache.clear()
            useUiStore.getState().invalidateCalculation()
            dataRef.current = primaryData
            autoSetDataEndDay(primaryData)

            const messages = validateImportedData(primaryData, summary)
            useDataStore.getState().setValidationMessages(messages)

            // インポート履歴を保存（各月に記録）
            for (const { year, month } of recordMonths) {
              saveHistory(summary, year, month)
            }
          } else {
            // ── 単月インポート: 既存の差分チェック + 保存 ──
            const { targetYear, targetMonth } = settingsRef.current

            // パーティション情報がある場合、対象月のデータだけに絞り込む
            let targetData = filterDataForMonth(
              processedData,
              targetYear,
              targetMonth,
              monthPartitions,
            )

            // 既存データがあれば差分チェック & マージ
            if (repo.isAvailable()) {
              try {
                const existing = await repo.loadMonthlyData(targetYear, targetMonth)
                if (existing) {
                  const diff = calculateDiff(existing, targetData, importedTypes)
                  if (diff.needsConfirmation) {
                    setPendingDiff({
                      diffResult: diff,
                      incomingData: targetData,
                      existingData: existing,
                      importedTypes,
                      summary,
                      monthPartitions,
                    })
                    return summary
                  }
                  // 差分確認不要 → 既存データとマージ（インポートしていない種別を保全）
                  targetData = buildMonthData(existing, targetData, 'overwrite')
                }
              } catch {
                // ストレージエラーは無視して通常フローへ
              }
            }

            // state に反映 & 保存
            // SET_IMPORTED_DATA side effects: calculationCache.clear() + invalidateCalculation()
            useDataStore.getState().setImportedData(targetData)
            calculationCache.clear()
            useUiStore.getState().invalidateCalculation()
            dataRef.current = targetData
            autoSetDataEndDay(targetData)

            const messages = validateImportedData(targetData, summary)
            useDataStore.getState().setValidationMessages(messages)

            // ストレージに保存
            if (repo.isAvailable()) {
              try {
                await repo.saveMonthlyData(targetData, targetYear, targetMonth)
                buildAndSaveSummaryCache(targetData, targetYear, targetMonth)
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'データ保存に失敗しました'
                console.error('[useImport] save failed:', e)
                setSaveError(msg)
              }
              saveHistory(summary, targetYear, targetMonth)
            }
          }
        }

        return summary
      } finally {
        importingRef.current = false
        useUiStore.getState().setImporting(false)
        setProgress(null)
      }
    },
    [autoSetDataEndDay, repo, saveHistory, buildAndSaveSummaryCache],
  )

  /** 差分確認結果を適用する */
  const resolveDiff = useCallback(
    (action: 'overwrite' | 'keep-existing' | 'cancel') => {
      if (!pendingDiff) return

      const { incomingData, existingData, importedTypes, summary, monthPartitions, multiMonth } =
        pendingDiff

      if (action === 'cancel') {
        setPendingDiff(null)
        return
      }

      if (multiMonth) {
        // ── 複数月: 月ごとに保存 ──
        const { months, existingByMonth } = multiMonth

        // 主月の最終データを state に反映
        const { targetYear, targetMonth } = settingsRef.current
        const primaryMonthData = filterDataForMonth(
          incomingData,
          targetYear,
          targetMonth,
          monthPartitions,
        )
        const primaryExisting = existingByMonth.get(`${targetYear}-${targetMonth}`) ?? null
        const primaryFinalData = buildMonthData(primaryExisting, primaryMonthData, action)

        // SET_IMPORTED_DATA side effects: calculationCache.clear() + invalidateCalculation()
        useDataStore.getState().setImportedData(primaryFinalData)
        calculationCache.clear()
        useUiStore.getState().invalidateCalculation()
        dataRef.current = primaryFinalData
        autoSetDataEndDay(primaryFinalData)

        const messages = validateImportedData(primaryFinalData, summary)
        useDataStore.getState().setValidationMessages(messages)

        // 全月を保存（非同期・保存完了後に履歴を記録）
        if (repo.isAvailable()) {
          const saveAll = async () => {
            try {
              for (const { year, month } of months) {
                const mk = `${year}-${month}`
                const monthData = filterDataForMonth(incomingData, year, month, monthPartitions)
                const existing = existingByMonth.get(mk) ?? null
                const finalData = buildMonthData(existing, monthData, action)
                await repo.saveMonthlyData(finalData, year, month)
                buildAndSaveSummaryCache(finalData, year, month)
              }
              // 全月の保存が成功した後にのみ履歴を記録
              for (const { year, month } of months) {
                saveHistory(summary, year, month)
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'データ保存に失敗しました'
              console.error('[useImport] multi-month save failed:', e)
              setSaveError(msg)
            }
          }
          saveAll()
        }
      } else {
        // ── 単月: 既存データとマージ ──
        // incomingData は filterDataForMonth 済みのため、インポートしていない種別は空 {} になっている。
        // buildMonthData で既存データとマージし、非インポート種別の既存データを保全する。
        let finalData: ImportedData
        if (action === 'overwrite') {
          finalData = buildMonthData(existingData, incomingData, 'overwrite')
        } else {
          // keep-existing: 挿入のみマージ
          finalData = mergeInsertsOnly(existingData, incomingData, importedTypes)
        }

        // SET_IMPORTED_DATA side effects: calculationCache.clear() + invalidateCalculation()
        useDataStore.getState().setImportedData(finalData)
        calculationCache.clear()
        useUiStore.getState().invalidateCalculation()
        dataRef.current = finalData
        autoSetDataEndDay(finalData)

        const messages = validateImportedData(finalData, summary)
        useDataStore.getState().setValidationMessages(messages)

        // ストレージに保存（保存完了後に履歴を記録）
        if (repo.isAvailable()) {
          const { targetYear, targetMonth } = settingsRef.current
          repo
            .saveMonthlyData(finalData, targetYear, targetMonth)
            .then(() => {
              saveHistory(summary, targetYear, targetMonth)
              buildAndSaveSummaryCache(finalData, targetYear, targetMonth)
            })
            .catch((e) => {
              const msg = e instanceof Error ? e.message : 'データ保存に失敗しました'
              console.error('[useImport] save failed:', e)
              setSaveError(msg)
            })
        }
      }

      setPendingDiff(null)
    },
    [pendingDiff, autoSetDataEndDay, repo, saveHistory, buildAndSaveSummaryCache],
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

// ─── 複数月データ構築 ───────────────────────────────────

/** デフォルトアクション（差分確認不要時の保存） */
const action = 'overwrite' as const

/**
 * 月別データの最終版を構築する。
 * monthData は filterDataForMonth で年月フィルタ済み（StoreDayRecord 含む）。
 * 既存データがない場合は monthData をそのまま使用。
 * ある場合は action に応じてマージする。
 */
function buildMonthData(
  existing: ImportedData | null,
  monthData: ImportedData,
  mergeAction: 'overwrite' | 'keep-existing' = 'overwrite',
): ImportedData {
  if (!existing) {
    // 新規月: フィルタ済み monthData をそのまま使用
    return monthData
  }
  if (mergeAction === 'overwrite') {
    // 上書き: 既存データに新規データをマージ（新規が優先）
    // レコードベース型（classifiedSales, categoryTimeSales）は merge ではなく replace する。
    // monthData は filterDataForMonth で年月フィルタ済みのため正しいレコードのみ含む。
    // 既存 IndexedDB データに別月のレコードが混入している場合（旧保存ロジック由来）、
    // merge するとそれらが残り続けて前年データが膨張するバグの原因になる。
    // incoming にレコードが無い（当該型がインポートされなかった）場合のみ既存を維持する。
    return {
      ...existing,
      stores: new Map([...existing.stores, ...monthData.stores]),
      suppliers: new Map([...existing.suppliers, ...monthData.suppliers]),
      purchase: { ...existing.purchase, ...monthData.purchase },
      classifiedSales:
        monthData.classifiedSales.records.length > 0
          ? monthData.classifiedSales
          : existing.classifiedSales,
      categoryTimeSales:
        monthData.categoryTimeSales.records.length > 0
          ? monthData.categoryTimeSales
          : existing.categoryTimeSales,
      departmentKpi:
        monthData.departmentKpi.records.length > 0
          ? monthData.departmentKpi
          : existing.departmentKpi,
      interStoreIn: { ...existing.interStoreIn, ...monthData.interStoreIn },
      interStoreOut: { ...existing.interStoreOut, ...monthData.interStoreOut },
      flowers: { ...existing.flowers, ...monthData.flowers },
      directProduce: { ...existing.directProduce, ...monthData.directProduce },
      consumables: { ...existing.consumables, ...monthData.consumables },
      settings: new Map([...existing.settings, ...monthData.settings]),
      budget: new Map([...existing.budget, ...monthData.budget]),
    }
  }
  // keep-existing: 挿入のみマージ
  return {
    ...existing,
    stores: mergeMapInserts(existing.stores, monthData.stores),
    suppliers: mergeMapInserts(existing.suppliers, monthData.suppliers),
    purchase: mergeStoreDayRecords(existing.purchase, monthData.purchase),
    classifiedSales: mergeCSInserts(existing.classifiedSales, monthData.classifiedSales),
    categoryTimeSales: mergeCTSInserts(existing.categoryTimeSales, monthData.categoryTimeSales),
    departmentKpi: mergeDepartmentKpiInserts(existing.departmentKpi, monthData.departmentKpi),
    interStoreIn: mergeStoreDayRecords(existing.interStoreIn, monthData.interStoreIn),
    interStoreOut: mergeStoreDayRecords(existing.interStoreOut, monthData.interStoreOut),
    flowers: mergeStoreDayRecords(existing.flowers, monthData.flowers),
    directProduce: mergeStoreDayRecords(existing.directProduce, monthData.directProduce),
    consumables: mergeStoreDayRecords(existing.consumables, monthData.consumables),
    settings: mergeMapInserts(existing.settings, monthData.settings),
    budget: mergeMapInserts(existing.budget, monthData.budget),
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

/** ClassifiedSalesData の挿入のみマージ */
function mergeCSInserts(
  existing: ClassifiedSalesData,
  incoming: ClassifiedSalesData,
): ClassifiedSalesData {
  if (existing.records.length === 0) return incoming
  if (incoming.records.length === 0) return existing
  const existingKeys = new Set(existing.records.map(classifiedSalesRecordKey))
  const newRecords = incoming.records.filter((r) => !existingKeys.has(classifiedSalesRecordKey(r)))
  return { records: [...existing.records, ...newRecords] }
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
    purchase: has('purchase')
      ? mergeStoreDayRecords(existing.purchase, incoming.purchase)
      : existing.purchase,
    classifiedSales: has('classifiedSales')
      ? mergeCSInserts(existing.classifiedSales, incoming.classifiedSales)
      : existing.classifiedSales,
    prevYearClassifiedSales: existing.prevYearClassifiedSales,
    interStoreIn: has('interStoreIn')
      ? mergeStoreDayRecords(existing.interStoreIn, incoming.interStoreIn)
      : existing.interStoreIn,
    interStoreOut: has('interStoreOut')
      ? mergeStoreDayRecords(existing.interStoreOut, incoming.interStoreOut)
      : existing.interStoreOut,
    flowers: has('flowers')
      ? mergeStoreDayRecords(existing.flowers, incoming.flowers)
      : existing.flowers,
    directProduce: has('directProduce')
      ? mergeStoreDayRecords(existing.directProduce, incoming.directProduce)
      : existing.directProduce,
    consumables: has('consumables')
      ? mergeStoreDayRecords(existing.consumables, incoming.consumables)
      : existing.consumables,
    categoryTimeSales: has('categoryTimeSales')
      ? mergeCTSInserts(existing.categoryTimeSales, incoming.categoryTimeSales)
      : existing.categoryTimeSales,
    prevYearCategoryTimeSales: existing.prevYearCategoryTimeSales,
    departmentKpi: has('departmentKpi')
      ? mergeDepartmentKpiInserts(existing.departmentKpi, incoming.departmentKpi)
      : existing.departmentKpi,
    stores: mergeMapInserts(existing.stores, incoming.stores),
    suppliers: mergeMapInserts(existing.suppliers, incoming.suppliers),
    settings: has('initialSettings')
      ? mergeMapInserts(existing.settings, incoming.settings)
      : existing.settings,
    budget: has('budget') ? mergeMapInserts(existing.budget, incoming.budget) : existing.budget,
  }
}
