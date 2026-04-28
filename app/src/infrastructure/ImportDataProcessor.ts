/**
 * ファイルデータ処理・正規化
 *
 * 単一ファイルのデータ種別判定→プロセッサ実行→結果検査と、
 * 全ファイル処理後の storeId 正規化を担当する。
 *
 * @responsibility R:adapter
 */
import type {
  PurchaseData,
  SpecialSalesData,
  TransferData,
  CostInclusionData,
  InventoryConfig,
} from '@/domain/models/record'
import type { DataType, AppSettings } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import { mergeClassifiedSalesData } from '@/domain/models/record'
import { detectYearMonth } from './fileImport/dateParser'
import { validateRawRows, STRUCTURAL_RULES } from './fileImport/importSchemas'
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
import type { MonthPartitions } from './ImportService'

// ─── 型定義 ──────────────────────────────────────────

/** processFileData の戻り値 */
export interface ProcessFileResult {
  readonly data: MonthlyData
  readonly detectedYearMonth?: { year: number; month: number }
  readonly partitions?: Partial<MonthPartitions>
  /** プロセッサの警告（ヘッダ不正、0件結果など） */
  readonly warnings?: readonly string[]
  /** この処理で追加されたレコード数（差分。呼び出し側で算出して付与） */
  readonly importedCount?: number
}

// ─── 内部ヘルパー ────────────────────────────────────

/** データ種別ごとの日付検出開始行 */
const DATE_START_ROW: Partial<Record<DataType, number>> = {
  categoryTimeSales: 3,
}

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

/**
 * データ種別ごとのレコード数を返す（インポートサマリー用）
 */
export function countDataRecords(data: MonthlyData, type: DataType): number {
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
 * プロセッサの結果が0件の場合、ヘッダ形式に関する警告を生成する。
 */
function checkProcessorResult(
  type: DataType,
  resultData: MonthlyData,
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

// ─── 公開関数 ────────────────────────────────────────

/**
 * 単一ファイルのデータを処理し、既存のMonthlyDataにマージする
 */
export function processFileData(
  type: DataType,
  rows: readonly unknown[][],
  filename: string,
  current: MonthlyData,
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
  current: MonthlyData,
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
      const effectiveYear = detectedYearMonth?.year ?? appSettings.targetYear
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

// ── サブモジュール re-export ──

export { normalizeRecordStoreIds } from './storeIdNormalization'
