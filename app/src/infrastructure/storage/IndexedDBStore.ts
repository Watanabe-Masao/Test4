/**
 * IndexedDB 永続化層
 *
 * データを「年月 × データ種別」単位で保存・取得する。
 * idb ライブラリ不使用（ネイティブ API のみ）。
 *
 * 改善点:
 * - 単一トランザクションによる原子的な保存 (#8)
 * - budgetToSerializable の安全な型変換 (#5)
 * - clearMonthData 時の lastSession メタ更新 (#7)
 * - loadImportedData の基本スキーマ検証 (#9)
 * - DB 接続断時の自動再接続 (#14)
 */
import type { ImportedData, DataType } from '@/domain/models'
import type { BudgetData, InventoryConfig, Store } from '@/domain/models'
import { createEmptyImportedData } from '@/domain/models'

// ─── DB 定数 ──────────────────────────────────────────────

const DB_NAME = 'shiire-arari-db'
const DB_VERSION = 1

/** オブジェクトストア名 */
const STORE_MONTHLY = 'monthlyData'
const STORE_META = 'metadata'

// ─── DB 接続 ─────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_MONTHLY)) {
        db.createObjectStore(STORE_MONTHLY)
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META)
      }
    }
    request.onsuccess = () => {
      const db = request.result
      // 接続断時に自動再接続できるよう dbPromise をクリア
      db.onclose = () => { dbPromise = null }
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

/**
 * DB接続が切断されている場合にリセットして再接続する
 */
function resetDBConnection(): void {
  dbPromise = null
}

// ─── 低レベルヘルパー ────────────────────────────────────

/**
 * 単一トランザクションで複数のキー/値を一括書き込みする。
 * 全操作が成功するか、全て失敗（ロールバック）するかのいずれか。
 */
async function dbBatchPut(
  entries: readonly { storeName: string; key: string; value: unknown }[],
): Promise<void> {
  const db = await openDB()
  // 使用するストア名を収集
  const storeNames = [...new Set(entries.map((e) => e.storeName))]
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite')
    for (const { storeName, key, value } of entries) {
      tx.objectStore(storeName).put(value, key)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => {
      // 接続断の可能性があるためリセット
      if (tx.error?.name === 'InvalidStateError') resetDBConnection()
      reject(tx.error)
    }
    tx.onabort = () => {
      reject(tx.error ?? new Error('Transaction aborted'))
    }
  })
}

async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

/**
 * 単一トランザクションで複数キーを一括削除する。
 */
async function dbBatchDelete(
  entries: readonly { storeName: string; key: string }[],
): Promise<void> {
  if (entries.length === 0) return
  const db = await openDB()
  const storeNames = [...new Set(entries.map((e) => e.storeName))]
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite')
    for (const { storeName, key } of entries) {
      tx.objectStore(storeName).delete(key)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
}

async function dbGetAllKeys(storeName: string): Promise<string[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAllKeys()
    req.onsuccess = () => resolve(req.result as string[])
    req.onerror = () => reject(req.error)
  })
}

// ─── シリアライズ / デシリアライズ ───────────────────────

/** Map → plain object（JSON 互換にする） */
function mapToObj<V>(map: ReadonlyMap<string, V>): Record<string, V> {
  const obj: Record<string, V> = {}
  for (const [k, v] of map) obj[k] = v
  return obj
}

/** BudgetData.daily (Map<number,number>) → plain object (Record<string,number>) */
function budgetToSerializable(b: BudgetData): object {
  const dailyObj: Record<string, number> = {}
  for (const [day, amount] of b.daily) {
    dailyObj[String(day)] = amount
  }
  return {
    storeId: b.storeId,
    total: b.total,
    daily: dailyObj,
  }
}

function budgetFromSerializable(obj: Record<string, unknown>): BudgetData {
  const daily = new Map<number, number>()
  const rawDaily = obj.daily as Record<string, number> | undefined
  if (rawDaily) {
    for (const [k, v] of Object.entries(rawDaily)) {
      daily.set(Number(k), v)
    }
  }
  return {
    storeId: obj.storeId as string,
    total: obj.total as number,
    daily,
  }
}

// ─── 保存キー生成 ────────────────────────────────────────

function monthKey(year: number, month: number, dataType: string): string {
  return `${year}-${String(month).padStart(2, '0')}_${dataType}`
}

// ─── ImportedData に含まれるデータ種別一覧 ───────────────

/** StoreDayRecord 系のフィールド名 → DataType マッピング */
const STORE_DAY_FIELDS: readonly { field: keyof ImportedData; type: string }[] = [
  { field: 'purchase', type: 'purchase' },
  { field: 'sales', type: 'sales' },
  { field: 'discount', type: 'discount' },
  { field: 'prevYearSales', type: 'prevYearSales' },
  { field: 'prevYearDiscount', type: 'prevYearDiscount' },
  { field: 'interStoreIn', type: 'interStoreIn' },
  { field: 'interStoreOut', type: 'interStoreOut' },
  { field: 'flowers', type: 'flowers' },
  { field: 'directProduce', type: 'directProduce' },
  { field: 'consumables', type: 'consumables' },
]

// ─── スキーマ検証 ────────────────────────────────────────

/** ロードしたデータの基本構造を検証する */
function validateLoadedData(result: Record<string, unknown>): boolean {
  // StoreDayRecord 系: object であること
  for (const { field } of STORE_DAY_FIELDS) {
    if (result[field] != null && typeof result[field] !== 'object') return false
  }
  // Map 系: Map インスタンスであること
  if (!(result.stores instanceof Map)) return false
  if (!(result.suppliers instanceof Map)) return false
  if (!(result.settings instanceof Map)) return false
  if (!(result.budget instanceof Map)) return false
  // categoryTimeSales: records 配列を持つこと
  const cts = result.categoryTimeSales as { records?: unknown } | undefined
  if (cts && (!Array.isArray(cts.records))) return false
  const pcts = result.prevYearCategoryTimeSales as { records?: unknown } | undefined
  if (pcts && (!Array.isArray(pcts.records))) return false
  return true
}

// ─── 公開 API ────────────────────────────────────────────

// ドメイン層で定義された型を再エクスポート
export type { PersistedMeta } from '@/domain/models'
import type { PersistedMeta } from '@/domain/models'

/**
 * ImportedData を年月単位で IndexedDB に保存する。
 * 単一トランザクションで原子的に全データを書き込む。
 */
export async function saveImportedData(
  data: ImportedData,
  year: number,
  month: number,
): Promise<void> {
  const entries: { storeName: string; key: string; value: unknown }[] = []

  // StoreDayRecord 系
  for (const { field, type } of STORE_DAY_FIELDS) {
    entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, type), value: data[field] })
  }

  // Map 系 → plain object に変換して保存
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'stores'), value: mapToObj(data.stores) })
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'suppliers'), value: mapToObj(data.suppliers) })
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'settings'), value: mapToObj(data.settings) })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'budget'),
    value: Object.fromEntries(
      Array.from(data.budget.entries()).map(([k, v]) => [k, budgetToSerializable(v)]),
    ),
  })

  // categoryTimeSales
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'categoryTimeSales'), value: data.categoryTimeSales })

  // prevYearCategoryTimeSales
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'prevYearCategoryTimeSales'), value: data.prevYearCategoryTimeSales })

  // departmentKpi
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'departmentKpi'), value: data.departmentKpi })

  // メタデータ
  entries.push({
    storeName: STORE_META,
    key: 'lastSession',
    value: { year, month, savedAt: new Date().toISOString() } satisfies PersistedMeta,
  })

  await dbBatchPut(entries)
}

/**
 * 指定年月の ImportedData を IndexedDB から読み込む。
 * 保存されていない場合は null を返す。
 * 基本的なスキーマ検証を行い、不整合があれば null を返す。
 */
export async function loadImportedData(
  year: number,
  month: number,
): Promise<ImportedData | null> {
  const meta = await getPersistedMeta()
  if (!meta || meta.year !== year || meta.month !== month) return null

  const base = createEmptyImportedData()

  // StoreDayRecord 系
  const result: Record<string, unknown> = { ...base }
  for (const { field, type } of STORE_DAY_FIELDS) {
    const val = await dbGet<Record<string, unknown>>(STORE_MONTHLY, monthKey(year, month, type))
    if (val != null && typeof val === 'object') {
      result[field] = val
    }
  }

  // stores
  const rawStores = await dbGet<Record<string, Store>>(
    STORE_MONTHLY,
    monthKey(year, month, 'stores'),
  )
  result.stores = rawStores && typeof rawStores === 'object' ? new Map(Object.entries(rawStores)) : new Map()

  // suppliers
  const rawSuppliers = await dbGet<Record<string, { code: string; name: string }>>(
    STORE_MONTHLY,
    monthKey(year, month, 'suppliers'),
  )
  result.suppliers = rawSuppliers && typeof rawSuppliers === 'object' ? new Map(Object.entries(rawSuppliers)) : new Map()

  // settings (InventoryConfig)
  const rawSettings = await dbGet<Record<string, InventoryConfig>>(
    STORE_MONTHLY,
    monthKey(year, month, 'settings'),
  )
  result.settings = rawSettings && typeof rawSettings === 'object' ? new Map(Object.entries(rawSettings)) : new Map()

  // budget
  const rawBudget = await dbGet<Record<string, Record<string, unknown>>>(
    STORE_MONTHLY,
    monthKey(year, month, 'budget'),
  )
  if (rawBudget && typeof rawBudget === 'object') {
    const budgetMap = new Map<string, BudgetData>()
    for (const [k, v] of Object.entries(rawBudget)) {
      if (v && typeof v === 'object') {
        budgetMap.set(k, budgetFromSerializable(v as Record<string, unknown>))
      }
    }
    result.budget = budgetMap
  } else {
    result.budget = new Map()
  }

  // categoryTimeSales
  const rawCategoryTimeSales = await dbGet<{ records: unknown[] }>(
    STORE_MONTHLY,
    monthKey(year, month, 'categoryTimeSales'),
  )
  result.categoryTimeSales = rawCategoryTimeSales && Array.isArray(rawCategoryTimeSales.records)
    ? rawCategoryTimeSales
    : { records: [] }

  // prevYearCategoryTimeSales
  const rawPrevYearCategoryTimeSales = await dbGet<{ records: unknown[] }>(
    STORE_MONTHLY,
    monthKey(year, month, 'prevYearCategoryTimeSales'),
  )
  result.prevYearCategoryTimeSales = rawPrevYearCategoryTimeSales && Array.isArray(rawPrevYearCategoryTimeSales.records)
    ? rawPrevYearCategoryTimeSales
    : { records: [] }

  // departmentKpi
  const rawDeptKpi = await dbGet<{ records: unknown[] }>(
    STORE_MONTHLY,
    monthKey(year, month, 'departmentKpi'),
  )
  result.departmentKpi = rawDeptKpi && Array.isArray(rawDeptKpi.records)
    ? rawDeptKpi
    : { records: [] }

  // スキーマ検証
  if (!validateLoadedData(result)) {
    console.warn('[IndexedDBStore] Loaded data failed schema validation, returning null')
    return null
  }

  return result as unknown as ImportedData
}

/**
 * 最後に保存したセッションのメタデータを取得する
 */
export async function getPersistedMeta(): Promise<PersistedMeta | null> {
  const meta = await dbGet<PersistedMeta>(STORE_META, 'lastSession')
  return meta ?? null
}

/**
 * 指定年月のデータを全て削除する。
 * 削除対象が lastSession と一致する場合はメタデータもクリアする。
 */
export async function clearMonthData(year: number, month: number): Promise<void> {
  const deleteEntries: { storeName: string; key: string }[] = []

  for (const { type } of STORE_DAY_FIELDS) {
    deleteEntries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, type) })
  }
  deleteEntries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'stores') })
  deleteEntries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'suppliers') })
  deleteEntries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'settings') })
  deleteEntries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'budget') })
  deleteEntries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'categoryTimeSales') })
  deleteEntries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'prevYearCategoryTimeSales') })
  deleteEntries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'departmentKpi') })

  // lastSession が当該年月の場合はメタデータも削除
  const meta = await getPersistedMeta()
  if (meta && meta.year === year && meta.month === month) {
    deleteEntries.push({ storeName: STORE_META, key: 'lastSession' })
  }

  await dbBatchDelete(deleteEntries)
}

/**
 * 全データを削除する
 */
export async function clearAllData(): Promise<void> {
  const keys = await dbGetAllKeys(STORE_MONTHLY)
  const deleteEntries: { storeName: string; key: string }[] = keys.map((key) => ({
    storeName: STORE_MONTHLY,
    key,
  }))
  deleteEntries.push({ storeName: STORE_META, key: 'lastSession' })
  await dbBatchDelete(deleteEntries)
}

/**
 * 任意の年月・データ種別のスライスを IndexedDB から直接読み込む。
 * lastSession メタデータに関係なく、保存されていれば返す。
 * 保存されていない場合は null を返す。
 */
export async function loadMonthlySlice<T>(
  year: number,
  month: number,
  dataType: string,
): Promise<T | null> {
  const key = monthKey(year, month, dataType)
  const val = await dbGet<T>(STORE_MONTHLY, key)
  return val ?? null
}

/**
 * IndexedDB に保存されている全ての年月を一覧取得する。
 * キー形式 `YYYY-MM_dataType` をパースし、ユニークな年月リストを返す。
 */
export async function listStoredMonths(): Promise<{ year: number; month: number }[]> {
  const keys = await dbGetAllKeys(STORE_MONTHLY)
  const monthSet = new Set<string>()
  for (const key of keys) {
    const match = (key as string).match(/^(\d{4})-(\d{2})_/)
    if (match) {
      monthSet.add(`${match[1]}-${match[2]}`)
    }
  }
  return Array.from(monthSet)
    .map((ym) => {
      const [y, m] = ym.split('-')
      return { year: Number(y), month: Number(m) }
    })
    .sort((a, b) => b.year - a.year || b.month - a.month)
}

/** 特定年月のデータ種別ごとのレコード数サマリーを取得する */
export async function getMonthDataSummary(
  year: number,
  month: number,
): Promise<{ dataType: string; label: string; recordCount: number }[]> {
  const SUMMARY_TYPES: { type: string; label: string }[] = [
    ...STORE_DAY_FIELDS.map((f) => ({ type: f.type, label: DATA_TYPE_LABELS[f.type] ?? f.type })),
    { type: 'categoryTimeSales', label: '分類別時間帯売上' },
    { type: 'prevYearCategoryTimeSales', label: '前年分類別時間帯売上' },
    { type: 'departmentKpi', label: '部門KPI' },
    { type: 'stores', label: '店舗' },
    { type: 'suppliers', label: '取引先' },
    { type: 'settings', label: '在庫設定' },
    { type: 'budget', label: '予算' },
  ]

  const results: { dataType: string; label: string; recordCount: number }[] = []
  for (const { type, label } of SUMMARY_TYPES) {
    const val = await dbGet<unknown>(STORE_MONTHLY, monthKey(year, month, type))
    if (!val) {
      results.push({ dataType: type, label, recordCount: 0 })
      continue
    }
    let count = 0
    if (type === 'categoryTimeSales' || type === 'prevYearCategoryTimeSales' || type === 'departmentKpi') {
      count = ((val as { records?: unknown[] }).records ?? []).length
    } else if (type === 'stores' || type === 'suppliers' || type === 'settings' || type === 'budget') {
      count = Object.keys(val as Record<string, unknown>).length
    } else {
      // StoreDayRecord: storeId → day → entry
      const rec = val as Record<string, Record<string, unknown>>
      for (const days of Object.values(rec)) {
        count += Object.keys(days).length
      }
    }
    results.push({ dataType: type, label, recordCount: count })
  }
  return results
}

/** データ種別の日本語ラベル */
const DATA_TYPE_LABELS: Record<string, string> = {
  purchase: '仕入',
  sales: '売上',
  discount: '売変',
  prevYearSales: '前年売上',
  prevYearDiscount: '前年売変',
  interStoreIn: '店間入',
  interStoreOut: '店間出',
  flowers: '花',
  directProduce: '産直',
  consumables: '消耗品',
}

/**
 * IndexedDB が利用可能か判定する
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

// ─── 特定データ種別の保存（インポート時に差分チェック後に使用） ───

/**
 * 指定データ種別のみを保存する（全置換）。
 * インポート後に差分承認されたデータを反映するために使用。
 * 単一トランザクションで原子的に書き込む。
 */
export async function saveDataSlice(
  data: ImportedData,
  year: number,
  month: number,
  dataTypes: readonly DataType[],
): Promise<void> {
  const entries: { storeName: string; key: string; value: unknown }[] = []

  for (const dt of dataTypes) {
    if (dt === 'categoryTimeSales') {
      entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'categoryTimeSales'), value: data.categoryTimeSales })
      continue
    }
    if (dt === 'prevYearCategoryTimeSales') {
      entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'prevYearCategoryTimeSales'), value: data.prevYearCategoryTimeSales })
      continue
    }
    if (dt === 'departmentKpi') {
      entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'departmentKpi'), value: data.departmentKpi })
      continue
    }
    // salesDiscount / prevYearSalesDiscount / initialSettings / budget は
    // DataType として存在するがストレージでは個別フィールドとして保存しない（composite type）
    // → STORE_DAY_FIELDS で一致するもののみ保存
    const fieldDef = STORE_DAY_FIELDS.find((f) => f.type === dt)
    if (fieldDef) {
      entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, dt), value: data[fieldDef.field] })
    }
  }

  // 常に stores / suppliers / settings / budget を更新
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'stores'), value: mapToObj(data.stores) })
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'suppliers'), value: mapToObj(data.suppliers) })
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'settings'), value: mapToObj(data.settings) })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'budget'),
    value: Object.fromEntries(
      Array.from(data.budget.entries()).map(([k, v]) => [k, budgetToSerializable(v)]),
    ),
  })

  // メタ更新
  entries.push({
    storeName: STORE_META,
    key: 'lastSession',
    value: { year, month, savedAt: new Date().toISOString() } satisfies PersistedMeta,
  })

  await dbBatchPut(entries)
}
