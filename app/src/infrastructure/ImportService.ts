import type { DataType, AppSettings, ImportedData, PurchaseData, SpecialSalesData, TransferData, ConsumableData, BudgetData } from '@/domain/models'
import { mergeClassifiedSalesData } from '@/domain/models'
import { readTabularFile } from './fileImport/tabularReader'
import { detectFileType, getDataTypeName } from './fileImport/FileTypeDetector'
import { detectYearMonth } from './fileImport/dateParser'
import { ImportError } from './fileImport/errors'
import { validateRawRows, ImportSchemaError, STRUCTURAL_RULES } from './fileImport/importSchemas'
import {
  processPurchase,
  extractStoresFromPurchase,
  extractSuppliersFromPurchase,
} from './dataProcessing/PurchaseProcessor'
import {
  processClassifiedSales,
  extractStoresFromClassifiedSales,
  detectYearMonthFromClassifiedSales,
} from './dataProcessing/ClassifiedSalesProcessor'
import { processSettings } from './dataProcessing/SettingsProcessor'
import { processBudget } from './dataProcessing/BudgetProcessor'
import { processInterStoreIn, processInterStoreOut } from './dataProcessing/TransferProcessor'
import { processSpecialSales } from './dataProcessing/SpecialSalesProcessor'
import { processConsumables, mergeConsumableData, mergePartitionedConsumables } from './dataProcessing/ConsumableProcessor'
import { processCategoryTimeSales, mergeCategoryTimeSalesData } from './dataProcessing/CategoryTimeSalesProcessor'
import { processDepartmentKpi, mergeDepartmentKpiData } from './dataProcessing/DepartmentKpiProcessor'

/** 単一ファイルのインポート結果 */
export interface FileImportResult {
  readonly ok: boolean
  readonly filename: string
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

// Re-export from domain for backward compatibility
export type { ImportedData } from '@/domain/models'
export { createEmptyImportedData } from '@/domain/models'

/**
 * StoreDayRecord 系データの年月パーティション。
 * キーは monthKey ("YYYY-M") 形式。
 */
export interface MonthPartitions {
  readonly purchase: Record<string, PurchaseData>
  readonly flowers: Record<string, SpecialSalesData>
  readonly directProduce: Record<string, SpecialSalesData>
  readonly interStoreIn: Record<string, TransferData>
  readonly interStoreOut: Record<string, TransferData>
  readonly consumables: Record<string, ConsumableData>
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

// ─── パーティション結合ヘルパー ──────────────────────────

/** 月パーティション済み StoreDayRecord を1つに結合する（全月の union） */
function combineStoreDayPartitions<T>(partitioned: Record<string, { readonly [storeId: string]: { readonly [day: number]: T } }>): { readonly [storeId: string]: { readonly [day: number]: T } } {
  const combined: Record<string, Record<number, T>> = {}
  for (const monthData of Object.values(partitioned)) {
    for (const [storeId, days] of Object.entries(monthData)) {
      if (!combined[storeId]) combined[storeId] = {}
      for (const [dayStr, entry] of Object.entries(days)) {
        combined[storeId][Number(dayStr)] = entry
      }
    }
  }
  return combined
}

/** 月パーティション済み Map を1つに結合する */
function combineMapPartitions<K, V>(partitioned: Record<string, ReadonlyMap<K, V>>): Map<K, V> {
  const combined = new Map<K, V>()
  for (const monthMap of Object.values(partitioned)) {
    for (const [k, v] of monthMap) {
      combined.set(k, v)
    }
  }
  return combined
}

/** StoreDayRecord パーティションをマージ（同月の場合は上書き） */
function mergeStoreDayPartitions<T>(
  existing: Record<string, { readonly [storeId: string]: { readonly [day: number]: T } }>,
  incoming: Record<string, { readonly [storeId: string]: { readonly [day: number]: T } }>,
): Record<string, { readonly [storeId: string]: { readonly [day: number]: T } }> {
  const result = { ...existing }
  for (const [mk, data] of Object.entries(incoming)) {
    if (result[mk]) {
      const merged: Record<string, Record<number, T>> = {}
      for (const [storeId, days] of Object.entries(result[mk])) {
        merged[storeId] = { ...days }
      }
      for (const [storeId, days] of Object.entries(data)) {
        if (!merged[storeId]) merged[storeId] = {}
        for (const [dayStr, entry] of Object.entries(days)) {
          merged[storeId][Number(dayStr)] = entry
        }
      }
      result[mk] = merged
    } else {
      result[mk] = data
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
  for (const [mk, data] of Object.entries(incoming)) {
    if (result[mk]) {
      const merged = new Map(result[mk])
      for (const [k, v] of data) merged.set(k, v)
      result[mk] = merged
    } else {
      result[mk] = data
    }
  }
  return result
}

/**
 * データ種別ごとのレコード数を返す（インポートサマリー用）
 */
function countDataRecords(data: ImportedData, type: DataType): number {
  switch (type) {
    case 'classifiedSales': return data.classifiedSales.records.length
    case 'categoryTimeSales': return data.categoryTimeSales.records.length
    case 'departmentKpi': return data.departmentKpi.records.length
    case 'purchase': return countStoreDayEntries(data.purchase)
    case 'flowers': return countStoreDayEntries(data.flowers)
    case 'directProduce': return countStoreDayEntries(data.directProduce)
    case 'interStoreIn': return countStoreDayEntries(data.interStoreIn)
    case 'interStoreOut': return countStoreDayEntries(data.interStoreOut)
    case 'consumables': return countStoreDayEntries(data.consumables)
    case 'budget': return data.budget.size
    case 'initialSettings': return data.settings.size
    default: return 0
  }
}

/** StoreDayRecord の日別エントリ数を数える */
function countStoreDayEntries(record: { readonly [storeId: string]: { readonly [day: number]: unknown } }): number {
  let count = 0
  for (const days of Object.values(record)) {
    count += Object.keys(days).length
  }
  return count
}

/**
 * ファイルを読み込みデータ種別を判定する
 */
export async function readAndDetect(
  file: File,
): Promise<{ rows: unknown[][]; type: DataType; typeName: string }> {
  const rows = await readTabularFile(file)
  if (rows.length === 0) {
    throw new ImportError('ファイルが空です', 'INVALID_FORMAT', file.name)
  }

  const detection = detectFileType(file.name, rows)
  if (!detection.type) {
    throw new ImportError(
      'ファイルの種別を判定できませんでした',
      'UNKNOWN_TYPE',
      file.name,
    )
  }

  return {
    rows,
    type: detection.type,
    typeName: detection.ruleName ?? getDataTypeName(detection.type),
  }
}

/** processFileData の戻り値 */
export interface ProcessFileResult {
  readonly data: ImportedData
  readonly detectedYearMonth?: { year: number; month: number }
  readonly partitions?: Partial<MonthPartitions>
  /** プロセッサの警告（ヘッダ不正、0件結果など） */
  readonly warnings?: readonly string[]
}

/** データ種別ごとの日付検出開始行 */
const DATE_START_ROW: Partial<Record<DataType, number>> = {
  categoryTimeSales: 3,
}

/**
 * プロセッサの結果が0件の場合、ヘッダ形式に関する警告を生成する。
 * ファイルは構造検査（行数・列数）を通過しているのにデータが読み取れなかった場合、
 * ヘッダの形式が想定と異なっている可能性が高い。
 */
function checkProcessorResult(
  type: DataType,
  resultData: ImportedData,
  rows: readonly unknown[][],
  filename: string,
): string[] {
  const warnings: string[] = []
  const recordCount = countDataRecords(resultData, type)
  const rule = STRUCTURAL_RULES[type]

  if (recordCount === 0 && rows.length > (rule?.minRows ?? 2)) {
    const label = rule?.label ?? type
    warnings.push(
      `${label}のデータ行が1件も読み取れませんでした（${filename}）。ヘッダの形式が想定と異なる可能性があります。`,
    )
  }

  return warnings
}

/**
 * 単一ファイルのデータを処理し、既存のImportedDataにマージする
 */
export function processFileData(
  type: DataType,
  rows: readonly unknown[][],
  filename: string,
  current: ImportedData,
  appSettings: AppSettings,
): ProcessFileResult {
  validateRawRows(type, rows, filename)

  const result = processFileDataInner(type, rows, filename, current, appSettings)

  // 結果検査: プロセッサが0件を返した場合の警告生成
  const warnings = checkProcessorResult(type, result.data, rows, filename)
  if (warnings.length > 0) {
    return { ...result, warnings }
  }
  return result
}

/** processFileData の内部実装（型ごとの処理） */
function processFileDataInner(
  type: DataType,
  rows: readonly unknown[][],
  filename: string,
  current: ImportedData,
  appSettings: AppSettings,
): ProcessFileResult {
  const mutableStores = new Map(current.stores)
  const mutableSuppliers = new Map(current.suppliers)

  const startRow = DATE_START_ROW[type]
  const detectedYearMonth = startRow != null
    ? detectYearMonth(rows, 0, startRow) ?? undefined
    : undefined

  const effectiveMonth = detectedYearMonth?.month ?? appSettings.targetMonth

  switch (type) {
    case 'purchase': {
      const newStores = extractStoresFromPurchase(rows)
      for (const [id, s] of newStores) mutableStores.set(id, s)

      const newSuppliers = extractSuppliersFromPurchase(rows)
      for (const [code, s] of newSuppliers) mutableSuppliers.set(code, s)

      const allStores = new Set(mutableStores.keys())
      const partitioned = processPurchase(rows, allStores)
      const combined = combineStoreDayPartitions(partitioned) as PurchaseData

      return {
        data: {
          ...current,
          stores: mutableStores,
          suppliers: mutableSuppliers,
          purchase: combined,
        },
        partitions: { purchase: partitioned },
      }
    }

    case 'classifiedSales': {
      const newStores = extractStoresFromClassifiedSales(rows)
      for (const [id, s] of newStores) mutableStores.set(id, s)

      // 店舗名→数値ID逆引きマップを構築（コード無しCSV対応）
      const storeNameToId = new Map<string, string>()
      for (const [id, store] of mutableStores) {
        storeNameToId.set(store.name, id)
      }

      const csYearMonth = detectYearMonthFromClassifiedSales(rows)
      const csEffectiveMonth = csYearMonth?.month ?? effectiveMonth
      const result = processClassifiedSales(rows, csEffectiveMonth, storeNameToId)

      // 小計行スキップをログ出力（データ品質の可視化）
      if (result.skippedSubtotalRows && result.skippedSubtotalRows.length > 0) {
        console.info(
          `[ClassifiedSales] ${result.skippedSubtotalRows.length}件の小計/合計行をスキップしました（二重計上防止）`,
        )
      }

      return {
        data: {
          ...current,
          stores: mutableStores,
          classifiedSales: mergeClassifiedSalesData(current.classifiedSales, result),
        },
        detectedYearMonth: csYearMonth ?? undefined,
      }
    }

    case 'initialSettings':
      return { data: { ...current, settings: processSettings(rows) } }

    case 'budget': {
      const partitioned = processBudget(rows)
      const combined = combineMapPartitions(partitioned)
      return {
        data: { ...current, budget: combined },
        partitions: { budget: partitioned },
      }
    }

    case 'interStoreIn': {
      const partitioned = processInterStoreIn(rows)
      const combined = combineStoreDayPartitions(partitioned) as TransferData
      return {
        data: { ...current, interStoreIn: combined },
        partitions: { interStoreIn: partitioned },
      }
    }

    case 'interStoreOut': {
      const partitioned = processInterStoreOut(rows)
      const combined = combineStoreDayPartitions(partitioned) as TransferData
      return {
        data: { ...current, interStoreOut: combined },
        partitions: { interStoreOut: partitioned },
      }
    }

    case 'flowers': {
      const partitioned = processSpecialSales(rows, appSettings.flowerCostRate, true)
      const combined = combineStoreDayPartitions(partitioned) as SpecialSalesData
      return {
        data: { ...current, flowers: combined },
        partitions: { flowers: partitioned },
      }
    }

    case 'directProduce': {
      const partitioned = processSpecialSales(rows, appSettings.directProduceCostRate)
      const combined = combineStoreDayPartitions(partitioned) as SpecialSalesData
      return {
        data: { ...current, directProduce: combined },
        partitions: { directProduce: partitioned },
      }
    }

    case 'consumables': {
      const partitioned = processConsumables(rows, filename)
      const combined = combineStoreDayPartitions(partitioned) as ConsumableData
      return {
        data: {
          ...current,
          consumables: mergeConsumableData(current.consumables, combined),
        },
        partitions: { consumables: partitioned },
      }
    }

    case 'categoryTimeSales': {
      // targetYear を渡して各レコードに year/month を埋め込む
      const effectiveYear = detectedYearMonth?.year ?? appSettings.targetYear
      // 店舗名→数値ID逆引きマップを構築（コード無しCSV対応）
      const ctsNameToId = new Map<string, string>()
      for (const [id, store] of mutableStores) {
        ctsNameToId.set(store.name, id)
      }
      const newData = processCategoryTimeSales(rows, effectiveMonth, 0, effectiveYear, ctsNameToId)
      return {
        data: {
          ...current,
          categoryTimeSales: mergeCategoryTimeSalesData(current.categoryTimeSales, newData),
        },
        detectedYearMonth,
      }
    }

    case 'departmentKpi': {
      const newData = processDepartmentKpi(rows)
      return {
        data: {
          ...current,
          departmentKpi: mergeDepartmentKpiData(current.departmentKpi, newData),
        },
      }
    }

    default:
      return { data: current }
  }
}

/**
 * レコード系データ（classifiedSales / categoryTimeSales）の storeId を正規化する。
 *
 * ファイル処理順序によっては、classifiedSales 処理時にまだ purchase 由来の
 * 店舗マスタが存在せず、store 名→数値ID の逆引きが失敗して storeId に
 * 店舗名がそのまま入るケースがある。全ファイル処理後に最終的な stores マップ
 * を使って storeId を正規化する。
 */
export function normalizeRecordStoreIds(data: ImportedData): ImportedData {
  if (data.stores.size === 0) return data

  // 店舗名 → 数値ID の逆引きマップを最終 stores から構築
  const nameToId = new Map<string, string>()
  for (const [id, store] of data.stores) {
    nameToId.set(store.name, id)
  }

  // classifiedSales: storeId が店舗名のまま残っているレコードを修正
  let csChanged = false
  const csRecords = data.classifiedSales.records.map((rec) => {
    const resolvedId = nameToId.get(rec.storeId)
    if (resolvedId && resolvedId !== rec.storeId) {
      csChanged = true
      return { ...rec, storeId: resolvedId, storeName: rec.storeName || rec.storeId }
    }
    return rec
  })

  // categoryTimeSales: 同様に storeId を正規化
  let ctsChanged = false
  const ctsRecords = data.categoryTimeSales.records.map((rec) => {
    const resolvedId = nameToId.get(rec.storeId)
    if (resolvedId && resolvedId !== rec.storeId) {
      ctsChanged = true
      return { ...rec, storeId: resolvedId }
    }
    return rec
  })

  if (!csChanged && !ctsChanged) return data

  return {
    ...data,
    classifiedSales: csChanged ? { records: csRecords } : data.classifiedSales,
    categoryTimeSales: ctsChanged ? { records: ctsRecords } : data.categoryTimeSales,
  }
}

/**
 * 複数ファイルをバッチインポートする
 */
export async function processDroppedFiles(
  files: FileList | File[],
  appSettings: AppSettings,
  currentData: ImportedData,
  onProgress?: ProgressCallback,
  overrideType?: DataType,
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
        rows = await readTabularFile(file)
        if (rows.length === 0) {
          throw new ImportError('ファイルが空です', 'INVALID_FORMAT', file.name)
        }
        type = overrideType
        typeName = getDataTypeName(overrideType)
      } else {
        const detected = await readAndDetect(file)
        rows = detected.rows
        type = detected.type
        typeName = detected.typeName
      }

      const result = processFileData(type, rows, file.name, data, effectiveSettings)
      data = result.data

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
        if (p.purchase) mp = { ...mp, purchase: mergeStoreDayPartitions(mp.purchase, p.purchase) }
        if (p.flowers) mp = { ...mp, flowers: mergeStoreDayPartitions(mp.flowers, p.flowers) }
        if (p.directProduce) mp = { ...mp, directProduce: mergeStoreDayPartitions(mp.directProduce, p.directProduce) }
        if (p.interStoreIn) mp = { ...mp, interStoreIn: mergeStoreDayPartitions(mp.interStoreIn, p.interStoreIn) }
        if (p.interStoreOut) mp = { ...mp, interStoreOut: mergeStoreDayPartitions(mp.interStoreOut, p.interStoreOut) }
        if (p.consumables) mp = { ...mp, consumables: mergePartitionedConsumables(mp.consumables, p.consumables) }
        if (p.budget) mp = { ...mp, budget: mergeMapPartitions(mp.budget, p.budget) }
      }

      // レコード数をサマリーに含める（バリデーション用途）
      const rowCount = countDataRecords(result.data, type)
      results.push({
        ok: true,
        filename: file.name,
        type,
        typeName,
        rowCount,
        warnings: result.warnings,
      })
    } catch (err) {
      const message =
        err instanceof ImportError || err instanceof ImportSchemaError
          ? err.message
          : 'ファイルの読み込みに失敗しました'
      results.push({
        ok: false,
        filename: file.name,
        type: null,
        typeName: null,
        error: message,
      })
    }
  }

  const successCount = results.filter((r) => r.ok).length
  const failureCount = results.filter((r) => !r.ok).length

  // 全ファイル処理後、レコード系データの storeId を正規化する。
  // classifiedSales/categoryTimeSales の storeId がファイル処理順序に依存して
  // 店舗名（未解決）のまま残っているケースを修正する。
  data = normalizeRecordStoreIds(data)

  return {
    summary: { results, successCount, failureCount },
    data,
    detectedYearMonth,
    monthPartitions: mp,
  }
}
