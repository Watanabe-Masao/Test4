/**
 * ImportOrchestrator — インポートのビジネスロジック（ファサード）
 *
 * 単月処理は singleMonthImport.ts、複数月処理は multiMonthImport.ts に委譲。
 * processDroppedFiles の結果を MonthlyImportBatch に変換してから内部に渡す。
 */
import type { AppSettings, DataType } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import { createEmptyImportedData } from '@/domain/models/storeTypes'
import { toLegacyImportedData } from '@/domain/models/monthlyDataAdapter'
import { processDroppedFiles } from './FileImportService'
import type { ProgressCallback } from './FileImportService'
import { toMonthlyImportBatch } from './monthlyBatchAdapter'
import { orchestrateSingleMonth, resolveSingleMonthDiff } from './singleMonthImport'
import { orchestrateMultiMonth, resolveMultiMonthDiff } from './multiMonthImport'
import type {
  MonthlyImportResult,
  MonthlyPendingDiffCheck,
  MonthlyResolveDiffResult,
  ImportSideEffects,
} from './monthlyImportTypes'

// ─── Re-export 型（useImport 等の消費者向け） ──────────
export type { MonthlyImportResult as ImportResult } from './monthlyImportTypes'
export type { MonthlyResolveDiffResult as ResolveDiffResult } from './monthlyImportTypes'
export type { MonthlyPendingDiffCheck as PendingDiffCheck } from './monthlyImportTypes'
export type { ImportSideEffects } from './monthlyImportTypes'

// ─── ImportOrchestrator ──────────────────────────────────

/**
 * ファイルインポートの全工程をオーケストレーションする。
 */
export async function orchestrateImport(
  files: FileList | File[],
  settings: AppSettings,
  currentMonthData: MonthlyData | null,
  effects: ImportSideEffects,
  onProgress?: ProgressCallback,
  overrideType?: DataType,
): Promise<MonthlyImportResult> {
  // processDroppedFiles は infrastructure 層で ImportedData を要求する（Phase H で移行予定）
  const legacyCurrentData = currentMonthData
    ? toLegacyImportedData({ current: currentMonthData, prevYear: null })
    : createEmptyImportedData()
  const {
    summary,
    data: processedData,
    detectedYearMonth,
    monthPartitions,
  } = await processDroppedFiles(files, settings, legacyCurrentData, onProgress, overrideType)

  if (summary.successCount === 0) {
    return {
      summary,
      finalData: null,
      pendingDiff: null,
      detectedMaxDay: 0,
      validationMessages: null,
      detectedYearMonth: null,
    }
  }

  // 設定を更新用にコピー
  let effectiveSettings = settings
  if (detectedYearMonth) {
    effectiveSettings = {
      ...settings,
      targetYear: detectedYearMonth.year,
      targetMonth: detectedYearMonth.month,
    }
  }

  // インポートされたデータ種別を特定
  const importedTypes = new Set<string>(
    summary.results
      .filter((r): r is typeof r & { type: DataType } => r.ok && r.type !== null)
      .map((r) => r.type),
  )

  // 原本ファイルを保存（fire-and-forget）
  const { targetYear: saveYear, targetMonth: saveMonth } = effectiveSettings
  const fileArray = Array.from(files)
  for (let i = 0; i < summary.results.length; i++) {
    const result = summary.results[i]
    if (result.ok && result.type && fileArray[i]) {
      effects
        .saveRawFile(
          saveYear,
          saveMonth,
          result.type,
          fileArray[i],
          result.filename,
          result.relativePath,
        )
        .catch((e: unknown) => {
          console.warn('[ImportOrchestrator] saveRawFile failed:', e)
        })
    }
  }

  // processDroppedFiles の結果を月別 MonthlyData に変換
  const batch = toMonthlyImportBatch(
    processedData,
    monthPartitions,
    summary,
    detectedYearMonth ?? null,
  )
  const isMultiMonth = batch.months.size > 1

  if (isMultiMonth) {
    return orchestrateMultiMonth(
      batch,
      effectiveSettings,
      importedTypes,
      effects,
      detectedYearMonth ?? null,
    )
  }

  // 単月: batch から当月の MonthlyData を取得（successCount > 0 なので必ず存在）
  const targetKey = `${effectiveSettings.targetYear}-${effectiveSettings.targetMonth}`
  const incomingMonth = batch.months.get(targetKey) ?? [...batch.months.values()][0]!

  return orchestrateSingleMonth(
    incomingMonth,
    monthPartitions,
    effectiveSettings,
    importedTypes,
    summary,
    effects,
    detectedYearMonth ?? null,
  )
}

/**
 * 差分確認結果を適用し、最終データを返す。
 */
export async function resolveImportDiff(
  pending: MonthlyPendingDiffCheck,
  action: 'overwrite' | 'keep-existing',
  settings: AppSettings,
  effects: ImportSideEffects,
): Promise<MonthlyResolveDiffResult> {
  if (pending.incomingByMonth.size > 1) {
    return resolveMultiMonthDiff(pending, action, settings, effects)
  }

  return resolveSingleMonthDiff(pending, action, settings, effects)
}
