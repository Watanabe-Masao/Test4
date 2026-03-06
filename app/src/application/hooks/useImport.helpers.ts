import type {
  ImportedData,
  CategoryTimeSalesData,
  ClassifiedSalesData,
  DepartmentKpiData,
} from '@/domain/models'
import { categoryTimeSalesRecordKey, classifiedSalesRecordKey } from '@/domain/models'

// ─── 複数月データ構築 ───────────────────────────────────

/** デフォルトアクション（差分確認不要時の保存） */
export const DEFAULT_MERGE_ACTION = 'overwrite' as const

/**
 * 月別データの最終版を構築する。
 * monthData は filterDataForMonth で年月フィルタ済み。
 * 既存データがない場合は monthData をそのまま使用。
 * ある場合は action に応じてマージする。
 */
export function buildMonthData(
  existing: ImportedData | null,
  monthData: ImportedData,
  mergeAction: 'overwrite' | 'keep-existing' = 'overwrite',
): ImportedData {
  if (!existing) {
    // 新規月: フィルタ済み monthData をそのまま使用
    return monthData
  }
  if (mergeAction === 'overwrite') {
    // 上書き: 新規データがあれば replace、なければ既存を維持
    return {
      ...existing,
      stores: new Map([...existing.stores, ...monthData.stores]),
      suppliers: new Map([...existing.suppliers, ...monthData.suppliers]),
      purchase: replaceIfNonEmpty(existing.purchase, monthData.purchase),
      classifiedSales: replaceIfNonEmpty(existing.classifiedSales, monthData.classifiedSales),
      categoryTimeSales: replaceIfNonEmpty(existing.categoryTimeSales, monthData.categoryTimeSales),
      departmentKpi: replaceIfNonEmpty(existing.departmentKpi, monthData.departmentKpi),
      interStoreIn: replaceIfNonEmpty(existing.interStoreIn, monthData.interStoreIn),
      interStoreOut: replaceIfNonEmpty(existing.interStoreOut, monthData.interStoreOut),
      flowers: replaceIfNonEmpty(existing.flowers, monthData.flowers),
      directProduce: replaceIfNonEmpty(existing.directProduce, monthData.directProduce),
      consumables: replaceIfNonEmpty(existing.consumables, monthData.consumables),
      settings: new Map([...existing.settings, ...monthData.settings]),
      budget: new Map([...existing.budget, ...monthData.budget]),
    }
  }
  // keep-existing: 挿入のみマージ
  return {
    ...existing,
    stores: mergeMapInserts(existing.stores, monthData.stores),
    suppliers: mergeMapInserts(existing.suppliers, monthData.suppliers),
    purchase: mergeRecordInserts(existing.purchase, monthData.purchase, purchaseRecordKey),
    classifiedSales: mergeCSInserts(existing.classifiedSales, monthData.classifiedSales),
    categoryTimeSales: mergeCTSInserts(existing.categoryTimeSales, monthData.categoryTimeSales),
    departmentKpi: mergeDepartmentKpiInserts(existing.departmentKpi, monthData.departmentKpi),
    interStoreIn: mergeRecordInserts(existing.interStoreIn, monthData.interStoreIn, datedRecordKey),
    interStoreOut: mergeRecordInserts(
      existing.interStoreOut,
      monthData.interStoreOut,
      datedRecordKey,
    ),
    flowers: mergeRecordInserts(existing.flowers, monthData.flowers, datedRecordKey),
    directProduce: mergeRecordInserts(
      existing.directProduce,
      monthData.directProduce,
      datedRecordKey,
    ),
    consumables: mergeRecordInserts(existing.consumables, monthData.consumables, datedRecordKey),
    settings: mergeMapInserts(existing.settings, monthData.settings),
    budget: mergeMapInserts(existing.budget, monthData.budget),
  }
}

// ─── 挿入のみマージ ─────────────────────────────────────

/** DatedRecord のキー生成（storeId + day） */
function datedRecordKey(rec: { storeId: string; day: number }): string {
  return `${rec.storeId}\t${rec.day}`
}

/** PurchaseDayEntry のキー生成 */
function purchaseRecordKey(rec: { storeId: string; day: number }): string {
  return `${rec.storeId}\t${rec.day}`
}

/** レコードが空でなければ incoming で置換、空なら既存を維持 */
function replaceIfNonEmpty<T extends { readonly records: readonly unknown[] }>(
  existing: T,
  incoming: T,
): T {
  return incoming.records.length > 0 ? incoming : existing
}

/** flat record 配列の挿入のみマージ（既存キーは上書きしない） */
function mergeRecordInserts<T, D extends { readonly records: readonly T[] }>(
  existing: D,
  incoming: D,
  keyFn: (rec: T) => string,
): D {
  if (existing.records.length === 0) return incoming
  if (incoming.records.length === 0) return existing
  const existingKeys = new Set(existing.records.map(keyFn))
  const newRecords = incoming.records.filter((r) => !existingKeys.has(keyFn(r)))
  return { ...existing, records: [...existing.records, ...newRecords] } as D
}

/** ClassifiedSalesData の挿入のみマージ */
function mergeCSInserts(
  existing: ClassifiedSalesData,
  incoming: ClassifiedSalesData,
): ClassifiedSalesData {
  if (existing.records.length === 0) return incoming
  if (incoming.records.length === 0) return existing
  const existingKeys = new Set(existing.records.map(classifiedSalesRecordKey))
  const newRecords = incoming.records.filter((r) => !existingKeys.has(classifiedSalesRecordKey(r)))
  return { records: [...existing.records, ...newRecords] }
}

/** CategoryTimeSalesData の挿入のみマージ */
function mergeCTSInserts(
  existing: CategoryTimeSalesData,
  incoming: CategoryTimeSalesData,
): CategoryTimeSalesData {
  if (existing.records.length === 0) return incoming
  if (incoming.records.length === 0) return existing
  const existingKeys = new Set(existing.records.map(categoryTimeSalesRecordKey))
  const newRecords = incoming.records.filter(
    (r) => !existingKeys.has(categoryTimeSalesRecordKey(r)),
  )
  return { records: [...existing.records, ...newRecords] }
}

/** DepartmentKpiData の挿入のみマージ（既存deptCodeは上書きしない） */
function mergeDepartmentKpiInserts(
  existing: DepartmentKpiData,
  incoming: DepartmentKpiData,
): DepartmentKpiData {
  if (existing.records.length === 0) return incoming
  if (incoming.records.length === 0) return existing
  const existingCodes = new Set(existing.records.map((r) => r.deptCode))
  const newRecords = incoming.records.filter((r) => !existingCodes.has(r.deptCode))
  return { records: [...existing.records, ...newRecords] }
}

/** ReadonlyMap の挿入のみマージ */
function mergeMapInserts<K, V>(
  existing: ReadonlyMap<K, V>,
  incoming: ReadonlyMap<K, V>,
): ReadonlyMap<K, V> {
  const merged = new Map(existing)
  for (const [k, v] of incoming) {
    if (!merged.has(k)) merged.set(k, v)
  }
  return merged
}

/**
 * 既存データに新規挿入分のみをマージして返す。
 * 既存に値がある場合は変更しない。
 */
export function mergeInsertsOnly(
  existing: ImportedData,
  incoming: ImportedData,
  importedTypes: ReadonlySet<string>,
): ImportedData {
  const has = (t: string) => importedTypes.has(t)

  return {
    ...existing,
    purchase: has('purchase')
      ? mergeRecordInserts(existing.purchase, incoming.purchase, purchaseRecordKey)
      : existing.purchase,
    classifiedSales: has('classifiedSales')
      ? mergeCSInserts(existing.classifiedSales, incoming.classifiedSales)
      : existing.classifiedSales,
    prevYearClassifiedSales: existing.prevYearClassifiedSales,
    interStoreIn: has('interStoreIn')
      ? mergeRecordInserts(existing.interStoreIn, incoming.interStoreIn, datedRecordKey)
      : existing.interStoreIn,
    interStoreOut: has('interStoreOut')
      ? mergeRecordInserts(existing.interStoreOut, incoming.interStoreOut, datedRecordKey)
      : existing.interStoreOut,
    flowers: has('flowers')
      ? mergeRecordInserts(existing.flowers, incoming.flowers, datedRecordKey)
      : existing.flowers,
    directProduce: has('directProduce')
      ? mergeRecordInserts(existing.directProduce, incoming.directProduce, datedRecordKey)
      : existing.directProduce,
    consumables: has('consumables')
      ? mergeRecordInserts(existing.consumables, incoming.consumables, datedRecordKey)
      : existing.consumables,
    categoryTimeSales: has('categoryTimeSales')
      ? mergeCTSInserts(existing.categoryTimeSales, incoming.categoryTimeSales)
      : existing.categoryTimeSales,
    prevYearCategoryTimeSales: existing.prevYearCategoryTimeSales,
    departmentKpi: has('departmentKpi')
      ? mergeDepartmentKpiInserts(existing.departmentKpi, incoming.departmentKpi)
      : existing.departmentKpi,
    stores: mergeMapInserts(existing.stores, incoming.stores),
    suppliers: mergeMapInserts(existing.suppliers, incoming.suppliers),
    settings: has('initialSettings')
      ? mergeMapInserts(existing.settings, incoming.settings)
      : existing.settings,
    budget: has('budget') ? mergeMapInserts(existing.budget, incoming.budget) : existing.budget,
  }
}
