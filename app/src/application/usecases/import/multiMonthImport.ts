/**
 * 複数月インポートオーケストレーション（MonthlyData ベース）
 *
 * ImportOrchestrator から抽出。複数月にまたがるインポート実行と差分解決を担う。
 */
import type { DataTypeDiff } from '@/domain/models/analysis'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { AppSettings } from '@/domain/models/storeTypes'
import { detectDataMaxDay } from '@/application/services/dataDetection'
import { calculateDiff } from '@/application/services/diffCalculator'
import { validateImportData } from './FileImportService'
import { hasValidationErrors } from './importValidation'
import { mergeMonthlyData, DEFAULT_MERGE_ACTION } from './monthlyDataMerge'
import type {
  MonthlyImportBatch,
  MonthlyImportResult,
  MonthlyPendingDiffCheck,
  MonthlyResolveDiffResult,
  ImportSideEffects,
} from './monthlyImportTypes'
import { saveSummaryCache, saveImportHistory } from './importHelpers'

export async function orchestrateMultiMonth(
  batch: MonthlyImportBatch,
  settings: AppSettings,
  importedTypes: ReadonlySet<string>,
  effects: ImportSideEffects,
  detectedYearMonth: { year: number; month: number } | null,
): Promise<MonthlyImportResult> {
  const { repo } = effects
  const { summary, months: incomingByMonth, monthPartitions } = batch

  // 各月の既存データを読み込み
  const existingByMonth = new Map<string, MonthlyData>()
  if (repo.isAvailable()) {
    try {
      for (const [mk] of incomingByMonth) {
        const [y, m] = mk.split('-').map(Number)
        const monthlyData = await repo.loadMonthlyData(y, m)
        if (monthlyData) {
          existingByMonth.set(mk, monthlyData)
        }
      }
    } catch (err) {
      console.warn('[multiMonthImport] 既存データ読み込み失敗:', err)
    }
  }

  // 既存データがある月について差分チェック
  if (existingByMonth.size > 0) {
    const aggregatedDiffs: DataTypeDiff[] = []
    const aggregatedAutoApproved: string[] = []

    for (const [mk, incoming] of incomingByMonth) {
      const existing = existingByMonth.get(mk)
      if (!existing) continue

      const diff = calculateDiff(existing, incoming, importedTypes)

      for (const d of diff.diffs) {
        const [y, m] = mk.split('-')
        aggregatedDiffs.push({
          ...d,
          dataType: `${mk}:${d.dataType}`,
          dataTypeName: `${y}年${m}月 ${d.dataTypeName}`,
        })
      }
      aggregatedAutoApproved.push(...diff.autoApproved.map((a) => `${mk}:${a}`))
    }

    const needsConfirmation = aggregatedDiffs.some(
      (d) => d.modifications.length > 0 || d.removals.length > 0,
    )

    if (needsConfirmation) {
      const { targetYear, targetMonth } = settings
      return {
        summary,
        finalData: null,
        pendingDiff: {
          diffResult: {
            diffs: aggregatedDiffs,
            needsConfirmation,
            autoApproved: aggregatedAutoApproved,
          },
          incomingByMonth,
          existingByMonth,
          primaryMonthKey: `${targetYear}-${targetMonth}`,
          importedTypes,
          summary,
          monthPartitions,
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
  let primaryMonthly: MonthlyData | null = null

  if (repo.isAvailable()) {
    for (const [mk, incoming] of incomingByMonth) {
      const existing = existingByMonth.get(mk) ?? null
      const finalData = mergeMonthlyData(existing, incoming, DEFAULT_MERGE_ACTION)
      const [y, m] = mk.split('-').map(Number)
      await repo.saveMonthlyData(finalData, y, m)
      saveSummaryCache(finalData, y, m, repo)
      if (mk === targetMk) primaryMonthly = finalData
    }
  }

  if (!primaryMonthly) {
    primaryMonthly = incomingByMonth.get(targetMk) ?? [...incomingByMonth.values()][0] ?? null
  }

  if (!primaryMonthly) {
    return {
      summary,
      finalData: null,
      pendingDiff: null,
      detectedMaxDay: 0,
      validationMessages: null,
      detectedYearMonth,
    }
  }

  const messages = validateImportData(primaryMonthly, summary)
  const detectedMaxDay = detectDataMaxDay(primaryMonthly)

  // バリデーションエラーがある場合はデータ保存をブロック
  if (hasValidationErrors(messages)) {
    console.warn(
      '[multiMonthImport] バリデーションエラーのためデータ保存をブロック:',
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

  // 各月のインポート履歴を保存（月別 summary があればそれを使用）
  const importId = batch.execution.importId
  for (const [mk] of incomingByMonth) {
    const [y, m] = mk.split('-').map(Number)
    const monthSummary = batch.summaryByMonth.get(mk) ?? summary
    saveImportHistory(monthSummary, y, m, repo, importId)
  }

  return {
    summary,
    finalData: primaryMonthly,
    pendingDiff: null,
    detectedMaxDay,
    validationMessages: messages,
    detectedYearMonth,
  }
}

export async function resolveMultiMonthDiff(
  pending: MonthlyPendingDiffCheck,
  action: 'overwrite' | 'keep-existing',
  settings: AppSettings,
  effects: ImportSideEffects,
): Promise<MonthlyResolveDiffResult> {
  const { repo } = effects
  const { incomingByMonth, existingByMonth, summary } = pending
  const { targetYear, targetMonth } = settings
  const targetMk = `${targetYear}-${targetMonth}`

  let primaryMonthly: MonthlyData | null = null

  // 全月を保存
  if (repo.isAvailable()) {
    for (const [mk, incoming] of incomingByMonth) {
      const existing = existingByMonth.get(mk) ?? null
      const finalData = mergeMonthlyData(existing, incoming, action)
      const [y, m] = mk.split('-').map(Number)
      await repo.saveMonthlyData(finalData, y, m)
      saveSummaryCache(finalData, y, m, repo)
      if (mk === targetMk) primaryMonthly = finalData
    }
    for (const [mk] of incomingByMonth) {
      const [y, m] = mk.split('-').map(Number)
      saveImportHistory(summary, y, m, repo)
    }
  }

  if (!primaryMonthly) {
    primaryMonthly = incomingByMonth.get(targetMk) ?? [...incomingByMonth.values()][0]!
  }

  const resolveMessages = validateImportData(primaryMonthly, summary)
  if (hasValidationErrors(resolveMessages)) {
    console.warn(
      '[multiMonthImport] resolveDiff 後のバリデーションエラー:',
      resolveMessages.filter((m) => m.level === 'error').map((m) => m.message),
    )
  }

  return {
    finalData: primaryMonthly,
    detectedMaxDay: detectDataMaxDay(primaryMonthly),
    validationMessages: resolveMessages,
  }
}
