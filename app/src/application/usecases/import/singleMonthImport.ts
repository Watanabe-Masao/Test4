/**
 * 単月インポートオーケストレーション（MonthlyData ベース）
 *
 * ImportOrchestrator から抽出。単月のインポート実行と差分解決を担う。
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { AppSettings } from '@/domain/models/storeTypes'
import { detectDataMaxDay } from '@/application/services/dataDetection'
import { calculateDiff } from '@/application/services/diffCalculator'
import { validateImportData } from './FileImportService'
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
import { hasValidationErrors } from './importValidation'

export async function orchestrateSingleMonth(
  incomingMonth: MonthlyData,
  monthPartitions: MonthPartitions,
  settings: AppSettings,
  importedTypes: ReadonlySet<string>,
  summary: ImportSummary,
  effects: ImportSideEffects,
  detectedYearMonth: { year: number; month: number } | null,
  monthSummary?: ImportSummary,
  importId?: string,
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
        return finalizeSingleMonth(
          merged,
          summary,
          effects,
          detectedYearMonth,
          monthSummary,
          importId,
        )
      }
    } catch (err) {
      console.warn('[singleMonthImport] 既存データ読み込み失敗:', err)
    }
  }

  // 既存なし → incoming をそのまま使用
  return finalizeSingleMonth(
    incomingMonth,
    summary,
    effects,
    detectedYearMonth,
    monthSummary,
    importId,
  )
}

/** 単月の最終処理（validation + save + return） */
async function finalizeSingleMonth(
  monthly: MonthlyData,
  summary: ImportSummary,
  effects: ImportSideEffects,
  detectedYearMonth: { year: number; month: number } | null,
  monthSummary?: ImportSummary,
  importId?: string,
): Promise<MonthlyImportResult> {
  const { repo } = effects
  const { year, month } = monthly.origin
  const messages = validateImportData(monthly, summary)
  const detectedMaxDay = detectDataMaxDay(monthly)

  // バリデーションエラー（error レベル）がある場合はデータ保存をブロック
  if (hasValidationErrors(messages)) {
    console.warn(
      '[singleMonthImport] バリデーションエラーのためデータ保存をブロック:',
      messages.filter((m) => m.level === 'error').map((m) => m.message),
    )
    return {
      summary,
      finalData: null,
      pendingDiff: null,
      detectedMaxDay,
      validationMessages: messages,
      detectedYearMonth,
    }
  }

  if (repo.isAvailable()) {
    await repo.saveMonthlyData(monthly, year, month)
    // non-critical: 失敗してもインポート自体は成功扱い
    await saveSummaryCache(monthly, year, month, repo)
    await saveImportHistory(monthSummary ?? summary, year, month, repo, importId)
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
    await saveSummaryCache(finalData, targetYear, targetMonth, repo)
    await saveImportHistory(pending.summary, targetYear, targetMonth, repo)
  }

  const validationMessages = validateImportData(finalData, pending.summary)
  // 差分解決後もバリデーションチェック（error があればログ警告）
  if (hasValidationErrors(validationMessages)) {
    console.warn(
      '[singleMonthImport] resolveDiff 後のバリデーションエラー:',
      validationMessages.filter((m) => m.level === 'error').map((m) => m.message),
    )
  }

  return {
    finalData,
    detectedMaxDay: detectDataMaxDay(finalData),
    validationMessages,
  }
}
