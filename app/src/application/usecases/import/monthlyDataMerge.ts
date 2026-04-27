/**
 * MonthlyData 専用のマージロジック
 *
 * importDataMerge.ts の MonthlyData 版。prevYear* フィールドが存在しないため、
 * マージ対象は当月データのみ。Import 内部で使用する。
 *
 * @responsibility R:unclassified
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type {
  CategoryTimeSalesData,
  ClassifiedSalesData,
  DepartmentKpiData,
} from '@/domain/models/record'
import { categoryTimeSalesRecordKey, classifiedSalesRecordKey } from '@/domain/models/record'

/** デフォルトアクション（差分確認不要時の保存） */
export const DEFAULT_MERGE_ACTION = 'overwrite' as const

/**
 * 月別データの最終版を構築する。
 * 既存データがない場合は incoming をそのまま使用。
 * ある場合は action に応じてマージする。
 */
export function mergeMonthlyData(
  existing: MonthlyData | null,
  incoming: MonthlyData,
  mergeAction: 'overwrite' | 'keep-existing' = 'overwrite',
): MonthlyData {
  if (!existing) return incoming

  if (mergeAction === 'overwrite') {
    return {
      ...incoming,
      origin: incoming.origin,
      stores: new Map([...existing.stores, ...incoming.stores]),
      suppliers: new Map([...existing.suppliers, ...incoming.suppliers]),
      purchase: replaceIfNonEmpty(existing.purchase, incoming.purchase),
      classifiedSales: replaceIfNonEmpty(existing.classifiedSales, incoming.classifiedSales),
      categoryTimeSales: replaceIfNonEmpty(existing.categoryTimeSales, incoming.categoryTimeSales),
      departmentKpi: replaceIfNonEmpty(existing.departmentKpi, incoming.departmentKpi),
      interStoreIn: replaceIfNonEmpty(existing.interStoreIn, incoming.interStoreIn),
      interStoreOut: replaceIfNonEmpty(existing.interStoreOut, incoming.interStoreOut),
      flowers: replaceIfNonEmpty(existing.flowers, incoming.flowers),
      directProduce: replaceIfNonEmpty(existing.directProduce, incoming.directProduce),
      consumables: replaceIfNonEmpty(existing.consumables, incoming.consumables),
      settings: new Map([...existing.settings, ...incoming.settings]),
      budget: new Map([...existing.budget, ...incoming.budget]),
    }
  }

  // keep-existing: 挿入のみマージ
  return mergeMonthlyInsertsOnly(existing, incoming, new Set())
}

/**
 * 既存データに新規挿入分のみをマージして返す。
 * 既存に値がある場合は変更しない。
 */
export function mergeMonthlyInsertsOnly(
  existing: MonthlyData,
  incoming: MonthlyData,
  importedTypes: ReadonlySet<string>,
): MonthlyData {
  const has = (t: string) => importedTypes.size === 0 || importedTypes.has(t)

  return {
    ...existing,
    purchase: has('purchase')
      ? mergeRecordInserts(existing.purchase, incoming.purchase, purchaseRecordKey)
      : existing.purchase,
    classifiedSales: has('classifiedSales')
      ? mergeCSInserts(existing.classifiedSales, incoming.classifiedSales)
      : existing.classifiedSales,
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

// ─── 内部ヘルパー ──────────────────────────────────────

function datedRecordKey(rec: { storeId: string; day: number }): string {
  return `${rec.storeId}\t${rec.day}`
}

function purchaseRecordKey(rec: { storeId: string; day: number }): string {
  return `${rec.storeId}\t${rec.day}`
}

function replaceIfNonEmpty<T extends { readonly records: readonly unknown[] }>(
  existing: T,
  incoming: T,
): T {
  return incoming.records.length > 0 ? incoming : existing
}

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
