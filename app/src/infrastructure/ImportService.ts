import type { DataType, AppSettings, ImportedData } from '@/domain/models'
import type { DiscountData, SalesData } from '@/domain/models'
import { readTabularFile } from './fileImport/tabularReader'
import { detectFileType, getDataTypeName } from './fileImport/FileTypeDetector'
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

/** DiscountData から SalesData を構築する */
function discountToSalesData(discountData: DiscountData): SalesData {
  const salesData: Record<string, Record<number, { sales: number }>> = {}
  for (const [storeId, days] of Object.entries(discountData)) {
    salesData[storeId] = {}
    for (const [day, d] of Object.entries(days)) {
      salesData[storeId][Number(day)] = { sales: d.sales }
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
}

/** バッチインポートの全体結果 */
export interface ImportSummary {
  readonly results: readonly FileImportResult[]
  readonly successCount: number
  readonly failureCount: number
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

/**
 * 単一ファイルのデータを処理し、既存のImportedDataにマージする
 */
export function processFileData(
  type: DataType,
  rows: readonly unknown[][],
  filename: string,
  current: ImportedData,
  appSettings: AppSettings,
): ImportedData {
  const mutableStores = new Map(current.stores)
  const mutableSuppliers = new Map(current.suppliers)

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
        ...current,
        stores: mutableStores,
        suppliers: mutableSuppliers,
        purchase: processPurchase(rows, allStores),
      }
    }

    case 'sales': {
      const newStores = extractStoresFromSales(rows)
      for (const [id, s] of newStores) mutableStores.set(id, s)

      return {
        ...current,
        stores: mutableStores,
        sales: processSales(rows),
      }
    }

    case 'discount':
      return { ...current, discount: processDiscount(rows) }

    case 'salesDiscount': {
      // 売上売変の複合ファイル: DiscountProcessor で売上・売変両方を抽出
      const newStores = extractStoresFromSales(rows)
      for (const [id, s] of newStores) mutableStores.set(id, s)

      const discountData = processDiscount(rows)

      return {
        ...current,
        stores: mutableStores,
        sales: discountToSalesData(discountData),
        discount: discountData,
      }
    }

    case 'prevYearSalesDiscount': {
      // 前年売上売変: salesDiscount と同じ構造だが前年データとして格納
      // 対象月以外の日付（例: 2月データに含まれる3/1）を除外
      const prevDiscountData = processDiscount(rows, appSettings.targetMonth)
      return {
        ...current,
        prevYearSales: discountToSalesData(prevDiscountData),
        prevYearDiscount: prevDiscountData,
      }
    }

    case 'initialSettings':
      return { ...current, settings: processSettings(rows) }

    case 'budget':
      return { ...current, budget: processBudget(rows) }

    case 'interStoreIn':
      return { ...current, interStoreIn: processInterStoreIn(rows) }

    case 'interStoreOut':
      return { ...current, interStoreOut: processInterStoreOut(rows) }

    case 'flowers':
      return {
        ...current,
        flowers: processSpecialSales(rows, appSettings.flowerCostRate),
      }

    case 'directProduce':
      return {
        ...current,
        directProduce: processSpecialSales(rows, appSettings.directProduceCostRate),
      }

    case 'consumables': {
      const newData = processConsumables(rows, filename)
      return {
        ...current,
        consumables: mergeConsumableData(current.consumables, newData),
      }
    }

    default:
      return current
  }
}

/**
 * 複数ファイルをバッチインポートする
 * overrideType が指定された場合、自動判定をスキップしてそのタイプで処理する
 */
export async function processDroppedFiles(
  files: FileList | File[],
  appSettings: AppSettings,
  currentData: ImportedData,
  onProgress?: ProgressCallback,
  overrideType?: DataType,
): Promise<{ summary: ImportSummary; data: ImportedData }> {
  const fileArray = Array.from(files)
  const results: FileImportResult[] = []
  let data = currentData

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

      data = processFileData(type, rows, file.name, data, appSettings)
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
  }
}

