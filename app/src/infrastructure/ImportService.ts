import type {
  DataType,
  AppSettings,
  ImportedData,
  PurchaseData,
  SpecialSalesData,
  TransferData,
  CostInclusionData,
  BudgetData,
  InventoryConfig,
} from '@/domain/models'
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
import {
  processCostInclusions,
  mergeCostInclusionData,
} from './dataProcessing/CostInclusionProcessor'
import {
  processCategoryTimeSales,
  mergeCategoryTimeSalesData,
} from './dataProcessing/CategoryTimeSalesProcessor'
import {
  processDepartmentKpi,
  mergeDepartmentKpiData,
} from './dataProcessing/DepartmentKpiProcessor'

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

// ─── 年月検出フォールバック ──────────────────────────

/**
 * パーティションキーやレコードの year/month から年月を検出する。
 * classifiedSales/categoryTimeSales が含まれないインポートで
 * detectedYearMonth が未設定のときに使用するフォールバック。
 */
function detectYearMonthFromPartitionsOrRecords(
  data: ImportedData,
  mp: MonthPartitions,
): { year: number; month: number } | undefined {
  // パーティションキー（"YYYY-M" 形式）から収集
  const allKeys = new Set<string>()
  for (const mk of Object.keys(mp.purchase)) allKeys.add(mk)
  for (const mk of Object.keys(mp.flowers)) allKeys.add(mk)
  for (const mk of Object.keys(mp.directProduce)) allKeys.add(mk)
  for (const mk of Object.keys(mp.interStoreIn)) allKeys.add(mk)
  for (const mk of Object.keys(mp.interStoreOut)) allKeys.add(mk)
  for (const mk of Object.keys(mp.consumables)) allKeys.add(mk)
  for (const mk of Object.keys(mp.budget)) allKeys.add(mk)

  // レコードの year/month からも収集
  for (const rec of data.classifiedSales.records) {
    allKeys.add(`${rec.year}-${rec.month}`)
  }
  for (const rec of data.categoryTimeSales.records) {
    allKeys.add(`${rec.year}-${rec.month}`)
  }

  if (allKeys.size === 0) return undefined

  // 最初のキーを使用（複数月の場合は最も早い月）
  const sorted = [...allKeys].sort((a, b) => {
    const [ay, am] = a.split('-').map(Number)
    const [by, bm] = b.split('-').map(Number)
    return ay !== by ? ay - by : am - bm
  })

  const [year, month] = sorted[0].split('-').map(Number)
  if (isNaN(year) || isNaN(month)) return undefined
  return { year, month }
}

// ─── パーティション結合ヘルパー ──────────────────────────

/** 月パーティション済み flat record データを1つに結合する（全月の records を concat） */
function combineRecordPartitions<T>(
  partitioned: Record<string, { readonly records: readonly T[] }>,
): { readonly records: readonly T[] } {
  const all: T[] = []
  for (const monthData of Object.values(partitioned)) {
    all.push(...monthData.records)
  }
  return { records: all }
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

/** flat record パーティションをマージ（同月の場合は concat） */
function mergeRecordPartitions<T>(
  existing: Record<string, { readonly records: readonly T[] }>,
  incoming: Record<string, { readonly records: readonly T[] }>,
): Record<string, { readonly records: readonly T[] }> {
  const result = { ...existing }
  for (const [mk, data] of Object.entries(incoming)) {
    if (result[mk]) {
      result[mk] = { records: [...result[mk].records, ...data.records] }
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
    case 'classifiedSales':
      return data.classifiedSales.records.length
    case 'categoryTimeSales':
      return data.categoryTimeSales.records.length
    case 'departmentKpi':
      return data.departmentKpi.records.length
    case 'purchase':
      return data.purchase.records.length
    case 'flowers':
      return data.flowers.records.length
    case 'directProduce':
      return data.directProduce.records.length
    case 'interStoreIn':
      return data.interStoreIn.records.length
    case 'interStoreOut':
      return data.interStoreOut.records.length
    case 'consumables':
      return data.consumables.records.length
    case 'budget':
      return data.budget.size
    case 'initialSettings':
      return data.settings.size
    default:
      return 0
  }
}

/**
 * InventoryConfig から店別掛け率マップを構築する。
 * 店別設定がある店舗のみ含まれ、未設定の店舗にはグローバル設定が適用される。
 */
function buildStoreCostRateMap(
  settings: ReadonlyMap<string, InventoryConfig>,
  field: 'flowerCostRate' | 'directProduceCostRate',
): Map<string, number> | undefined {
  const map = new Map<string, number>()
  for (const [storeId, config] of settings) {
    const rate = config[field]
    if (rate != null && Number.isFinite(rate)) {
      map.set(storeId, rate)
    }
  }
  return map.size > 0 ? map : undefined
}

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
  const detectedYearMonth =
    startRow != null ? (detectYearMonth(rows, 0, startRow) ?? undefined) : undefined

  const effectiveMonth = detectedYearMonth?.month ?? appSettings.targetMonth

  switch (type) {
    case 'purchase': {
      const newStores = extractStoresFromPurchase(rows)
      for (const [id, s] of newStores) mutableStores.set(id, s)

      const newSuppliers = extractSuppliersFromPurchase(rows)
      for (const [code, s] of newSuppliers) mutableSuppliers.set(code, s)

      const allStores = new Set(mutableStores.keys())
      const partitioned = processPurchase(rows, allStores)
      const combined = combineRecordPartitions(partitioned) as PurchaseData

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

    case 'initialSettings': {
      const settings = processSettings(rows)
      // 初期設定ファイルから店舗IDを抽出し、未登録なら仮の Store を作成する。
      // purchase/classifiedSales がインポートされれば正式な店舗名で上書きされる。
      for (const [storeId] of settings) {
        if (!mutableStores.has(storeId)) {
          mutableStores.set(storeId, { id: storeId, code: storeId, name: `店舗${storeId}` })
        }
      }
      return { data: { ...current, stores: mutableStores, settings } }
    }

    case 'budget': {
      const partitioned = processBudget(rows)
      const combined = combineMapPartitions(partitioned)
      // 予算ファイルから店舗IDを抽出し、未登録なら仮の Store を作成する。
      for (const [storeId] of combined) {
        if (!mutableStores.has(storeId)) {
          mutableStores.set(storeId, { id: storeId, code: storeId, name: `店舗${storeId}` })
        }
      }
      return {
        data: { ...current, stores: mutableStores, budget: combined },
        partitions: { budget: partitioned },
      }
    }

    case 'interStoreIn': {
      const partitioned = processInterStoreIn(rows)
      const combined = combineRecordPartitions(partitioned) as TransferData
      return {
        data: { ...current, interStoreIn: combined },
        partitions: { interStoreIn: partitioned },
      }
    }

    case 'interStoreOut': {
      const partitioned = processInterStoreOut(rows)
      const combined = combineRecordPartitions(partitioned) as TransferData
      return {
        data: { ...current, interStoreOut: combined },
        partitions: { interStoreOut: partitioned },
      }
    }

    case 'flowers': {
      const storeFlowerRates = buildStoreCostRateMap(current.settings, 'flowerCostRate')
      const partitioned = processSpecialSales(
        rows,
        appSettings.flowerCostRate,
        true,
        storeFlowerRates,
      )
      const combined = combineRecordPartitions(partitioned) as SpecialSalesData
      return {
        data: { ...current, flowers: combined },
        partitions: { flowers: partitioned },
      }
    }

    case 'directProduce': {
      const storeDirectRates = buildStoreCostRateMap(current.settings, 'directProduceCostRate')
      const partitioned = processSpecialSales(
        rows,
        appSettings.directProduceCostRate,
        false,
        storeDirectRates,
      )
      const combined = combineRecordPartitions(partitioned) as SpecialSalesData
      return {
        data: { ...current, directProduce: combined },
        partitions: { directProduce: partitioned },
      }
    }

    case 'consumables': {
      const partitioned = processCostInclusions(rows, filename)
      const combined = combineRecordPartitions(partitioned) as CostInclusionData
      return {
        data: {
          ...current,
          consumables: mergeCostInclusionData(current.consumables, combined),
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

  // classifiedSales/categoryTimeSales が含まれないインポート（purchase, flowers 等のみ）では
  // detectedYearMonth が未設定のまま。パーティションキーやレコードから年月を検出し、
  // ページの設定年と異なるデータが消失するのを防ぐ。
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
