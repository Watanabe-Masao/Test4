/**
 * データサマリー純粋関数群
 *
 * ImportedData から表示用のサマリー情報を算出する。
 * Presentation 層が .records を直接走査することを防ぐため、
 * ここで全てのレコード走査を集約する。
 */
import type {
  ImportedData,
  DataType,
  Store,
  ClassifiedSalesData,
  CategoryTimeSalesData,
  DatedRecord,
} from '@/domain/models'

// ─── 型定義 ──────────────────────────────────────────

/** レコード配列の統計情報 */
export interface RecordSetStats {
  readonly recordCount: number
  readonly storeCount: number
  readonly dayRange: { readonly min: number; readonly max: number } | null
}

/** データ種別ごとの詳細統計（ImportHistoryTab 用） */
export interface StoreDayStats {
  readonly label: string
  readonly storeCount: number
  readonly totalRecords: number
  readonly dayRange: { readonly min: number; readonly max: number } | null
  readonly perStore: readonly {
    readonly storeId: string
    readonly storeName: string
    readonly days: number
    readonly minDay: number
    readonly maxDay: number
  }[]
  readonly hasCustomers: boolean
}

// ─── 基本判定 ────────────────────────────────────────

/** データが1つでも存在するか（NavBar 用） */
export function computeHasAnyData(data: ImportedData): boolean {
  return (
    (data.purchase?.records?.length ?? 0) > 0 || (data.classifiedSales?.records?.length ?? 0) > 0
  )
}

// ─── ロード状態 ──────────────────────────────────────

/** ロード済みデータ種別の一覧（DataManagementSidebar 用） */
export function computeLoadedTypes(data: ImportedData): ReadonlySet<DataType> {
  const types = new Set<DataType>()
  try {
    if (data.purchase?.records?.length > 0) types.add('purchase')
    if (data.classifiedSales?.records?.length > 0) types.add('classifiedSales')
    if (data.settings?.size > 0) types.add('initialSettings')
    if (data.budget?.size > 0) types.add('budget')
    if (data.consumables?.records?.length > 0) types.add('consumables')
    if (data.categoryTimeSales?.records?.length > 0) types.add('categoryTimeSales')
    if (data.flowers?.records?.length > 0) types.add('flowers')
    if (data.directProduce?.records?.length > 0) types.add('directProduce')
    if (data.interStoreIn?.records?.length > 0) types.add('interStoreIn')
    if (data.interStoreOut?.records?.length > 0) types.add('interStoreOut')
  } catch {
    // データ構造不整合時は空のセットを返す
  }
  return types
}

/** レコード配列の最大日を取得 */
function maxDayOfRecords(records: readonly { readonly day: number }[]): number {
  let max = 0
  for (const rec of records) {
    if (rec.day > max) max = rec.day
  }
  return max
}

/** データ種別ごとの最大日（DataManagementSidebar 用） */
export function computeMaxDayByType(data: ImportedData): ReadonlyMap<DataType, number> {
  const m = new Map<DataType, number>()
  try {
    const recordTypes: [DataType, { readonly records: readonly { readonly day: number }[] }][] = [
      ['classifiedSales', data.classifiedSales],
      ['categoryTimeSales', data.categoryTimeSales],
      ['purchase', data.purchase],
      ['flowers', data.flowers],
      ['directProduce', data.directProduce],
      ['interStoreIn', data.interStoreIn],
      ['interStoreOut', data.interStoreOut],
      ['consumables', data.consumables],
    ]
    for (const [dt, d] of recordTypes) {
      if (d?.records?.length > 0) {
        const max = maxDayOfRecords(d.records)
        if (max > 0) m.set(dt, max)
      }
    }
  } catch {
    // データ構造不整合時は空を返す
  }
  return m
}

// ─── レコード統計 ────────────────────────────────────

/** CategoryTimeSalesData のレコード統計（ImportHistoryTab 用） */
export function computeCtsRecordStats(ctsData: CategoryTimeSalesData): RecordSetStats {
  const records = ctsData.records
  if (records.length === 0) {
    return { recordCount: 0, storeCount: 0, dayRange: null }
  }
  const storeIds = new Set<string>()
  let minDay = Infinity
  let maxDay = -Infinity
  for (const r of records) {
    storeIds.add(r.storeId)
    if (r.day < minDay) minDay = r.day
    if (r.day > maxDay) maxDay = r.day
  }
  return {
    recordCount: records.length,
    storeCount: storeIds.size,
    dayRange: minDay <= maxDay ? { min: minDay, max: maxDay } : null,
  }
}

/** ClassifiedSalesData から日セットを算出（PrevYearMappingTab 用） */
export function computeRecordDays(csData: ClassifiedSalesData): ReadonlySet<number> {
  const daySet = new Set<number>()
  for (const rec of csData.records) {
    daySet.add(rec.day)
  }
  return daySet
}

// ─── 詳細分析 ────────────────────────────────────────

/** フラットレコード配列から詳細統計を取得（ImportHistoryTab 用） */
export function analyzeFlatRecords<T extends DatedRecord>(
  records: readonly T[],
  label: string,
  storeNames: ReadonlyMap<string, Store>,
  checkCustomers = false,
): StoreDayStats {
  if (records.length === 0) {
    return {
      label,
      storeCount: 0,
      totalRecords: 0,
      dayRange: null,
      perStore: [],
      hasCustomers: false,
    }
  }

  // Group by storeId → Set<day>
  const storeMap = new Map<string, Set<number>>()
  let hasCustomers = false

  for (const r of records) {
    let daySet = storeMap.get(r.storeId)
    if (!daySet) {
      daySet = new Set()
      storeMap.set(r.storeId, daySet)
    }
    daySet.add(r.day)

    if (checkCustomers && !hasCustomers) {
      const rec = r as Record<string, unknown>
      if (typeof rec.customers === 'number' && rec.customers > 0) {
        hasCustomers = true
      }
    }
  }

  let globalMin = Infinity
  let globalMax = -Infinity
  let totalRecords = 0
  const perStore: StoreDayStats['perStore'][number][] = []

  for (const [sid, daySet] of storeMap) {
    const days = Array.from(daySet)
    const min = Math.min(...days)
    const max = Math.max(...days)
    if (min < globalMin) globalMin = min
    if (max > globalMax) globalMax = max
    totalRecords += days.length
    const store = storeNames.get(sid)
    perStore.push({
      storeId: sid,
      storeName: store?.name ?? `店舗${sid}`,
      days: days.length,
      minDay: min,
      maxDay: max,
    })
  }

  return {
    label,
    storeCount: storeMap.size,
    totalRecords,
    dayRange: globalMin <= globalMax ? { min: globalMin, max: globalMax } : null,
    perStore,
    hasCustomers,
  }
}

/** ClassifiedSalesData から StoreDayStats を生成（ImportHistoryTab 用） */
export function analyzeClassifiedSales(
  data: ImportedData,
  label: string,
  isPrevYear: boolean,
): StoreDayStats {
  const csData = isPrevYear ? data.prevYearClassifiedSales : data.classifiedSales
  const records = csData.records
  if (records.length === 0) {
    return {
      label,
      storeCount: 0,
      totalRecords: 0,
      dayRange: null,
      perStore: [],
      hasCustomers: false,
    }
  }

  const storeMap = new Map<string, Set<number>>()
  for (const r of records) {
    let s = storeMap.get(r.storeId)
    if (!s) {
      s = new Set()
      storeMap.set(r.storeId, s)
    }
    s.add(r.day)
  }

  let globalMin = Infinity
  let globalMax = -Infinity
  let totalRecords = 0
  const perStore: StoreDayStats['perStore'][number][] = []

  for (const [sid, daySet] of storeMap) {
    const days = Array.from(daySet)
    const min = Math.min(...days)
    const max = Math.max(...days)
    if (min < globalMin) globalMin = min
    if (max > globalMax) globalMax = max
    totalRecords += days.length
    const store = data.stores.get(sid)
    perStore.push({
      storeId: sid,
      storeName: store?.name ?? `店舗${sid}`,
      days: days.length,
      minDay: min,
      maxDay: max,
    })
  }

  return {
    label,
    storeCount: storeMap.size,
    totalRecords,
    dayRange: globalMin <= globalMax ? { min: globalMin, max: globalMax } : null,
    perStore,
    hasCustomers: false,
  }
}

/** 全データタイプの概要を構築（ImportHistoryTab 用） */
export function buildDataOverview(data: ImportedData): StoreDayStats[] {
  const stores = data.stores
  return [
    analyzeFlatRecords(data.purchase.records, '仕入', stores),
    analyzeClassifiedSales(data, '分類別売上', false),
    analyzeFlatRecords(data.flowers.records, '花', stores, true),
    analyzeFlatRecords(data.directProduce.records, '産直', stores),
    analyzeFlatRecords(data.interStoreIn.records, '店間入', stores),
    analyzeFlatRecords(data.interStoreOut.records, '店間出', stores),
    analyzeFlatRecords(data.consumables.records, '消耗品', stores),
    analyzeClassifiedSales(data, '前年分類別売上', true),
  ]
}
