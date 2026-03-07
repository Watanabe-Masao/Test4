/**
 * ファイルインポートオーケストレーション
 *
 * バッチインポートの全体フローを管理する。
 * 個々のファイル処理は ImportDataProcessor に委譲する。
 */
import type {
  DataType,
  AppSettings,
  ImportedData,
  PurchaseData,
  SpecialSalesData,
  TransferData,
  CostInclusionData,
  BudgetData,
} from '@/domain/models'
import { readTabularFile } from './fileImport/tabularReader'
import { detectFileType, getDataTypeName } from './fileImport/FileTypeDetector'
import { ImportError } from './fileImport/errors'
import { ImportSchemaError } from './fileImport/importSchemas'
import { datasetRegistry } from './storage/datasetRegistry'
import { murmurhash3 } from '@/domain/utilities/hash'
import { processFileData, normalizeRecordStoreIds, countDataRecords } from './ImportDataProcessor'

// ─── Re-exports（後方互換） ─────────────────────────
export { processFileData, normalizeRecordStoreIds, countDataRecords } from './ImportDataProcessor'
export type { ProcessFileResult } from './ImportDataProcessor'
export type { ImportedData } from '@/domain/models'
export { createEmptyImportedData } from '@/domain/models'

// ─── 型定義 ──────────────────────────────────────────

/** 単一ファイルのインポート結果 */
export interface FileImportResult {
  readonly ok: boolean
  readonly filename: string
  /** フォルダ選択時の相対パス（webkitRelativePath）。監査・重複判定に使用 */
  readonly relativePath?: string
  readonly type: DataType | null
  readonly typeName: string | null
  readonly error?: string
  readonly rowCount?: number
  readonly skippedRows?: readonly string[]
  /** プロセッサの警告（ヘッダ形式不正、0件結果など） */
  readonly warnings?: readonly string[]
}

/** バッチインポートの全体結果 */
export interface ImportSummary {
  readonly results: readonly FileImportResult[]
  readonly successCount: number
  readonly failureCount: number
  readonly skippedFiles?: readonly string[]
}

/** 進捗コールバック */
export type ProgressCallback = (current: number, total: number, filename: string) => void

/**
 * StoreDayIndex 系データの年月パーティション。
 * キーは monthKey ("YYYY-M") 形式。
 */
export interface MonthPartitions {
  readonly purchase: Record<string, PurchaseData>
  readonly flowers: Record<string, SpecialSalesData>
  readonly directProduce: Record<string, SpecialSalesData>
  readonly interStoreIn: Record<string, TransferData>
  readonly interStoreOut: Record<string, TransferData>
  readonly consumables: Record<string, CostInclusionData>
  readonly budget: Record<string, ReadonlyMap<string, BudgetData>>
}

/** 空の MonthPartitions */
export function createEmptyMonthPartitions(): MonthPartitions {
  return {
    purchase: {},
    flowers: {},
    directProduce: {},
    interStoreIn: {},
    interStoreOut: {},
    consumables: {},
    budget: {},
  }
}

// ─── 内部ヘルパー ────────────────────────────────────

/**
 * パーティションキーやレコードの year/month から年月を検出する。
 * classifiedSales/categoryTimeSales が含まれないインポートで
 * detectedYearMonth が未設定のときに使用するフォールバック。
 */
function detectYearMonthFromPartitionsOrRecords(
  data: ImportedData,
  mp: MonthPartitions,
): { year: number; month: number } | undefined {
  const allKeys = new Set<string>()
  for (const mk of Object.keys(mp.purchase)) allKeys.add(mk)
  for (const mk of Object.keys(mp.flowers)) allKeys.add(mk)
  for (const mk of Object.keys(mp.directProduce)) allKeys.add(mk)
  for (const mk of Object.keys(mp.interStoreIn)) allKeys.add(mk)
  for (const mk of Object.keys(mp.interStoreOut)) allKeys.add(mk)
  for (const mk of Object.keys(mp.consumables)) allKeys.add(mk)
  for (const mk of Object.keys(mp.budget)) allKeys.add(mk)

  for (const rec of data.classifiedSales.records) {
    allKeys.add(`${rec.year}-${rec.month}`)
  }
  for (const rec of data.categoryTimeSales.records) {
    allKeys.add(`${rec.year}-${rec.month}`)
  }

  if (allKeys.size === 0) return undefined

  const sorted = [...allKeys].sort((a, b) => {
    const [ay, am] = a.split('-').map(Number)
    const [by, bm] = b.split('-').map(Number)
    return ay !== by ? ay - by : am - bm
  })

  const [year, month] = sorted[0].split('-').map(Number)
  if (isNaN(year) || isNaN(month)) return undefined
  return { year, month }
}

/** flat record パーティションをマージ（同月の場合は concat） */
function mergeRecordPartitions<T>(
  existing: Record<string, { readonly records: readonly T[] }>,
  incoming: Record<string, { readonly records: readonly T[] }>,
): Record<string, { readonly records: readonly T[] }> {
  const result = { ...existing }
  for (const [mk, d] of Object.entries(incoming)) {
    if (result[mk]) {
      result[mk] = { records: [...result[mk].records, ...d.records] }
    } else {
      result[mk] = d
    }
  }
  return result
}

/** Map パーティションをマージ */
function mergeMapPartitions<K, V>(
  existing: Record<string, ReadonlyMap<K, V>>,
  incoming: Record<string, ReadonlyMap<K, V>>,
): Record<string, ReadonlyMap<K, V>> {
  const result = { ...existing }
  for (const [mk, d] of Object.entries(incoming)) {
    if (result[mk]) {
      const merged = new Map(result[mk])
      for (const [k, v] of d) merged.set(k, v)
      result[mk] = merged
    } else {
      result[mk] = d
    }
  }
  return result
}

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
