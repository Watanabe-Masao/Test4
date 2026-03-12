/**
 * 単月インポートオーケストレーション
 *
 * ImportOrchestrator から抽出。単月のインポート実行と差分解決を担う。
 */
import type { AppSettings, ImportedData } from '@/domain/models'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import { calculateDiff } from '@/application/services/diffCalculator'
import { validateImportedData, filterDataForMonth } from './FileImportService'
import type { ImportSummary, MonthPartitions } from './FileImportService'
import { buildMonthData, mergeInsertsOnly } from './importDataMerge'
import type { ImportResult, ResolveDiffResult, ImportSideEffects } from './ImportOrchestrator'
import { saveSummaryCache, saveImportHistory } from './importHelpers'

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
      const existing = await repo.loadMonthlyData(targetYear, targetMonth)
      if (existing) {
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

  if (repo.isAvailable()) {
    await repo.saveMonthlyData(targetData, targetYear, targetMonth)
    saveSummaryCache(targetData, targetYear, targetMonth, repo)
    saveImportHistory(summary, targetYear, targetMonth, repo)
  }

  return {
    summary,
    finalData: targetData,
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

  if (repo.isAvailable()) {
    const { targetYear, targetMonth } = settings
    await repo.saveMonthlyData(finalData, targetYear, targetMonth)
    saveSummaryCache(finalData, targetYear, targetMonth, repo)
    saveImportHistory(summary, targetYear, targetMonth, repo)
  }

  return {
    finalData,
    detectedMaxDay: detectDataMaxDay(finalData),
    validationMessages: validateImportedData(finalData, summary),
  }
}
