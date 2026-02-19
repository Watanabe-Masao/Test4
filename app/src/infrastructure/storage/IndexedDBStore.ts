/**
 * IndexedDB 永続化層
 *
 * データを「年月 × データ種別」単位で保存・取得する。
 * idb ライブラリ不使用（ネイティブ API のみ）。
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
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

// ─── 低レベルヘルパー ────────────────────────────────────

async function dbPut(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
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

async function dbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
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

/** BudgetData の Map<number,number> → plain object */
function budgetToSerializable(b: BudgetData): object {
  return {
    storeId: b.storeId,
    total: b.total,
    daily: mapToObj(b.daily as unknown as ReadonlyMap<string, number>),
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

// ─── 公開 API ────────────────────────────────────────────

/** メタデータ */
export interface PersistedMeta {
  readonly year: number
  readonly month: number
  readonly savedAt: string // ISO 8601
}

/**
 * ImportedData を年月単位で IndexedDB に保存する。
 * 各データ種別は独立したキーで全置換される。
 */
export async function saveImportedData(
  data: ImportedData,
  year: number,
  month: number,
): Promise<void> {
  // StoreDayRecord 系
  for (const { field, type } of STORE_DAY_FIELDS) {
    const key = monthKey(year, month, type)
    await dbPut(STORE_MONTHLY, key, data[field])
  }

  // Map 系 → plain object に変換して保存
  await dbPut(STORE_MONTHLY, monthKey(year, month, 'stores'), mapToObj(data.stores))
  await dbPut(STORE_MONTHLY, monthKey(year, month, 'suppliers'), mapToObj(data.suppliers))
  await dbPut(
    STORE_MONTHLY,
    monthKey(year, month, 'settings'),
    mapToObj(data.settings),
  )
  await dbPut(
    STORE_MONTHLY,
    monthKey(year, month, 'budget'),
    Object.fromEntries(
      Array.from(data.budget.entries()).map(([k, v]) => [k, budgetToSerializable(v)]),
    ),
  )

  // メタデータ
  await dbPut(STORE_META, 'lastSession', {
    year,
    month,
    savedAt: new Date().toISOString(),
  } satisfies PersistedMeta)
}

/**
 * 指定年月の ImportedData を IndexedDB から読み込む。
 * 保存されていない場合は null を返す。
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
    result[field] = val ?? base[field]
  }

  // stores
  const rawStores = await dbGet<Record<string, Store>>(
    STORE_MONTHLY,
    monthKey(year, month, 'stores'),
  )
  result.stores = rawStores ? new Map(Object.entries(rawStores)) : new Map()

  // suppliers
  const rawSuppliers = await dbGet<Record<string, { code: string; name: string }>>(
    STORE_MONTHLY,
    monthKey(year, month, 'suppliers'),
  )
  result.suppliers = rawSuppliers ? new Map(Object.entries(rawSuppliers)) : new Map()

  // settings (InventoryConfig)
  const rawSettings = await dbGet<Record<string, InventoryConfig>>(
    STORE_MONTHLY,
    monthKey(year, month, 'settings'),
  )
  result.settings = rawSettings ? new Map(Object.entries(rawSettings)) : new Map()

  // budget
  const rawBudget = await dbGet<Record<string, Record<string, unknown>>>(
    STORE_MONTHLY,
    monthKey(year, month, 'budget'),
  )
  if (rawBudget) {
    const budgetMap = new Map<string, BudgetData>()
    for (const [k, v] of Object.entries(rawBudget)) {
      budgetMap.set(k, budgetFromSerializable(v))
    }
    result.budget = budgetMap
  } else {
    result.budget = new Map()
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
 * 指定年月のデータを全て削除する
 */
export async function clearMonthData(year: number, month: number): Promise<void> {
  for (const { type } of STORE_DAY_FIELDS) {
    await dbDelete(STORE_MONTHLY, monthKey(year, month, type))
  }
  await dbDelete(STORE_MONTHLY, monthKey(year, month, 'stores'))
  await dbDelete(STORE_MONTHLY, monthKey(year, month, 'suppliers'))
  await dbDelete(STORE_MONTHLY, monthKey(year, month, 'settings'))
  await dbDelete(STORE_MONTHLY, monthKey(year, month, 'budget'))
}

/**
 * 全データを削除する
 */
export async function clearAllData(): Promise<void> {
  const keys = await dbGetAllKeys(STORE_MONTHLY)
  for (const key of keys) {
    await dbDelete(STORE_MONTHLY, key as string)
  }
  await dbDelete(STORE_META, 'lastSession')
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
 */
export async function saveDataSlice(
  data: ImportedData,
  year: number,
  month: number,
  dataTypes: readonly DataType[],
): Promise<void> {
  for (const dt of dataTypes) {
    const fieldDef = STORE_DAY_FIELDS.find((f) => f.type === dt)
    if (fieldDef) {
      await dbPut(STORE_MONTHLY, monthKey(year, month, dt), data[fieldDef.field])
    }
  }
  // 常に stores / suppliers を更新
  await dbPut(STORE_MONTHLY, monthKey(year, month, 'stores'), mapToObj(data.stores))
  await dbPut(STORE_MONTHLY, monthKey(year, month, 'suppliers'), mapToObj(data.suppliers))
  await dbPut(
    STORE_MONTHLY,
    monthKey(year, month, 'settings'),
    mapToObj(data.settings),
  )
  await dbPut(
    STORE_MONTHLY,
    monthKey(year, month, 'budget'),
    Object.fromEntries(
      Array.from(data.budget.entries()).map(([k, v]) => [k, budgetToSerializable(v)]),
    ),
  )

  // メタ更新
  await dbPut(STORE_META, 'lastSession', {
    year,
    month,
    savedAt: new Date().toISOString(),
  } satisfies PersistedMeta)
}
