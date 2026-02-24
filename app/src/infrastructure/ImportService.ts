import type { DataType, AppSettings, ImportedData } from '@/domain/models'
import { mergeClassifiedSalesData } from '@/domain/models'
import { readTabularFile } from './fileImport/tabularReader'
import { detectFileType, getDataTypeName } from './fileImport/FileTypeDetector'
import { detectYearMonth } from './fileImport/dateParser'
import { ImportError } from './fileImport/errors'
import { validateRawRows, ImportSchemaError } from './fileImport/importSchemas'
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
import { processConsumables, mergeConsumableData } from './dataProcessing/ConsumableProcessor'
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
}

/** データ種別ごとの日付検出開始行 */
const DATE_START_ROW: Partial<Record<DataType, number>> = {
  categoryTimeSales: 3,
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
      return {
        data: {
          ...current,
          stores: mutableStores,
          suppliers: mutableSuppliers,
          purchase: processPurchase(rows, allStores),
        },
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
      const newData = processClassifiedSales(rows, csEffectiveMonth, storeNameToId)

      return {
        data: {
          ...current,
          stores: mutableStores,
          classifiedSales: mergeClassifiedSalesData(current.classifiedSales, newData),
        },
        detectedYearMonth: csYearMonth ?? undefined,
      }
    }

    case 'initialSettings':
      return { data: { ...current, settings: processSettings(rows) } }

    case 'budget':
      return { data: { ...current, budget: processBudget(rows) } }

    case 'interStoreIn':
      return { data: { ...current, interStoreIn: processInterStoreIn(rows) } }

    case 'interStoreOut':
      return { data: { ...current, interStoreOut: processInterStoreOut(rows) } }

    case 'flowers':
      return {
        data: {
          ...current,
          flowers: processSpecialSales(rows, appSettings.flowerCostRate, true),
        },
      }

    case 'directProduce':
      return {
        data: {
          ...current,
          directProduce: processSpecialSales(rows, appSettings.directProduceCostRate),
        },
      }

    case 'consumables': {
      const newData = processConsumables(rows, filename)
      return {
        data: {
          ...current,
          consumables: mergeConsumableData(current.consumables, newData),
        },
      }
    }

    case 'categoryTimeSales': {
      // targetYear を渡して各レコードに year/month を埋め込む
      const effectiveYear = detectedYearMonth?.year ?? appSettings.targetYear
      const newData = processCategoryTimeSales(rows, effectiveMonth, 0, effectiveYear)
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
}> {
  const fileArray = Array.from(files)
  const results: FileImportResult[] = []
  let data = currentData
  let effectiveSettings = appSettings
  let detectedYearMonth: { year: number; month: number } | undefined

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

      results.push({ ok: true, filename: file.name, type, typeName })
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

  return {
    summary: { results, successCount, failureCount },
    data,
    detectedYearMonth,
  }
}
