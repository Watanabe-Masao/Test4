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
import type { ImportedData, DataType, DataOrigin, DataEnvelope, ImportHistoryEntry, StoreDaySummaryCache } from '@/domain/models'
import type { BudgetData, InventoryConfig, Store } from '@/domain/models'
import { createEmptyImportedData, isEnvelope } from '@/domain/models'
import { hashData } from '@/application/services/murmurhash'

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

// ─── Envelope ラッパー ────────────────────────────────────

// ─── NaN / Infinity サニタイズ ────────────────────────────

/**
 * JSON シリアライズで失われる不正な数値（NaN, ±Infinity）を 0 に正規化する。
 * IndexedDB は structured clone なので NaN を保持できるが、
 * 下流の計算で予期せぬ結果を引き起こすため、保存前に除去する。
 */
function sanitizeNumericValues<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (typeof value === 'number') {
    return (Number.isFinite(value) ? value : 0) as T
  }
  if (typeof value !== 'object') return value

  if (Array.isArray(value)) {
    return value.map(sanitizeNumericValues) as T
  }

  if (value instanceof Map) {
    const result = new Map<unknown, unknown>()
    for (const [k, v] of value) {
      result.set(k, sanitizeNumericValues(v))
    }
    return result as T
  }

  const obj = value as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k] = sanitizeNumericValues(v)
  }
  return result as T
}

/** 値を DataEnvelope 形式でラップして保存用にする（チェックサム付き） */
function wrapEnvelope<T>(value: T, year: number, month: number, sourceFile?: string): DataEnvelope<T> {
  const sanitized = sanitizeNumericValues(value)
  return {
    origin: {
      year,
      month,
      importedAt: new Date().toISOString(),
      sourceFile,
    },
    payload: sanitized,
    checksum: hashData(sanitized),
  }
}

/**
 * IndexedDB から読み出した値を unwrap する。
 * - 新形式（DataEnvelope）: origin の整合性とチェックサムを検証し payload を返す
 * - 旧形式（生データ）: そのまま返す（漸進的マイグレーション）
 */
function unwrapEnvelope<T>(raw: unknown, year: number, month: number): { value: T; origin: DataOrigin | null } | null {
  if (raw === undefined || raw === null) return null

  if (isEnvelope(raw)) {
    // 整合性チェック: origin の年月がキーの年月と一致するか
    if (raw.origin.year !== year || raw.origin.month !== month) {
      console.warn(
        `[IndexedDBStore] Integrity mismatch: origin ${raw.origin.year}-${raw.origin.month} !== key ${year}-${month}`,
      )
      return null
    }

    // チェックサム検証: 保存時のハッシュとペイロードの現在ハッシュを照合
    const envelope = raw as DataEnvelope<T>
    if (typeof envelope.checksum === 'number') {
      const currentHash = hashData(envelope.payload)
      if (currentHash !== envelope.checksum) {
        console.warn(
          `[IndexedDBStore] Checksum mismatch for ${year}-${month}: stored=${envelope.checksum}, computed=${currentHash}. Data may be corrupted.`,
        )
        return null
      }
    }

    return { value: raw.payload as T, origin: raw.origin }
  }

  // 旧形式 — origin なしで返す
  return { value: raw as T, origin: null }
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

function budgetFromSerializable(obj: Record<string, unknown>): BudgetData | null {
  // storeId の型検証
  if (typeof obj.storeId !== 'string' || obj.storeId === '') return null
  // total の型・有限数検証
  const total = obj.total
  if (typeof total !== 'number' || !Number.isFinite(total)) return null

  const daily = new Map<number, number>()
  const rawDaily = obj.daily
  if (rawDaily != null && typeof rawDaily === 'object' && !Array.isArray(rawDaily)) {
    for (const [k, v] of Object.entries(rawDaily as Record<string, unknown>)) {
      const day = Number(k)
      if (Number.isFinite(day) && day >= 1 && day <= 31 && typeof v === 'number' && Number.isFinite(v)) {
        daily.set(day, v)
      }
    }
  }
  return {
    storeId: obj.storeId,
    total,
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
  // classifiedSales は配列形式のため STORE_DAY_FIELDS には含めない（個別処理）
  { field: 'interStoreIn', type: 'interStoreIn' },
  { field: 'interStoreOut', type: 'interStoreOut' },
  { field: 'flowers', type: 'flowers' },
  { field: 'directProduce', type: 'directProduce' },
  { field: 'consumables', type: 'consumables' },
]

// ─── スキーマ検証 ────────────────────────────────────────

/** 数値フィールドが有限数であることを検証する */
function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val)
}

/** StoreDayRecord の各エントリが object であることを検証する */
function isValidStoreDayRecord(data: unknown): boolean {
  if (data == null) return true
  if (typeof data !== 'object') return false
  for (const days of Object.values(data as Record<string, unknown>)) {
    if (days != null && typeof days !== 'object') return false
  }
  return true
}

/** ClassifiedSalesRecord の必須フィールドが妥当かチェック */
function isValidCSRecord(rec: unknown): boolean {
  if (rec == null || typeof rec !== 'object') return false
  const r = rec as Record<string, unknown>
  // 必須フィールド存在チェック
  if (!isFiniteNumber(r.year) || !isFiniteNumber(r.month) || !isFiniteNumber(r.day)) return false
  // 範囲チェック
  if (r.month < 1 || r.month > 12) return false
  if (r.day < 1 || r.day > 31) return false
  if (typeof r.storeId !== 'string' || r.storeId === '') return false
  if (!isFiniteNumber(r.salesAmount)) return false
  return true
}

/** CategoryTimeSalesRecord の必須フィールドが妥当かチェック */
function isValidCTSRecord(rec: unknown): boolean {
  if (rec == null || typeof rec !== 'object') return false
  const r = rec as Record<string, unknown>
  if (!isFiniteNumber(r.year) || !isFiniteNumber(r.month) || !isFiniteNumber(r.day)) return false
  if (r.month < 1 || r.month > 12) return false
  if (r.day < 1 || r.day > 31) return false
  if (typeof r.storeId !== 'string' || r.storeId === '') return false
  if (!isFiniteNumber(r.totalAmount)) return false
  return true
}

/** ロードしたデータの構造と内容を検証する */
function validateLoadedData(result: Record<string, unknown>): boolean {
  // StoreDayRecord 系: object であり、各エントリも object であること
  for (const { field } of STORE_DAY_FIELDS) {
    if (!isValidStoreDayRecord(result[field])) return false
  }
  // Map 系: Map インスタンスであること
  if (!(result.stores instanceof Map)) return false
  if (!(result.suppliers instanceof Map)) return false
  if (!(result.settings instanceof Map)) return false
  if (!(result.budget instanceof Map)) return false
  // classifiedSales: records 配列を持ち、各レコードが妥当であること
  const cs = result.classifiedSales as { records?: unknown } | undefined
  if (cs && (!Array.isArray(cs.records))) return false
  if (cs && Array.isArray(cs.records) && cs.records.length > 0) {
    // サンプリング検証: 先頭・末尾・中間のレコードをチェック
    const records = cs.records
    const indicesToCheck = [0, Math.floor(records.length / 2), records.length - 1]
    for (const idx of new Set(indicesToCheck)) {
      if (!isValidCSRecord(records[idx])) return false
    }
  }
  // categoryTimeSales: records 配列を持ち、各レコードが妥当であること
  const cts = result.categoryTimeSales as { records?: unknown } | undefined
  if (cts && (!Array.isArray(cts.records))) return false
  if (cts && Array.isArray(cts.records) && cts.records.length > 0) {
    const records = cts.records
    const indicesToCheck = [0, Math.floor(records.length / 2), records.length - 1]
    for (const idx of new Set(indicesToCheck)) {
      if (!isValidCTSRecord(records[idx])) return false
    }
  }
  // departmentKpi: records 配列を持つこと
  const dkpi = result.departmentKpi as { records?: unknown } | undefined
  if (dkpi && (!Array.isArray(dkpi.records))) return false
  // budget: 各エントリが妥当であること
  const budgetMap = result.budget as Map<string, unknown>
  for (const [key, val] of budgetMap) {
    if (typeof key !== 'string') return false
    if (val == null || typeof val !== 'object') return false
    const b = val as Record<string, unknown>
    if (typeof b.storeId !== 'string') return false
    if (!isFiniteNumber(b.total)) return false
    if (!(b.daily instanceof Map)) return false
  }
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

  // StoreDayRecord 系 — envelope 形式で保存
  for (const { field, type } of STORE_DAY_FIELDS) {
    entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, type), value: wrapEnvelope(data[field], year, month) })
  }

  // Map 系 → plain object に変換して envelope で保存
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'stores'), value: wrapEnvelope(mapToObj(data.stores), year, month) })
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'suppliers'), value: wrapEnvelope(mapToObj(data.suppliers), year, month) })
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'settings'), value: wrapEnvelope(mapToObj(data.settings), year, month) })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'budget'),
    value: wrapEnvelope(
      Object.fromEntries(
        Array.from(data.budget.entries()).map(([k, v]) => [k, budgetToSerializable(v)]),
      ),
      year,
      month,
    ),
  })

  // classifiedSales — envelope 形式で保存
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'classifiedSales'), value: wrapEnvelope(data.classifiedSales, year, month) })

  // prevYearClassifiedSales は DB に保存しない（実際の年月に classifiedSales として保存）

  // categoryTimeSales — envelope 形式で保存
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'categoryTimeSales'), value: wrapEnvelope(data.categoryTimeSales, year, month) })

  // prevYearCategoryTimeSales は DB に保存しない（実際の年月に categoryTimeSales として保存）

  // departmentKpi — envelope 形式で保存
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'departmentKpi'), value: wrapEnvelope(data.departmentKpi, year, month) })

  // メタデータ
  const savedAt = new Date().toISOString()
  entries.push({
    storeName: STORE_META,
    key: 'lastSession',
    value: { year, month, savedAt } satisfies PersistedMeta,
  })

  // sessions 一覧を更新（listStoredMonths の最適化用）
  await updateSessionsList(entries, year, month, savedAt)

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
  // stores キーの存在で当該年月にデータが保存されているかを判定する。
  const rawStoresEntry = await dbGet<unknown>(
    STORE_MONTHLY,
    monthKey(year, month, 'stores'),
  )
  if (rawStoresEntry === undefined) return null

  const base = createEmptyImportedData()

  // StoreDayRecord 系 — envelope 対応（新旧どちらの形式も読める）
  const result: Record<string, unknown> = { ...base }
  for (const { field, type } of STORE_DAY_FIELDS) {
    const raw = await dbGet<unknown>(STORE_MONTHLY, monthKey(year, month, type))
    const unwrapped = unwrapEnvelope<Record<string, unknown>>(raw, year, month)
    if (unwrapped && typeof unwrapped.value === 'object') {
      result[field] = unwrapped.value
    }
  }

  // stores — envelope unwrap
  const storesUnwrapped = unwrapEnvelope<Record<string, Store>>(rawStoresEntry, year, month)
  const storesObj = storesUnwrapped?.value
  result.stores = storesObj && typeof storesObj === 'object' ? new Map(Object.entries(storesObj)) : new Map()

  // suppliers — envelope unwrap
  const rawSuppliers = await dbGet<unknown>(STORE_MONTHLY, monthKey(year, month, 'suppliers'))
  const suppliersUnwrapped = unwrapEnvelope<Record<string, { code: string; name: string }>>(rawSuppliers, year, month)
  const suppliersObj = suppliersUnwrapped?.value
  result.suppliers = suppliersObj && typeof suppliersObj === 'object' ? new Map(Object.entries(suppliersObj)) : new Map()

  // settings — envelope unwrap
  const rawSettings = await dbGet<unknown>(STORE_MONTHLY, monthKey(year, month, 'settings'))
  const settingsUnwrapped = unwrapEnvelope<Record<string, InventoryConfig>>(rawSettings, year, month)
  const settingsObj = settingsUnwrapped?.value
  result.settings = settingsObj && typeof settingsObj === 'object' ? new Map(Object.entries(settingsObj)) : new Map()

  // budget — envelope unwrap
  const rawBudget = await dbGet<unknown>(STORE_MONTHLY, monthKey(year, month, 'budget'))
  const budgetUnwrapped = unwrapEnvelope<Record<string, Record<string, unknown>>>(rawBudget, year, month)
  const budgetObj = budgetUnwrapped?.value
  if (budgetObj && typeof budgetObj === 'object') {
    const budgetMap = new Map<string, BudgetData>()
    for (const [k, v] of Object.entries(budgetObj)) {
      if (v && typeof v === 'object') {
        const parsed = budgetFromSerializable(v as Record<string, unknown>)
        if (parsed) {
          budgetMap.set(k, parsed)
        } else {
          console.warn(`[IndexedDBStore] Invalid budget entry for store ${k}, skipping`)
        }
      }
    }
    result.budget = budgetMap
  } else {
    result.budget = new Map()
  }

  // classifiedSales — envelope unwrap + マイグレーション
  const rawCs = await dbGet<unknown>(STORE_MONTHLY, monthKey(year, month, 'classifiedSales'))
  const csUnwrapped = unwrapEnvelope<{ records: unknown[] }>(rawCs, year, month)
  const csObj = csUnwrapped?.value
  if (csObj && Array.isArray(csObj.records)) {
    // discount71-74 が欠けている古いデータを正規化
    csObj.records = csObj.records.map((rec: unknown) => ({
      discount71: 0,
      discount72: 0,
      discount73: 0,
      discount74: 0,
      ...(rec as Record<string, unknown>),
    }))
    result.classifiedSales = csObj
  } else {
    result.classifiedSales = { records: [] }
  }

  // prevYearClassifiedSales は DB に保存しないため読み込まない
  // (useAutoLoadPrevYear が実際の年月から classifiedSales を自動ロードする)

  // categoryTimeSales — envelope unwrap + year/month 補完
  const rawCts = await dbGet<unknown>(STORE_MONTHLY, monthKey(year, month, 'categoryTimeSales'))
  const ctsUnwrapped = unwrapEnvelope<{ records: unknown[] }>(rawCts, year, month)
  const ctsObj = ctsUnwrapped?.value
  if (ctsObj && Array.isArray(ctsObj.records)) {
    // 旧データで year/month が未設定のレコードを補完する。
    // DB キーの年月 = レコードの正しい年月なので安全に埋められる。
    result.categoryTimeSales = {
      records: ctsObj.records.map((rec) => {
        const r = rec as Record<string, unknown>
        if (r.year == null || r.month == null) {
          return { ...r, year: r.year ?? year, month: r.month ?? month }
        }
        return r
      }),
    }
  } else {
    result.categoryTimeSales = { records: [] }
  }

  // prevYearCategoryTimeSales は DB に保存しないため読み込まない

  // departmentKpi — envelope unwrap
  const rawDeptKpi = await dbGet<unknown>(STORE_MONTHLY, monthKey(year, month, 'departmentKpi'))
  const deptKpiUnwrapped = unwrapEnvelope<{ records: unknown[] }>(rawDeptKpi, year, month)
  const deptKpiObj = deptKpiUnwrapped?.value
  result.departmentKpi = deptKpiObj && Array.isArray(deptKpiObj.records)
    ? deptKpiObj
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
  deleteEntries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'classifiedSales') })
  deleteEntries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'categoryTimeSales') })
  deleteEntries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'departmentKpi') })
  deleteEntries.push({ storeName: STORE_MONTHLY, key: summaryKey(year, month) })

  // lastSession が当該年月の場合はメタデータも削除
  const meta = await getPersistedMeta()
  if (meta && meta.year === year && meta.month === month) {
    deleteEntries.push({ storeName: STORE_META, key: 'lastSession' })
  }

  await dbBatchDelete(deleteEntries)

  // sessions 一覧から削除対象月を除去
  const existing = await dbGet<SessionEntry[]>(STORE_META, 'sessions')
  if (Array.isArray(existing)) {
    const updated = existing.filter((s) => !(s.year === year && s.month === month))
    await dbBatchPut([{ storeName: STORE_META, key: 'sessions', value: updated }])
  }
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
  deleteEntries.push({ storeName: STORE_META, key: 'sessions' })
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
  const raw = await dbGet<unknown>(STORE_MONTHLY, key)
  const unwrapped = unwrapEnvelope<T>(raw, year, month)
  return unwrapped?.value ?? null
}

/** sessions メタデータエントリの型 */
interface SessionEntry {
  readonly year: number
  readonly month: number
  readonly savedAt: string
}

/**
 * sessions 一覧メタデータを更新する。
 * 保存トランザクションの entries に追加して原子的に更新する。
 */
async function updateSessionsList(
  entries: { storeName: string; key: string; value: unknown }[],
  year: number,
  month: number,
  savedAt: string,
): Promise<void> {
  const existing = await dbGet<SessionEntry[]>(STORE_META, 'sessions')
  const sessions: SessionEntry[] = Array.isArray(existing) ? existing.filter(
    (s) => !(s.year === year && s.month === month),
  ) : []
  sessions.push({ year, month, savedAt })
  sessions.sort((a, b) => b.year - a.year || b.month - a.month)
  entries.push({ storeName: STORE_META, key: 'sessions', value: sessions })
}

/**
 * IndexedDB に保存されている全ての年月を一覧取得する。
 * sessions メタデータがあれば高速に返し、なければキーをパースしてフォールバック。
 */
export async function listStoredMonths(): Promise<{ year: number; month: number }[]> {
  // 新形式: sessions メタデータから取得（高速）
  const sessions = await dbGet<SessionEntry[]>(STORE_META, 'sessions')
  if (Array.isArray(sessions) && sessions.length > 0) {
    return sessions.map((s) => ({ year: s.year, month: s.month }))
  }

  // 旧形式フォールバック: キーをパース
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
    { type: 'classifiedSales', label: '分類別売上' },
    { type: 'categoryTimeSales', label: '分類別時間帯売上' },
    { type: 'departmentKpi', label: '部門KPI' },
    { type: 'stores', label: '店舗' },
    { type: 'suppliers', label: '取引先' },
    { type: 'settings', label: '在庫設定' },
    { type: 'budget', label: '予算' },
  ]

  const results: { dataType: string; label: string; recordCount: number }[] = []
  for (const { type, label } of SUMMARY_TYPES) {
    const raw = await dbGet<unknown>(STORE_MONTHLY, monthKey(year, month, type))
    // envelope 対応: unwrap してから中身をカウント
    const unwrapped = unwrapEnvelope<unknown>(raw, year, month)
    const val = unwrapped?.value
    if (!val) {
      results.push({ dataType: type, label, recordCount: 0 })
      continue
    }
    let count = 0
    if (type === 'classifiedSales' || type === 'categoryTimeSales' || type === 'departmentKpi') {
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
  classifiedSales: '分類別売上',
  interStoreIn: '店間入',
  interStoreOut: '店間出',
  flowers: '花',
  directProduce: '産直',
  consumables: '消耗品',
}

// ─── StoreDaySummaryCache 永続化 ─────────────────────────

/** サマリーキャッシュのストレージキー */
function summaryKey(year: number, month: number): string {
  return monthKey(year, month, 'summaryCache')
}

/**
 * StoreDaySummaryCache を IndexedDB に保存する。
 * ソースデータ保存と同じトランザクションに含めることも可能だが、
 * サマリーは再生成可能なため別途保存で十分。
 */
export async function saveStoreDaySummaryCache(
  cache: StoreDaySummaryCache,
  year: number,
  month: number,
): Promise<void> {
  const key = summaryKey(year, month)
  await dbBatchPut([{
    storeName: STORE_MONTHLY,
    key,
    value: cache,
  }])
}

/**
 * StoreDaySummaryCache を IndexedDB から読み込む。
 * フィンガープリントの検証は呼び出し側で行う。
 * 保存されていない場合は null を返す。
 */
export async function loadStoreDaySummaryCache(
  year: number,
  month: number,
): Promise<StoreDaySummaryCache | null> {
  const key = summaryKey(year, month)
  const raw = await dbGet<StoreDaySummaryCache>(STORE_MONTHLY, key)
  if (!raw) return null

  // 基本的な構造チェック
  if (
    typeof raw !== 'object' ||
    typeof raw.sourceFingerprint !== 'string' ||
    typeof raw.builtAt !== 'string' ||
    typeof raw.summaries !== 'object' ||
    raw.summaries === null
  ) {
    console.warn('[IndexedDBStore] Invalid StoreDaySummaryCache structure, returning null')
    return null
  }

  return raw
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
    if (dt === 'classifiedSales') {
      entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'classifiedSales'), value: wrapEnvelope(data.classifiedSales, year, month) })
      continue
    }
    if (dt === 'categoryTimeSales') {
      entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'categoryTimeSales'), value: wrapEnvelope(data.categoryTimeSales, year, month) })
      continue
    }
    if (dt === 'departmentKpi') {
      entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'departmentKpi'), value: wrapEnvelope(data.departmentKpi, year, month) })
      continue
    }
    // initialSettings / budget は
    // DataType として存在するがストレージでは個別フィールドとして保存しない（composite type）
    // → STORE_DAY_FIELDS で一致するもののみ保存
    const fieldDef = STORE_DAY_FIELDS.find((f) => f.type === dt)
    if (fieldDef) {
      entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, dt), value: wrapEnvelope(data[fieldDef.field], year, month) })
    }
  }

  // 常に stores / suppliers / settings / budget を更新 — envelope 形式
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'stores'), value: wrapEnvelope(mapToObj(data.stores), year, month) })
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'suppliers'), value: wrapEnvelope(mapToObj(data.suppliers), year, month) })
  entries.push({ storeName: STORE_MONTHLY, key: monthKey(year, month, 'settings'), value: wrapEnvelope(mapToObj(data.settings), year, month) })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'budget'),
    value: wrapEnvelope(
      Object.fromEntries(
        Array.from(data.budget.entries()).map(([k, v]) => [k, budgetToSerializable(v)]),
      ),
      year,
      month,
    ),
  })

  // メタ更新
  const savedAt = new Date().toISOString()
  entries.push({
    storeName: STORE_META,
    key: 'lastSession',
    value: { year, month, savedAt } satisfies PersistedMeta,
  })

  // sessions 一覧を更新
  await updateSessionsList(entries, year, month, savedAt)

  await dbBatchPut(entries)
}

// ─── インポート履歴 ─────────────────────────────────────

/** インポート履歴のキー */
function importHistoryKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}_importHistory`
}

/**
 * インポート履歴を追加保存する（追記型）。
 * 最新のエントリが先頭に来る。最大20件まで保持。
 */
export async function saveImportHistory(
  year: number,
  month: number,
  entry: ImportHistoryEntry,
): Promise<void> {
  const key = importHistoryKey(year, month)
  const existing = await dbGet<ImportHistoryEntry[]>(STORE_MONTHLY, key)
  const history = Array.isArray(existing) ? existing : []
  history.unshift(entry)
  // 最大20件
  if (history.length > 20) history.length = 20
  await dbBatchPut([{ storeName: STORE_MONTHLY, key, value: history }])
}

/**
 * 指定年月のインポート履歴を読み込む。
 * 保存されていない場合は空配列を返す。
 */
export async function loadImportHistory(
  year: number,
  month: number,
): Promise<ImportHistoryEntry[]> {
  const key = importHistoryKey(year, month)
  const raw = await dbGet<ImportHistoryEntry[]>(STORE_MONTHLY, key)
  return Array.isArray(raw) ? raw : []
}
