import type { BudgetData } from '@/domain/models/record'
import type { DataType, AppSettings } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { ImportSummary } from '@/domain/models/ImportResult'
import type { ImportExecution } from '@/domain/models/ImportProvenance'
import { processDroppedFiles as processDroppedFilesImpl } from '@/infrastructure/ImportService'
import type { MonthPartitions } from '@/infrastructure/ImportService'
import { monthKey } from '@/infrastructure/fileImport/dateParser'

// Re-export partition types
export type { MonthPartitions } from '@/infrastructure/ImportService'
export { createEmptyMonthPartitions } from '@/infrastructure/ImportService'
export type {
  ImportExecution,
  ImportedArtifact,
  MonthAttribution,
} from '@/infrastructure/ImportService'

// ─── Types ───────────────────────────────────────────────
// 型定義は domain/models/ImportResult.ts に移動済み（@guard A4）。
// 後方互換のため re-export を維持。
export type { FileImportResult, ImportSummary } from '@/domain/models/ImportResult'

/** 進捗コールバック */
export type ProgressCallback = (current: number, total: number, filename: string) => void

// ─── Validation (re-export from importValidation) ────────

export { validateImportData, hasValidationErrors } from './importValidation'

// ─── File import (delegates to infrastructure) ───────────

/**
 * 複数ファイルをバッチインポートする
 * Infrastructure層の実装に委譲する
 */
export async function processDroppedFiles(
  files: FileList | File[],
  appSettings: AppSettings,
  currentData: MonthlyData,
  onProgress?: ProgressCallback,
  overrideType?: DataType,
): Promise<{
  summary: ImportSummary
  data: MonthlyData
  detectedYearMonth?: { year: number; month: number }
  monthPartitions: MonthPartitions
  execution: ImportExecution
}> {
  return processDroppedFilesImpl(files, appSettings, currentData, onProgress, overrideType)
}

// ─── Multi-month utilities ──────────────────────────────────

/**
 * インポートデータに含まれる年月の一覧を返す。
 *
 * 月の検出ソース:
 * - classifiedSales / categoryTimeSales のレコード（year/month フィールド）
 * - パーティションキー（今回インポートされたデータの年月）
 *
 * 注意: フラットレコード系（purchase, flowers 等）の data.records からは
 * 年月を収集しない。processedData には currentData から継承されたレコードが
 * 含まれるため、実際にインポートされていない月まで検出してしまい、
 * マルチ月パスで他月のデータが上書きされるバグの原因になる。
 * パーティションキーは今回のインポートで実際に処理されたデータの年月のみを
 * 反映するため、正確なソースとして使用する。
 */
export function extractRecordMonths(
  data: MonthlyData,
  partitions?: MonthPartitions,
): readonly { year: number; month: number }[] {
  const seen = new Set<string>()
  const result: { year: number; month: number }[] = []

  const addMonth = (year: number, month: number) => {
    const key = `${year}-${month}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ year, month })
    }
  }

  for (const rec of data.classifiedSales.records) {
    addMonth(rec.year, rec.month)
  }

  for (const rec of data.categoryTimeSales.records) {
    addMonth(rec.year, rec.month)
  }

  // パーティションキーから年月を収集（今回インポートされたデータのみ）
  if (partitions) {
    const allPartitionKeys = new Set<string>()
    for (const mk of Object.keys(partitions.purchase)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.flowers)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.directProduce)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.interStoreIn)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.interStoreOut)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.consumables)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.budget)) allPartitionKeys.add(mk)

    for (const mk of allPartitionKeys) {
      const parts = mk.split('-')
      if (parts.length === 2) {
        addMonth(Number(parts[0]), Number(parts[1]))
      }
    }
  }

  result.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
  return result
}

/**
 * DatedRecord 系レコードを年月でフィルタする。
 * パーティションが存在する場合はパーティションから取得し、
 * 存在しない場合はレコードの year/month フィールドでフィルタする。
 *
 * 旧実装ではパーティション未設定の種別は data をそのまま通過させていたため、
 * マルチ月インポート時に他月のレコードが漏れるバグがあった。
 */
function filterDatedRecords<
  T extends { readonly records: readonly { year: number; month: number }[] },
>(partition: Record<string, T> | undefined, data: T, mk: string, year: number, month: number): T {
  const emptyRecords = { records: [] } as unknown as T
  if (partition && Object.keys(partition).length > 0) {
    return partition[mk] ?? emptyRecords
  }
  // パーティションが無い場合でも year/month でフィルタして他月データの漏れを防ぐ
  const filtered = data.records.filter((r) => r.year === year && r.month === month)
  return filtered.length === data.records.length ? data : ({ records: filtered } as unknown as T)
}

/**
 * MonthlyData から指定年月のレコードのみを含む MonthlyData を返す。
 * 全レコード系データを年月で厳密フィルタする。
 * - classifiedSales / categoryTimeSales: レコードの year/month で常にフィルタ
 * - DatedRecord 系 (purchase 等): パーティション優先、無ければ year/month フィルタ
 * - budget: パーティション優先、無ければそのまま維持（year/month フィールドを持たないため）
 */
export function filterDataForMonth(
  data: MonthlyData,
  year: number,
  month: number,
  partitions?: MonthPartitions,
): MonthlyData {
  const mk = monthKey(year, month)

  const base: MonthlyData = {
    ...data,
    classifiedSales: {
      records: data.classifiedSales.records.filter((r) => r.year === year && r.month === month),
    },
    categoryTimeSales: {
      records: data.categoryTimeSales.records.filter((r) => r.year === year && r.month === month),
    },
  }

  if (!partitions) {
    // パーティション情報なし: DatedRecord 系も year/month でフィルタ
    return {
      ...base,
      purchase: filterDatedRecords(undefined, data.purchase, mk, year, month),
      flowers: filterDatedRecords(undefined, data.flowers, mk, year, month),
      directProduce: filterDatedRecords(undefined, data.directProduce, mk, year, month),
      interStoreIn: filterDatedRecords(undefined, data.interStoreIn, mk, year, month),
      interStoreOut: filterDatedRecords(undefined, data.interStoreOut, mk, year, month),
      consumables: filterDatedRecords(undefined, data.consumables, mk, year, month),
    }
  }

  return {
    ...base,
    purchase: filterDatedRecords(partitions.purchase, data.purchase, mk, year, month),
    flowers: filterDatedRecords(partitions.flowers, data.flowers, mk, year, month),
    directProduce: filterDatedRecords(
      partitions.directProduce,
      data.directProduce,
      mk,
      year,
      month,
    ),
    interStoreIn: filterDatedRecords(partitions.interStoreIn, data.interStoreIn, mk, year, month),
    interStoreOut: filterDatedRecords(
      partitions.interStoreOut,
      data.interStoreOut,
      mk,
      year,
      month,
    ),
    consumables: filterDatedRecords(partitions.consumables, data.consumables, mk, year, month),
    budget:
      Object.keys(partitions.budget).length > 0
        ? (partitions.budget[mk] ?? new Map<string, BudgetData>())
        : data.budget,
  }
}
