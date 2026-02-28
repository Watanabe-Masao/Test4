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
} from '@/domain/models'
import { maxDayOfRecord } from '@/domain/calculations/utils'

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
  return Object.keys(data.purchase).length > 0 || data.classifiedSales.records.length > 0
}

// ─── ロード状態 ──────────────────────────────────────

/** ロード済みデータ種別の一覧（DataManagementSidebar 用） */
export function computeLoadedTypes(data: ImportedData): ReadonlySet<DataType> {
  const types = new Set<DataType>()
  try {
    if (data.purchase && Object.keys(data.purchase).length > 0) types.add('purchase')
    if (data.classifiedSales?.records?.length > 0) types.add('classifiedSales')
    if (data.settings?.size > 0) types.add('initialSettings')
    if (data.budget?.size > 0) types.add('budget')
    if (data.consumables && Object.keys(data.consumables).length > 0) types.add('consumables')
    if (data.categoryTimeSales?.records?.length > 0) types.add('categoryTimeSales')
    if (data.flowers && Object.keys(data.flowers).length > 0) types.add('flowers')
    if (data.directProduce && Object.keys(data.directProduce).length > 0) types.add('directProduce')
    if (data.interStoreIn && Object.keys(data.interStoreIn).length > 0) types.add('interStoreIn')
    if (data.interStoreOut && Object.keys(data.interStoreOut).length > 0) types.add('interStoreOut')
  } catch {
    // データ構造不整合時は空のセットを返す
  }
  return types
}

/** データ種別ごとの最大日（DataManagementSidebar 用） */
export function computeMaxDayByType(data: ImportedData): ReadonlyMap<DataType, number> {
  const m = new Map<DataType, number>()
  try {
    // レコードベース（records[] 持ち）
    if (data.classifiedSales?.records?.length > 0) {
      let max = 0
      for (const rec of data.classifiedSales.records) {
        if (rec.day > max) max = rec.day
      }
      if (max > 0) m.set('classifiedSales', max)
    }
    if (data.categoryTimeSales?.records?.length > 0) {
      let max = 0
      for (const rec of data.categoryTimeSales.records) {
        if (rec.day > max) max = rec.day
      }
      if (max > 0) m.set('categoryTimeSales', max)
    }
    // StoreDayRecord ベース
    const sdrTypes: [DataType, { readonly [s: string]: { readonly [d: number]: unknown } }][] = [
      ['purchase', data.purchase],
      ['flowers', data.flowers],
      ['directProduce', data.directProduce],
      ['interStoreIn', data.interStoreIn],
      ['interStoreOut', data.interStoreOut],
      ['consumables', data.consumables],
    ]
    for (const [dt, rec] of sdrTypes) {
      const max = maxDayOfRecord(rec)
      if (max > 0) m.set(dt, max)
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

/** StoreDayRecord 型のデータから詳細統計を取得（ImportHistoryTab 用） */
export function analyzeStoreDayRecord(
  record: Record<string, Record<number, unknown>>,
  label: string,
  storeNames: ReadonlyMap<string, Store>,
  checkCustomers = false,
): StoreDayStats {
  const storeIds = Object.keys(record)
  if (storeIds.length === 0) {
    return {
      label,
      storeCount: 0,
      totalRecords: 0,
      dayRange: null,
      perStore: [],
      hasCustomers: false,
    }
  }

  let globalMin = Infinity
  let globalMax = -Infinity
  let totalRecords = 0
  let hasCustomers = false
  const perStore: StoreDayStats['perStore'][number][] = []

  for (const sid of storeIds) {
    const days = Object.keys(record[sid])
      .map(Number)
      .filter((d) => !isNaN(d))
    if (days.length === 0) continue
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

    if (checkCustomers && !hasCustomers) {
      for (const d of days) {
        const entry = record[sid][d] as Record<string, unknown>
        if (entry && typeof entry.customers === 'number' && entry.customers > 0) {
          hasCustomers = true
          break
        }
      }
    }
  }

  return {
    label,
    storeCount: storeIds.length,
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
    analyzeStoreDayRecord(data.purchase, '仕入', stores),
    analyzeClassifiedSales(data, '分類別売上', false),
    analyzeStoreDayRecord(data.flowers, '花', stores, true),
    analyzeStoreDayRecord(data.directProduce, '産直', stores),
    analyzeStoreDayRecord(data.interStoreIn, '店間入', stores),
    analyzeStoreDayRecord(data.interStoreOut, '店間出', stores),
    analyzeStoreDayRecord(data.consumables, '消耗品', stores),
    analyzeClassifiedSales(data, '前年分類別売上', true),
  ]
}
