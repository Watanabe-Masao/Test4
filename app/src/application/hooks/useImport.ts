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
} from '@/domain/models'
import { createEmptyImportedData } from '@/domain/models'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { calculateDiff } from '@/application/services/diffCalculator'
import { buildStoreDaySummaryCache } from '@/application/usecases/calculation'
import { rawFileStore } from '@/infrastructure/storage/rawFileStore'
import { buildMonthData, mergeInsertsOnly, DEFAULT_MERGE_ACTION } from './useImport.helpers'

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
  /** MonthPartitions（StoreDayIndex の年月分割情報） */
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
            ...(r.relativePath ? { relativePath: r.relativePath } : {}),
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

          // 原本ファイルを IndexedDB に保存（fire-and-forget）
          const { targetYear: saveYear, targetMonth: saveMonth } = settingsRef.current
          const fileArray = Array.from(files)
          for (let i = 0; i < summary.results.length; i++) {
            const result = summary.results[i]
            if (result.ok && result.type && fileArray[i]) {
              rawFileStore
                .saveFile(
                  saveYear,
                  saveMonth,
                  result.type,
                  fileArray[i],
                  result.filename,
                  result.relativePath,
                )
                .catch((e) => {
                  console.warn('[useImport] rawFileStore.saveFile failed:', e)
                })
            }
          }

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
            // 主月のマージ済みデータを保持して Zustand に反映する
            const { targetYear, targetMonth } = settingsRef.current
            const targetMk = `${targetYear}-${targetMonth}`
            let primaryData: ImportedData | null = null

            if (repo.isAvailable()) {
              try {
                for (const { year, month } of recordMonths) {
                  const mk = `${year}-${month}`
                  const monthData = filterDataForMonth(processedData, year, month, monthPartitions)
                  const existing = existingByMonth.get(mk) ?? null
                  const finalData = buildMonthData(existing, monthData, DEFAULT_MERGE_ACTION)
                  await repo.saveMonthlyData(finalData, year, month)
                  buildAndSaveSummaryCache(finalData, year, month)
                  // 主月のマージ済みデータを保持
                  if (mk === targetMk) {
                    primaryData = finalData
                  }
                }
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'データ保存に失敗しました'
                console.error('[useImport] multi-month save failed:', e)
                setSaveError(msg)
              }
            }

            // 主月のマージ済みデータを state に反映
            // マージ済みデータがない場合はフィルタ済みデータをフォールバック
            if (!primaryData) {
              primaryData = filterDataForMonth(
                processedData,
                targetYear,
                targetMonth,
                monthPartitions,
              )
            }
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

// Re-export helpers used by external consumers
export { mergeInsertsOnly } from './useImport.helpers'
