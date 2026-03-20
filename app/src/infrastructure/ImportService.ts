/**
 * ファイルインポートオーケストレーション
 *
 * バッチインポートの全体フローを管理する。
 * 個々のファイル処理は ImportDataProcessor に委譲する。
 * 型定義・パーティション操作は importTypes.ts に分割済み。
 */
import type { DataType, AppSettings, ImportedData } from '@/domain/models/storeTypes'
import { readTabularFile } from './fileImport/tabularReader'
import { detectFileType, getDataTypeName } from './fileImport/FileTypeDetector'
import { ImportError } from './fileImport/errors'
import { ImportSchemaError } from './fileImport/importSchemas'
import { datasetRegistry } from './storage/datasetRegistry'
import { murmurhash3 } from '@/domain/utilities/hash'
import { processFileData, normalizeRecordStoreIds, countDataRecords } from './ImportDataProcessor'
import {
  createEmptyMonthPartitions,
  detectYearMonthFromPartitionsOrRecords,
  mergeRecordPartitions,
  mergeMapPartitions,
} from './importTypes'
import type {
  FileImportResult,
  ImportSummary,
  ProgressCallback,
  MonthPartitions,
} from './importTypes'

// ─── Re-exports（後方互換） ─────────────────────────
export { processFileData, normalizeRecordStoreIds, countDataRecords } from './ImportDataProcessor'
export type { ProcessFileResult } from './ImportDataProcessor'
export type { ImportedData } from '@/domain/models/storeTypes'
export { createEmptyImportedData } from '@/domain/models/storeTypes'
export {
  createEmptyMonthPartitions,
  detectYearMonthFromPartitionsOrRecords,
  mergeRecordPartitions,
  mergeMapPartitions,
} from './importTypes'
export type {
  FileImportResult,
  ImportSummary,
  ProgressCallback,
  MonthPartitions,
} from './importTypes'

// ─── 公開関数 ────────────────────────────────────────

/**
 * ファイルを読み込みデータ種別を判定する
 *
 * @param parseFile - Worker ベースのパース関数（省略時は readTabularFile を使用）
 */
export async function readAndDetect(
  file: File,
  parseFile?: (file: File) => Promise<unknown[][]>,
): Promise<{ rows: unknown[][]; type: DataType; typeName: string }> {
  const rows = parseFile ? await parseFile(file) : await readTabularFile(file)
  if (rows.length === 0) {
    throw new ImportError('ファイルが空です', 'INVALID_FORMAT', file.name)
  }

  const detection = detectFileType(file.name, rows)
  if (!detection.type) {
    throw new ImportError('ファイルの種別を判定できませんでした', 'UNKNOWN_TYPE', file.name)
  }

  return {
    rows,
    type: detection.type,
    typeName: detection.ruleName ?? getDataTypeName(detection.type),
  }
}

/**
 * 複数ファイルをバッチインポートする
 *
 * @param parseFile - Worker ベースのパース関数（省略時は readTabularFile を使用）
 */
export async function processDroppedFiles(
  files: FileList | File[],
  appSettings: AppSettings,
  currentData: ImportedData,
  onProgress?: ProgressCallback,
  overrideType?: DataType,
  parseFile?: (file: File) => Promise<unknown[][]>,
): Promise<{
  summary: ImportSummary
  data: ImportedData
  detectedYearMonth?: { year: number; month: number }
  monthPartitions: MonthPartitions
}> {
  const fileArray = Array.from(files)
  const results: FileImportResult[] = []
  let data = currentData
  let effectiveSettings = appSettings
  let detectedYearMonth: { year: number; month: number } | undefined
  let mp = createEmptyMonthPartitions()

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i]
    onProgress?.(i + 1, fileArray.length, file.name)

    try {
      let rows: unknown[][]
      let type: DataType
      let typeName: string

      if (overrideType) {
        rows = parseFile ? await parseFile(file) : await readTabularFile(file)
        if (rows.length === 0) {
          throw new ImportError('ファイルが空です', 'INVALID_FORMAT', file.name)
        }
        type = overrideType
        typeName = getDataTypeName(overrideType)
      } else {
        const detected = await readAndDetect(file, parseFile)
        rows = detected.rows
        type = detected.type
        typeName = detected.typeName
      }

      // 重複インポート検知: ファイル内容のハッシュで同一ファイルの再インポートを検出
      const fileHash = String(murmurhash3(JSON.stringify(rows)))
      let duplicateWarning: string | undefined
      if (detectedYearMonth) {
        try {
          const isDup = await datasetRegistry.isDuplicate(
            detectedYearMonth.year,
            detectedYearMonth.month,
            type,
            fileHash,
          )
          if (isDup) {
            duplicateWarning = `${file.name} は既にインポート済みの同一データです（スキップされません）`
          }
        } catch {
          // IndexedDB 未対応環境では無視
        }
      }

      const result = processFileData(type, rows, file.name, data, effectiveSettings)
      data = result.data

      // ハッシュをレジストリに登録
      const ym = result.detectedYearMonth ?? detectedYearMonth
      if (ym) {
        datasetRegistry
          .updateFileHash(ym.year, ym.month, type, fileHash)
          .catch((err) => console.warn('[datasetRegistry] ハッシュ登録失敗:', err))
      }

      if (result.detectedYearMonth && !detectedYearMonth) {
        detectedYearMonth = result.detectedYearMonth
        effectiveSettings = {
          ...effectiveSettings,
          targetYear: detectedYearMonth.year,
          targetMonth: detectedYearMonth.month,
        }
      }

      // パーティション情報をマージ
      if (result.partitions) {
        const p = result.partitions
        if (p.purchase) mp = { ...mp, purchase: mergeRecordPartitions(mp.purchase, p.purchase) }
        if (p.flowers) mp = { ...mp, flowers: mergeRecordPartitions(mp.flowers, p.flowers) }
        if (p.directProduce)
          mp = { ...mp, directProduce: mergeRecordPartitions(mp.directProduce, p.directProduce) }
        if (p.interStoreIn)
          mp = { ...mp, interStoreIn: mergeRecordPartitions(mp.interStoreIn, p.interStoreIn) }
        if (p.interStoreOut)
          mp = { ...mp, interStoreOut: mergeRecordPartitions(mp.interStoreOut, p.interStoreOut) }
        if (p.consumables)
          mp = { ...mp, consumables: mergeRecordPartitions(mp.consumables, p.consumables) }
        if (p.budget) mp = { ...mp, budget: mergeMapPartitions(mp.budget, p.budget) }
      }

      // レコード数をサマリーに含める（バリデーション用途）
      const rowCount = countDataRecords(result.data, type)
      const rp = file.webkitRelativePath || undefined
      results.push({
        ok: true,
        filename: file.name,
        relativePath: rp,
        type,
        typeName,
        rowCount,
        warnings: duplicateWarning
          ? [...(result.warnings ?? []), duplicateWarning]
          : result.warnings,
      })
    } catch (err) {
      const message =
        err instanceof ImportError || err instanceof ImportSchemaError
          ? err.message
          : 'ファイルの読み込みに失敗しました'
      const rp = file.webkitRelativePath || undefined
      results.push({
        ok: false,
        filename: file.name,
        relativePath: rp,
        type: null,
        typeName: null,
        error: message,
      })
    }
  }

  const successCount = results.filter((r) => r.ok).length
  const failureCount = results.filter((r) => !r.ok).length

  // 全ファイル処理後、レコード系データの storeId を正規化する。
  data = normalizeRecordStoreIds(data)

  // classifiedSales/categoryTimeSales が含まれないインポートでは
  // detectedYearMonth が未設定のまま。パーティションキーから年月を検出する。
  if (!detectedYearMonth) {
    detectedYearMonth = detectYearMonthFromPartitionsOrRecords(data, mp)
  }

  return {
    summary: { results, successCount, failureCount },
    data,
    detectedYearMonth,
    monthPartitions: mp,
  }
}
