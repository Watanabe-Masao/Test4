/**
 * ファイルインポートオーケストレーション
 *
 * バッチインポートの全体フローを管理する。
 * 個々のファイル処理は ImportDataProcessor に委譲する。
 * 型定義・パーティション操作は importTypes.ts に分割済み。
 *
 * @responsibility R:adapter
 */
import type { DataType, AppSettings } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type {
  ImportExecution,
  ImportedArtifact,
  MonthAttribution,
} from '@/domain/models/ImportProvenance'
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

// ─── Re-exports ─────────────────────────
export { processFileData, normalizeRecordStoreIds, countDataRecords } from './ImportDataProcessor'
export type { ProcessFileResult } from './ImportDataProcessor'
export type { MonthlyData } from '@/domain/models/MonthlyData'
export { createEmptyMonthlyData } from '@/domain/models/MonthlyData'
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
export type {
  ImportExecution,
  ImportedArtifact,
  MonthAttribution,
} from '@/domain/models/ImportProvenance'

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
  currentData: MonthlyData,
  onProgress?: ProgressCallback,
  overrideType?: DataType,
  parseFile?: (file: File) => Promise<unknown[][]>,
): Promise<{
  summary: ImportSummary
  data: MonthlyData
  detectedYearMonth?: { year: number; month: number }
  monthPartitions: MonthPartitions
  execution: ImportExecution
}> {
  const fileArray = Array.from(files)
  const results: FileImportResult[] = []
  const artifacts: ImportedArtifact[] = []
  const importId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const importedAt = new Date().toISOString()
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

      // 差分ベース importedCount: processFileData の前後で件数を比較
      const beforeCount = countDataRecords(data, type)
      const result = processFileData(type, rows, file.name, data, effectiveSettings)
      data = result.data
      const afterCount = countDataRecords(result.data, type)
      const importedCount = Math.max(0, afterCount - beforeCount)

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

      // month attribution を構築
      const attributions: MonthAttribution[] = []
      if (result.partitions) {
        // パーティションキーから寄与月を取得
        const monthKeys = new Set<string>()
        const p = result.partitions
        if (p.purchase) for (const mk of Object.keys(p.purchase)) monthKeys.add(mk)
        if (p.flowers) for (const mk of Object.keys(p.flowers)) monthKeys.add(mk)
        if (p.directProduce) for (const mk of Object.keys(p.directProduce)) monthKeys.add(mk)
        if (p.interStoreIn) for (const mk of Object.keys(p.interStoreIn)) monthKeys.add(mk)
        if (p.interStoreOut) for (const mk of Object.keys(p.interStoreOut)) monthKeys.add(mk)
        if (p.consumables) for (const mk of Object.keys(p.consumables)) monthKeys.add(mk)
        if (p.budget) for (const mk of Object.keys(p.budget)) monthKeys.add(mk)
        for (const mk of monthKeys) {
          const parts = mk.split('-')
          if (parts.length === 2) {
            attributions.push({
              year: Number(parts[0]),
              month: Number(parts[1]),
              importedCount, // TODO: per-month count（Phase 3 で精緻化）
              isDuplicate: false,
            })
          }
        }
      }
      if (attributions.length === 0 && ym) {
        attributions.push({
          year: ym.year,
          month: ym.month,
          importedCount,
          isDuplicate: !!duplicateWarning,
        })
      }

      const artifactId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `artifact-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`

      const rp = file.webkitRelativePath || undefined
      results.push({
        ok: true,
        filename: file.name,
        relativePath: rp,
        type,
        typeName,
        rowCount: importedCount,
        warnings: duplicateWarning
          ? [...(result.warnings ?? []), duplicateWarning]
          : result.warnings,
      })

      artifacts.push({
        artifactId,
        filename: file.name,
        relativePath: rp,
        dataType: type,
        hash: fileHash,
        size: file.size,
        ok: true,
        warnings: duplicateWarning
          ? [...(result.warnings ?? []), duplicateWarning]
          : result.warnings,
        attributions,
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

      artifacts.push({
        artifactId: `artifact-err-${Date.now()}-${i}`,
        filename: file.name,
        relativePath: rp,
        dataType: overrideType ?? ('unknown' as DataType),
        hash: '',
        size: file.size,
        ok: false,
        error: message,
        attributions: [],
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

  const execution: ImportExecution = {
    importId,
    importedAt,
    artifacts,
  }

  return {
    summary: { results, successCount, failureCount },
    data,
    detectedYearMonth,
    monthPartitions: mp,
    execution,
  }
}
