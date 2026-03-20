/**
 * 複数月インポートオーケストレーション
 *
 * ImportOrchestrator から抽出。複数月にまたがるインポート実行と差分解決を担う。
 */
import type { DataTypeDiff } from '@/domain/models/analysis'
import type { AppSettings, ImportedData } from '@/domain/models/storeTypes'
import { createEmptyImportedData } from '@/domain/models/storeTypes'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import { calculateDiff } from '@/application/services/diffCalculator'
import { validateImportedData, filterDataForMonth } from './FileImportService'
import type { ImportSummary, MonthPartitions } from './FileImportService'
import { buildMonthData } from './importDataMerge'
import { DEFAULT_MERGE_ACTION } from './importDataMerge'
import type {
  ImportResult,
  ResolveDiffResult,
  PendingDiffCheck,
  ImportSideEffects,
} from './ImportOrchestrator'
import { saveSummaryCache, saveImportHistory } from './importHelpers'

export async function orchestrateMultiMonth(
  processedData: ImportedData,
  recordMonths: readonly { year: number; month: number }[],
  monthPartitions: MonthPartitions,
  settings: AppSettings,
  importedTypes: ReadonlySet<string>,
  summary: ImportSummary,
  effects: ImportSideEffects,
  detectedYearMonth: { year: number; month: number } | null,
): Promise<ImportResult> {
  const { repo } = effects

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
      return {
        summary,
        finalData: null,
        pendingDiff: {
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
          multiMonth: { months: recordMonths, existingByMonth },
        },
        detectedMaxDay: 0,
        validationMessages: null,
        detectedYearMonth,
      }
    }
  }

  // 差分確認不要 → 保存
  const { targetYear, targetMonth } = settings
  const targetMk = `${targetYear}-${targetMonth}`
  let primaryData: ImportedData | null = null

  if (repo.isAvailable()) {
    for (const { year, month } of recordMonths) {
      const mk = `${year}-${month}`
      const monthData = filterDataForMonth(processedData, year, month, monthPartitions)
      const existing = existingByMonth.get(mk) ?? null
      const finalData = buildMonthData(existing, monthData, DEFAULT_MERGE_ACTION)
      await repo.saveMonthlyData(finalData, year, month)
      saveSummaryCache(finalData, year, month, repo)
      if (mk === targetMk) primaryData = finalData
    }
  }

  if (!primaryData) {
    primaryData = filterDataForMonth(processedData, targetYear, targetMonth, monthPartitions)
  }

  const messages = validateImportedData(primaryData, summary)
  const detectedMaxDay = detectDataMaxDay(primaryData)

  // 各月のインポート履歴を保存
  for (const { year, month } of recordMonths) {
    saveImportHistory(summary, year, month, repo)
  }

  return {
    summary,
    finalData: primaryData,
    pendingDiff: null,
    detectedMaxDay,
    validationMessages: messages,
    detectedYearMonth,
  }
}

export async function resolveMultiMonthDiff(
  incomingData: ImportedData,
  multiMonth: NonNullable<PendingDiffCheck['multiMonth']>,
  monthPartitions: MonthPartitions,
  action: 'overwrite' | 'keep-existing',
  settings: AppSettings,
  summary: ImportSummary,
  effects: ImportSideEffects,
): Promise<ResolveDiffResult> {
  const { repo } = effects
  const { months, existingByMonth } = multiMonth
  const { targetYear, targetMonth } = settings

  const primaryMonthData = filterDataForMonth(
    incomingData,
    targetYear,
    targetMonth,
    monthPartitions,
  )
  const primaryExisting = existingByMonth.get(`${targetYear}-${targetMonth}`) ?? null
  const primaryFinalData = buildMonthData(primaryExisting, primaryMonthData, action)

  // 全月を保存
  if (repo.isAvailable()) {
    for (const { year, month } of months) {
      const mk = `${year}-${month}`
      const monthData = filterDataForMonth(incomingData, year, month, monthPartitions)
      const existing = existingByMonth.get(mk) ?? null
      const finalData = buildMonthData(existing, monthData, action)
      await repo.saveMonthlyData(finalData, year, month)
      saveSummaryCache(finalData, year, month, repo)
    }
    for (const { year, month } of months) {
      saveImportHistory(summary, year, month, repo)
    }
  }

  return {
    finalData: primaryFinalData,
    detectedMaxDay: detectDataMaxDay(primaryFinalData),
    validationMessages: validateImportedData(primaryFinalData, summary),
  }
}
