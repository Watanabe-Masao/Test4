/**
 * 単月インポートオーケストレーション（MonthlyData ベース）
 *
 * ImportOrchestrator から抽出。単月のインポート実行と差分解決を担う。
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { AppSettings } from '@/domain/models/storeTypes'
import { detectDataMaxDay } from '@/application/services/dataDetection'
import { calculateDiff } from '@/application/services/diffCalculator'
import { validateImportedData } from './FileImportService'
import type { ImportSummary } from './FileImportService'
import { mergeMonthlyData, mergeMonthlyInsertsOnly } from './monthlyDataMerge'
import type { MonthPartitions } from './FileImportService'
import type {
  MonthlyImportResult,
  MonthlyPendingDiffCheck,
  MonthlyResolveDiffResult,
  ImportSideEffects,
} from './monthlyImportTypes'
import { saveSummaryCache, saveImportHistory } from './importHelpers'

export async function orchestrateSingleMonth(
  incomingMonth: MonthlyData,
  monthPartitions: MonthPartitions,
  settings: AppSettings,
  importedTypes: ReadonlySet<string>,
  summary: ImportSummary,
  effects: ImportSideEffects,
  detectedYearMonth: { year: number; month: number } | null,
): Promise<MonthlyImportResult> {
  const { repo } = effects
  const { targetYear, targetMonth } = settings

  if (repo.isAvailable()) {
    try {
      const existingMonthly = await repo.loadMonthlyData(targetYear, targetMonth)
      if (existingMonthly) {
        const diff = calculateDiff(existingMonthly, incomingMonth, importedTypes)
        if (diff.needsConfirmation) {
          const mk = `${targetYear}-${targetMonth}`
          return {
            summary,
            finalData: null,
            pendingDiff: {
              diffResult: diff,
              incomingByMonth: new Map([[mk, incomingMonth]]),
              existingByMonth: new Map([[mk, existingMonthly]]),
              primaryMonthKey: mk,
              importedTypes,
              summary,
              monthPartitions,
            },
            detectedMaxDay: 0,
            validationMessages: null,
            detectedYearMonth,
          }
        }
        // diff 不要 → merge
        const merged = mergeMonthlyData(existingMonthly, incomingMonth, 'overwrite')
        return finalizeSingleMonth(merged, summary, effects, detectedYearMonth)
      }
    } catch {
      // ストレージエラーは無視
    }
  }

  // 既存なし → incoming をそのまま使用
  return finalizeSingleMonth(incomingMonth, summary, effects, detectedYearMonth)
}

/** 単月の最終処理（validation + save + return） */
async function finalizeSingleMonth(
  monthly: MonthlyData,
  summary: ImportSummary,
  effects: ImportSideEffects,
  detectedYearMonth: { year: number; month: number } | null,
): Promise<MonthlyImportResult> {
  const { repo } = effects
  const { year, month } = monthly.origin
  const messages = validateImportedData(monthly, summary)
  const detectedMaxDay = detectDataMaxDay(monthly)

  if (repo.isAvailable()) {
    await repo.saveMonthlyData(monthly, year, month)
    saveSummaryCache(monthly, year, month, repo)
    saveImportHistory(summary, year, month, repo)
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
  pending: MonthlyPendingDiffCheck,
  action: 'overwrite' | 'keep-existing',
  settings: AppSettings,
  effects: ImportSideEffects,
): Promise<MonthlyResolveDiffResult> {
  const { repo } = effects
  const { targetYear, targetMonth } = settings
  const mk = `${targetYear}-${targetMonth}`
  const incoming = pending.incomingByMonth.get(mk)!
  const existing = pending.existingByMonth.get(mk)!

  const finalData =
    action === 'overwrite'
      ? mergeMonthlyData(existing, incoming, 'overwrite')
      : mergeMonthlyInsertsOnly(existing, incoming, pending.importedTypes)

  if (repo.isAvailable()) {
    await repo.saveMonthlyData(finalData, targetYear, targetMonth)
    saveSummaryCache(finalData, targetYear, targetMonth, repo)
    saveImportHistory(pending.summary, targetYear, targetMonth, repo)
  }

  return {
    finalData,
    detectedMaxDay: detectDataMaxDay(finalData),
    validationMessages: validateImportedData(finalData, pending.summary),
  }
}
