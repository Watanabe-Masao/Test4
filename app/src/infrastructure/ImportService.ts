import type { DataType, Store, AppSettings } from '@/domain/models'
import type { InventoryConfig, BudgetData } from '@/domain/models'
import { readTabularFile } from './fileImport/tabularReader'
import { detectFileType, getDataTypeName } from './fileImport/FileTypeDetector'
import { ImportError } from './fileImport/errors'
import type { ValidationMessage } from './fileImport/errors'
import {
  processPurchase,
  extractStoresFromPurchase,
  extractSuppliersFromPurchase,
} from './dataProcessing/PurchaseProcessor'
import type { PurchaseData } from './dataProcessing/PurchaseProcessor'
import { processSales, extractStoresFromSales } from './dataProcessing/SalesProcessor'
import type { SalesData } from './dataProcessing/SalesProcessor'
import { processDiscount } from './dataProcessing/DiscountProcessor'
import type { DiscountData } from './dataProcessing/DiscountProcessor'
import { processSettings } from './dataProcessing/SettingsProcessor'
import { processBudget } from './dataProcessing/BudgetProcessor'
import { processInterStoreIn, processInterStoreOut } from './dataProcessing/TransferProcessor'
import type { TransferData } from './dataProcessing/TransferProcessor'
import { processSpecialSales } from './dataProcessing/SpecialSalesProcessor'
import type { SpecialSalesData } from './dataProcessing/SpecialSalesProcessor'
import { processConsumables, mergeConsumableData } from './dataProcessing/ConsumableProcessor'
import type { ConsumableData } from './dataProcessing/ConsumableProcessor'

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

/** インポートされた全データの集約 */
export interface ImportedData {
  readonly stores: ReadonlyMap<string, Store>
  readonly suppliers: ReadonlyMap<string, { code: string; name: string }>
  readonly purchase: PurchaseData
  readonly sales: SalesData
  readonly discount: DiscountData
  readonly interStoreIn: TransferData
  readonly interStoreOut: TransferData
  readonly flowers: SpecialSalesData
  readonly directProduce: SpecialSalesData
  readonly consumables: ConsumableData
  readonly settings: ReadonlyMap<string, InventoryConfig>
  readonly budget: ReadonlyMap<string, BudgetData>
}

/** 空のインポートデータ */
export function createEmptyImportedData(): ImportedData {
  return {
    stores: new Map(),
    suppliers: new Map(),
    purchase: {},
    sales: {},
    discount: {},
    interStoreIn: {},
    interStoreOut: {},
    flowers: {},
    directProduce: {},
    consumables: {},
    settings: new Map(),
    budget: new Map(),
  }
}

/** 進捗コールバック */
export type ProgressCallback = (current: number, total: number, filename: string) => void

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

      // DiscountData から SalesData を構築
      const salesData: Record<string, Record<number, { sales: number }>> = {}
      for (const [storeId, days] of Object.entries(discountData)) {
        salesData[storeId] = {}
        for (const [day, d] of Object.entries(days)) {
          salesData[storeId][Number(day)] = { sales: d.sales }
        }
      }

      return {
        ...current,
        stores: mutableStores,
        sales: salesData,
        discount: discountData,
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

/**
 * インポートデータのバリデーション
 */
export function validateImportedData(data: ImportedData): readonly ValidationMessage[] {
  const messages: ValidationMessage[] = []
  const storeCount = data.stores.size

  // 必須データチェック
  if (Object.keys(data.purchase).length === 0) {
    messages.push({ level: 'error', message: '仕入データがありません' })
  }
  if (Object.keys(data.sales).length === 0) {
    messages.push({ level: 'error', message: '売上データがありません' })
  }

  // 店舗チェック
  if (storeCount === 0) {
    messages.push({ level: 'warning', message: '店舗が検出されませんでした' })
  }

  // 在庫設定チェック
  const invCount = data.settings.size
  if (invCount === 0) {
    messages.push({
      level: 'warning',
      message: '在庫設定がありません。初期設定ファイルを読み込むか手動設定してください',
    })
  } else if (invCount < storeCount) {
    messages.push({
      level: 'warning',
      message: `一部店舗の在庫設定がありません (${invCount}/${storeCount})`,
    })
  }

  // オプショナルデータ
  if (data.budget.size === 0) {
    messages.push({
      level: 'info',
      message: '予算データがありません。予算ファイルを読み込むとより詳細な分析が可能です',
    })
  }
  if (Object.keys(data.discount).length === 0) {
    messages.push({
      level: 'info',
      message: '売変データがありません。売変ファイルを読み込むと推定粗利計算が可能です',
    })
  }

  return messages
}

/**
 * バリデーションにエラーがないかチェック
 */
export function hasValidationErrors(messages: readonly ValidationMessage[]): boolean {
  return messages.some((m) => m.level === 'error')
}
