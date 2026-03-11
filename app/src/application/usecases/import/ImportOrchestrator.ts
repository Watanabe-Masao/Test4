/**
 * ImportOrchestrator — インポートのビジネスロジック
 *
 * useImport.ts から抽出した純粋なオーケストレーション層。
 * React 非依存。テスト可能。
 */
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
import {
  processDroppedFiles,
  validateImportedData,
  extractRecordMonths,
  filterDataForMonth,
} from './FileImportService'
import type { ImportSummary, MonthPartitions, ProgressCallback } from './FileImportService'
import { buildMonthData, mergeInsertsOnly, DEFAULT_MERGE_ACTION } from './importDataMerge'
import type { DataRepository } from '@/domain/repositories'

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
  /** state に反映すべきデータ（差分確認保留時は null） */
  readonly finalData: ImportedData | null
  /** 差分確認が必要な場合の保留情報 */
  readonly pendingDiff: PendingDiffCheck | null
  /** データ末日検出値（0以下なら未検出） */
  readonly detectedMaxDay: number
  /** バリデーションメッセージ */
  readonly validationMessages: ReturnType<typeof validateImportedData> | null
  /** 検出された年月（設定更新用） */
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
 * React のステート管理は呼び出し元（useImport）に委ねる。
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

// ─── 内部関数 ────────────────────────────────────────────

async function orchestrateMultiMonth(
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

async function orchestrateSingleMonth(
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

async function resolveMultiMonthDiff(
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

async function resolveSingleMonthDiff(
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

// ─── ヘルパー ────────────────────────────────────────────

function saveSummaryCache(
  data: ImportedData,
  year: number,
  month: number,
  repo: DataRepository,
): void {
  if (!repo.isAvailable()) return
  try {
    const daysInMonth = getDaysInMonth(year, month)
    const cache = buildStoreDaySummaryCache(data, daysInMonth)
    repo.saveSummaryCache(cache, year, month).catch((e) => {
      console.warn('[ImportOrchestrator] saveSummaryCache failed:', e)
    })
  } catch (e) {
    console.warn('[ImportOrchestrator] buildStoreDaySummaryCache failed:', e)
  }
}

function saveImportHistory(
  summary: ImportSummary,
  year: number,
  month: number,
  repo: DataRepository,
): void {
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
    console.error('[ImportOrchestrator] saveImportHistory failed:', e)
  })
}
