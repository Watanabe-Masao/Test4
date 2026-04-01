/**
 * 単月インポートオーケストレーション
 *
 * ImportOrchestrator から抽出。単月のインポート実行と差分解決を担う。
 */
import type { AppSettings, ImportedData } from '@/domain/models/storeTypes'
import { detectDataMaxDay } from '@/application/services/dataDetection'
import { calculateDiff } from '@/application/services/diffCalculator'
import { validateImportedData, filterDataForMonth } from './FileImportService'
import type { ImportSummary, MonthPartitions } from './FileImportService'
import { buildMonthData, mergeInsertsOnly } from './importDataMerge'
import type { ImportResult, ResolveDiffResult, ImportSideEffects } from './ImportOrchestrator'
import { saveSummaryCache, saveImportHistory } from './importHelpers'
import { toMonthlyData, toLegacyImportedData } from '@/domain/models/monthlyDataAdapter'

export async function orchestrateSingleMonth(
  processedData: ImportedData,
  monthPartitions: MonthPartitions,
  settings: AppSettings,
  importedTypes: ReadonlySet<string>,
  summary: ImportSummary,
  effects: ImportSideEffects,
  detectedYearMonth: { year: number; month: number } | null,
): Promise<ImportResult> {
  const { repo } = effects
  const { targetYear, targetMonth } = settings

  let targetData = filterDataForMonth(processedData, targetYear, targetMonth, monthPartitions)

  if (repo.isAvailable()) {
    try {
      const existingMonthly = await repo.loadMonthlyData(targetYear, targetMonth)
      if (existingMonthly) {
        const existing = toLegacyImportedData({ current: existingMonthly, prevYear: null })
        const diff = calculateDiff(existing, targetData, importedTypes)
        if (diff.needsConfirmation) {
          return {
            summary,
            finalData: null,
            pendingDiff: {
              diffResult: diff,
              incomingData: targetData,
              existingData: existing,
              importedTypes,
              summary,
              monthPartitions,
            },
            detectedMaxDay: 0,
            validationMessages: null,
            detectedYearMonth,
          }
        }
        targetData = buildMonthData(existing, targetData, 'overwrite')
      }
    } catch {
      // ストレージエラーは無視
    }
  }

  const messages = validateImportedData(targetData, summary)
  const detectedMaxDay = detectDataMaxDay(targetData)

  const origin = { year: targetYear, month: targetMonth, importedAt: new Date().toISOString() }
  const monthly = toMonthlyData(targetData, origin)

  if (repo.isAvailable()) {
    await repo.saveMonthlyData(monthly, targetYear, targetMonth)
    saveSummaryCache(monthly, targetYear, targetMonth, repo)
    saveImportHistory(summary, targetYear, targetMonth, repo)
  }

  return {
    summary,
    finalData: monthly,
    pendingDiff: null,
    detectedMaxDay,
    validationMessages: messages,
    detectedYearMonth,
  }
}

export async function resolveSingleMonthDiff(
  incomingData: ImportedData,
  existingData: ImportedData,
  importedTypes: ReadonlySet<string>,
  action: 'overwrite' | 'keep-existing',
  settings: AppSettings,
  summary: ImportSummary,
  effects: ImportSideEffects,
): Promise<ResolveDiffResult> {
  const { repo } = effects

  let finalData: ImportedData
  if (action === 'overwrite') {
    finalData = buildMonthData(existingData, incomingData, 'overwrite')
  } else {
    finalData = mergeInsertsOnly(existingData, incomingData, importedTypes)
  }

  const { targetYear, targetMonth } = settings
  const origin = { year: targetYear, month: targetMonth, importedAt: new Date().toISOString() }
  const monthly = toMonthlyData(finalData, origin)

  if (repo.isAvailable()) {
    await repo.saveMonthlyData(monthly, targetYear, targetMonth)
    saveSummaryCache(monthly, targetYear, targetMonth, repo)
    saveImportHistory(summary, targetYear, targetMonth, repo)
  }

  return {
    finalData: monthly,
    detectedMaxDay: detectDataMaxDay(finalData),
    validationMessages: validateImportedData(finalData, summary),
  }
}
