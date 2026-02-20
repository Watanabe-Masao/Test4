import type { DataType, AppSettings, ImportedData } from '@/domain/models'
import type { DiscountData, SalesData } from '@/domain/models'
import { readTabularFile } from './fileImport/tabularReader'
import { detectFileType, getDataTypeName } from './fileImport/FileTypeDetector'
import { detectYearMonth } from './fileImport/dateParser'
import { ImportError } from './fileImport/errors'
import {
  processPurchase,
  extractStoresFromPurchase,
  extractSuppliersFromPurchase,
} from './dataProcessing/PurchaseProcessor'
import { processSales, extractStoresFromSales } from './dataProcessing/SalesProcessor'
import { processDiscount } from './dataProcessing/DiscountProcessor'
import { processSettings } from './dataProcessing/SettingsProcessor'
import { processBudget } from './dataProcessing/BudgetProcessor'
import { processInterStoreIn, processInterStoreOut } from './dataProcessing/TransferProcessor'
import { processSpecialSales } from './dataProcessing/SpecialSalesProcessor'
import { processConsumables, mergeConsumableData } from './dataProcessing/ConsumableProcessor'
import { processCategoryTimeSales, mergeCategoryTimeSalesData } from './dataProcessing/CategoryTimeSalesProcessor'
import { processDepartmentKpi, mergeDepartmentKpiData } from './dataProcessing/DepartmentKpiProcessor'

/** DiscountData から SalesData を構築する */
export function discountToSalesData(discountData: DiscountData): SalesData {
  const salesData: Record<string, Record<number, { sales: number; customers: number }>> = {}
  for (const [storeId, days] of Object.entries(discountData)) {
    salesData[storeId] = {}
    for (const [day, d] of Object.entries(days)) {
      salesData[storeId][Number(day)] = { sales: d.sales, customers: d.customers ?? 0 }
    }
  }
  return salesData
}

/** 単一ファイルのインポート結果 */
export interface FileImportResult {
  readonly ok: boolean
  readonly filename: string
  readonly type: DataType | null
  readonly typeName: string | null
  readonly error?: string
  /** 処理された行数 */
  readonly rowCount?: number
  /** スキップされた行の詳細 */
  readonly skippedRows?: readonly string[]
}

/** バッチインポートの全体結果 */
export interface ImportSummary {
  readonly results: readonly FileImportResult[]
  readonly successCount: number
  readonly failureCount: number
  /** スキップされたファイル（拡張子不一致等） */
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
  /** データの日付から検出された年月（日付を含むファイルの場合のみ） */
  readonly detectedYearMonth?: { year: number; month: number }
}

/** データ種別ごとの日付検出開始行 */
const DATE_START_ROW: Partial<Record<DataType, number>> = {
  sales: 3,
  discount: 2,
  salesDiscount: 2,
  prevYearSalesDiscount: 2,
  categoryTimeSales: 3,
  prevYearCategoryTimeSales: 3,
}

/**
 * 単一ファイルのデータを処理し、既存のImportedDataにマージする
 *
 * 日付を含むファイル (sales, discount, salesDiscount) の場合、
 * データ内の日付から対象年月を自動検出して返す。
 * appSettings.targetMonth が設定されていれば、その月のデータのみ抽出する。
 */
export function processFileData(
  type: DataType,
  rows: readonly unknown[][],
  filename: string,
  current: ImportedData,
  appSettings: AppSettings,
): ProcessFileResult {
  const mutableStores = new Map(current.stores)
  const mutableSuppliers = new Map(current.suppliers)

  // 日付を含むファイルの場合、年月を自動検出
  const startRow = DATE_START_ROW[type]
  const detectedYearMonth = startRow != null
    ? detectYearMonth(rows, 0, startRow) ?? undefined
    : undefined

  // 対象月: 検出された月 or appSettings の月
  const effectiveMonth = detectedYearMonth?.month ?? appSettings.targetMonth

  switch (type) {
    case 'purchase': {
      // 仕入データから店舗・取引先を抽出
      const newStores = extractStoresFromPurchase(rows)
      for (const [id, s] of newStores) mutableStores.set(id, s)

      const newSuppliers = extractSuppliersFromPurchase(rows)
      for (const [code, s] of newSuppliers) mutableSuppliers.set(code, s)

      // 更新された店舗セットで処理
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

    case 'sales': {
      const newStores = extractStoresFromSales(rows)
      for (const [id, s] of newStores) mutableStores.set(id, s)

      return {
        data: {
          ...current,
          stores: mutableStores,
          sales: processSales(rows, effectiveMonth),
        },
        detectedYearMonth,
      }
    }

    case 'discount':
      return {
        data: { ...current, discount: processDiscount(rows, effectiveMonth) },
        detectedYearMonth,
      }

    case 'salesDiscount': {
      // 売上売変の複合ファイル: DiscountProcessor で売上・売変両方を抽出
      const newStores = extractStoresFromSales(rows)
      for (const [id, s] of newStores) mutableStores.set(id, s)

      const discountData = processDiscount(rows, effectiveMonth)

      return {
        data: {
          ...current,
          stores: mutableStores,
          sales: discountToSalesData(discountData),
          discount: discountData,
        },
        detectedYearMonth,
      }
    }

    case 'prevYearSalesDiscount': {
      // 前年売上売変: salesDiscount と同じ構造だが前年データとして格納
      // 翌月先頭6日分も取り込み（同曜日オフセットで月末がはみ出す場合に備える）
      const prevDiscountData = processDiscount(rows, effectiveMonth, 6)
      return {
        data: {
          ...current,
          prevYearSales: discountToSalesData(prevDiscountData),
          prevYearDiscount: prevDiscountData,
        },
        // 前年データの年月で当年の targetYear/Month を上書きしない
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
          flowers: processSpecialSales(rows, appSettings.flowerCostRate),
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
      const newData = processCategoryTimeSales(rows, effectiveMonth)
      return {
        data: {
          ...current,
          categoryTimeSales: mergeCategoryTimeSalesData(current.categoryTimeSales, newData),
        },
        detectedYearMonth,
      }
    }

    case 'prevYearCategoryTimeSales': {
      // 前年分類別時間帯売上: 翌月先頭6日分も取り込み（同曜日オフセットで月末がはみ出す場合に備える）
      const newData = processCategoryTimeSales(rows, effectiveMonth, 6)
      return {
        data: {
          ...current,
          prevYearCategoryTimeSales: mergeCategoryTimeSalesData(current.prevYearCategoryTimeSales, newData),
        },
        // 前年データの年月で当年の targetYear/Month を上書きしない
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
 * overrideType が指定された場合、自動判定をスキップしてそのタイプで処理する
 *
 * データ内の日付から対象年月を自動検出し、detectedYearMonth として返す。
 * 検出された年月は後続ファイルの処理にも即座に反映される。
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
        // UploadCardから種別指定された場合: 自動判定をスキップ
        rows = await readTabularFile(file)
        if (rows.length === 0) {
          throw new ImportError('ファイルが空です', 'INVALID_FORMAT', file.name)
        }
        type = overrideType
        typeName = getDataTypeName(overrideType)
      } else {
        // ドラッグ＆ドロップの場合: 自動判定
        const detected = await readAndDetect(file)
        rows = detected.rows
        type = detected.type
        typeName = detected.typeName
      }

      const result = processFileData(type, rows, file.name, data, effectiveSettings)
      data = result.data

      // 年月が検出されたら後続ファイルの処理にも反映
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
        err instanceof ImportError ? err.message : 'ファイルの読み込みに失敗しました'
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

