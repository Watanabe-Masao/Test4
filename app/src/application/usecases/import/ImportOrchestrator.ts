/**
 * ImportOrchestrator — インポートのビジネスロジック（ファサード）
 *
 * 単月処理は singleMonthImport.ts、複数月処理は multiMonthImport.ts に委譲。
 */
import type { DiffResult } from '@/domain/models/analysis'
import type { AppSettings, DataType, ImportedData } from '@/domain/models/storeTypes'
import { processDroppedFiles, validateImportedData, extractRecordMonths } from './FileImportService'
import type { ImportSummary, MonthPartitions, ProgressCallback } from './FileImportService'
import type { DataRepository } from '@/domain/repositories'
import { orchestrateSingleMonth, resolveSingleMonthDiff } from './singleMonthImport'
import { orchestrateMultiMonth, resolveMultiMonthDiff } from './multiMonthImport'

// ─── 型定義 ──────────────────────────────────────────────

/** 差分確認の保留情報（React非依存） */
export interface PendingDiffCheck {
  readonly diffResult: DiffResult
  readonly incomingData: ImportedData
  readonly existingData: ImportedData
  readonly importedTypes: ReadonlySet<string>
  readonly summary: ImportSummary
  readonly monthPartitions: MonthPartitions
  readonly multiMonth?: {
    readonly months: readonly { year: number; month: number }[]
    readonly existingByMonth: ReadonlyMap<string, ImportedData>
  }
}

/** importFiles の結果 */
export interface ImportResult {
  readonly summary: ImportSummary
  readonly finalData: ImportedData | null
  readonly pendingDiff: PendingDiffCheck | null
  readonly detectedMaxDay: number
  readonly validationMessages: ReturnType<typeof validateImportedData> | null
  readonly detectedYearMonth: { year: number; month: number } | null
}

/** resolveDiff の結果 */
export interface ResolveDiffResult {
  readonly finalData: ImportedData
  readonly detectedMaxDay: number
  readonly validationMessages: ReturnType<typeof validateImportedData>
}

/** Orchestrator が必要とする外部操作（副作用の注入点） */
export interface ImportSideEffects {
  readonly repo: DataRepository
  readonly saveRawFile: (
    year: number,
    month: number,
    dataType: DataType,
    file: File | Blob,
    filename?: string,
    relativePath?: string,
  ) => Promise<void>
}

// ─── ImportOrchestrator ──────────────────────────────────

/**
 * ファイルインポートの全工程をオーケストレーションする。
 */
export async function orchestrateImport(
  files: FileList | File[],
  settings: AppSettings,
  currentData: ImportedData,
  effects: ImportSideEffects,
  onProgress?: ProgressCallback,
  overrideType?: DataType,
): Promise<ImportResult> {
  const {
    summary,
    data: processedData,
    detectedYearMonth,
    monthPartitions,
  } = await processDroppedFiles(files, settings, currentData, onProgress, overrideType)

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
        .catch((e) => {
          console.warn('[ImportOrchestrator] saveRawFile failed:', e)
        })
    }
  }

  // 複数月にまたがるデータかチェック
  const recordMonths = extractRecordMonths(processedData, monthPartitions)
  const isMultiMonth = recordMonths.length > 1

  if (isMultiMonth) {
    return orchestrateMultiMonth(
      processedData,
      recordMonths,
      monthPartitions,
      effectiveSettings,
      importedTypes,
      summary,
      effects,
      detectedYearMonth ?? null,
    )
  }

  return orchestrateSingleMonth(
    processedData,
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
  pending: PendingDiffCheck,
  action: 'overwrite' | 'keep-existing',
  settings: AppSettings,
  effects: ImportSideEffects,
): Promise<ResolveDiffResult> {
  const { incomingData, existingData, importedTypes, summary, monthPartitions, multiMonth } =
    pending

  if (multiMonth) {
    return resolveMultiMonthDiff(
      incomingData,
      multiMonth,
      monthPartitions,
      action,
      settings,
      summary,
      effects,
    )
  }

  return resolveSingleMonthDiff(
    incomingData,
    existingData,
    importedTypes,
    action,
    settings,
    summary,
    effects,
  )
}
