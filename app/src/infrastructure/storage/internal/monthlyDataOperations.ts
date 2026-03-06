/**
 * IndexedDB 月次データ操作
 *
 * ImportedData の保存・読み込み・削除・サマリー取得。
 * 全書き込み操作は単一トランザクションで原子的に実行される。
 */
import type { ImportedData, DataType, StorageDataType } from '@/domain/models'
import type { BudgetData, InventoryConfig, Store, PersistedMeta } from '@/domain/models'
import { createEmptyImportedData } from '@/domain/models'
import type { ReadModifyWriteOp } from './dbHelpers'
import {
  openDB,
  dbGet,
  dbBatchDelete,
  dbGetAllKeys,
  dbBatchPutWithReadModify,
  dbAtomicDeleteWithReadModify,
  STORE_MONTHLY,
  STORE_META,
} from './dbHelpers'
import { monthKey, summaryKey, importHistoryKey, STORE_DAY_FIELDS, DATA_TYPE_LABELS } from './keys'
import {
  wrapEnvelope,
  unwrapEnvelope,
  mapToObj,
  budgetToSerializable,
  budgetFromSerializable,
  validateLoadedData,
} from './serialization'
import type { SessionEntry } from './metaOperations'
import { sessionsReadModifyOp } from './metaOperations'

/**
 * ImportedData を年月単位で IndexedDB に保存する。
 * 単一トランザクションで原子的に全データ + メタデータを書き込む。
 */
export async function saveImportedData(
  data: ImportedData,
  year: number,
  month: number,
): Promise<void> {
  const entries: { storeName: string; key: string; value: unknown }[] = []

  // StoreDayRecord 系 — envelope 形式で保存
  for (const { field, type } of STORE_DAY_FIELDS) {
    entries.push({
      storeName: STORE_MONTHLY,
      key: monthKey(year, month, type),
      value: wrapEnvelope(data[field], year, month),
    })
  }

  // Map 系 → plain object に変換して envelope で保存
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'stores'),
    value: wrapEnvelope(mapToObj(data.stores), year, month),
  })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'suppliers'),
    value: wrapEnvelope(mapToObj(data.suppliers), year, month),
  })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'settings'),
    value: wrapEnvelope(mapToObj(data.settings), year, month),
  })
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
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'classifiedSales'),
    value: wrapEnvelope(data.classifiedSales, year, month),
  })

  // prevYearClassifiedSales は DB に保存しない（実際の年月に classifiedSales として保存）

  // categoryTimeSales — envelope 形式で保存
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'categoryTimeSales'),
    value: wrapEnvelope(data.categoryTimeSales, year, month),
  })

  // prevYearCategoryTimeSales は DB に保存しない（実際の年月に categoryTimeSales として保存）

  // departmentKpi — envelope 形式で保存
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'departmentKpi'),
    value: wrapEnvelope(data.departmentKpi, year, month),
  })

  // メタデータ
  const savedAt = new Date().toISOString()
  entries.push({
    storeName: STORE_META,
    key: 'lastSession',
    value: { year, month, savedAt } satisfies PersistedMeta,
  })

  // sessions 一覧を原子的に read-modify-write で更新
  await dbBatchPutWithReadModify(entries, [sessionsReadModifyOp(year, month, savedAt)])
}

/**
 * 指定年月の ImportedData を IndexedDB から読み込む。
 * 単一 readonly トランザクションで全キーを一括取得し、一貫スナップショットを保証する。
 * 保存されていない場合は null を返す。
 * 基本的なスキーマ検証を行い、不整合があれば null を返す。
 */
export async function loadImportedData(year: number, month: number): Promise<ImportedData | null> {
  // 読み取り対象のキーとエイリアスを定義
  type KeyAlias = { key: string; alias: string }
  const keysToRead: KeyAlias[] = [
    ...STORE_DAY_FIELDS.map((f) => ({ key: monthKey(year, month, f.type), alias: f.field })),
    { key: monthKey(year, month, 'stores'), alias: 'stores' },
    { key: monthKey(year, month, 'suppliers'), alias: 'suppliers' },
    { key: monthKey(year, month, 'settings'), alias: 'settings' },
    { key: monthKey(year, month, 'budget'), alias: 'budget' },
    { key: monthKey(year, month, 'classifiedSales'), alias: 'classifiedSales' },
    { key: monthKey(year, month, 'categoryTimeSales'), alias: 'categoryTimeSales' },
    { key: monthKey(year, month, 'departmentKpi'), alias: 'departmentKpi' },
  ]

  // 単一 readonly トランザクションで全キーを一括取得
  const rawData = await (async () => {
    const db = await openDB()
    return new Promise<Map<string, unknown>>((resolve, reject) => {
      const tx = db.transaction(STORE_MONTHLY, 'readonly')
      const store = tx.objectStore(STORE_MONTHLY)
      const results = new Map<string, unknown>()
      for (const { key, alias } of keysToRead) {
        const req = store.get(key)
        req.onsuccess = () => {
          results.set(alias, req.result)
        }
      }
      tx.oncomplete = () => resolve(results)
      tx.onerror = () => reject(tx.error)
    })
  })()

  // stores キーの存在で当該年月にデータが保存されているかを判定する。
  const rawStoresEntry = rawData.get('stores')
  if (rawStoresEntry === undefined) return null

  const base = createEmptyImportedData()
  const result: Record<string, unknown> = { ...base }

  // StoreDayRecord 系 — envelope 対応（新旧どちらの形式も読める）
  for (const { field } of STORE_DAY_FIELDS) {
    const raw = rawData.get(field)
    const unwrapped = unwrapEnvelope<Record<string, unknown>>(raw, year, month)
    if (unwrapped && typeof unwrapped.value === 'object') {
      result[field] = unwrapped.value
    }
  }

  // stores — envelope unwrap
  const storesUnwrapped = unwrapEnvelope<Record<string, Store>>(rawStoresEntry, year, month)
  const storesObj = storesUnwrapped?.value
  result.stores =
    storesObj && typeof storesObj === 'object' ? new Map(Object.entries(storesObj)) : new Map()

  // suppliers — envelope unwrap
  const suppliersUnwrapped = unwrapEnvelope<Record<string, { code: string; name: string }>>(
    rawData.get('suppliers'),
    year,
    month,
  )
  const suppliersObj = suppliersUnwrapped?.value
  result.suppliers =
    suppliersObj && typeof suppliersObj === 'object'
      ? new Map(Object.entries(suppliersObj))
      : new Map()

  // settings — envelope unwrap
  const settingsUnwrapped = unwrapEnvelope<Record<string, InventoryConfig>>(
    rawData.get('settings'),
    year,
    month,
  )
  const settingsObj = settingsUnwrapped?.value
  result.settings =
    settingsObj && typeof settingsObj === 'object'
      ? new Map(Object.entries(settingsObj))
      : new Map()

  // budget — envelope unwrap
  const budgetUnwrapped = unwrapEnvelope<Record<string, Record<string, unknown>>>(
    rawData.get('budget'),
    year,
    month,
  )
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
  const csUnwrapped = unwrapEnvelope<{ records: unknown[] }>(
    rawData.get('classifiedSales'),
    year,
    month,
  )
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
  const ctsUnwrapped = unwrapEnvelope<{ records: unknown[] }>(
    rawData.get('categoryTimeSales'),
    year,
    month,
  )
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
  const deptKpiUnwrapped = unwrapEnvelope<{ records: unknown[] }>(
    rawData.get('departmentKpi'),
    year,
    month,
  )
  const deptKpiObj = deptKpiUnwrapped?.value
  result.departmentKpi =
    deptKpiObj && Array.isArray(deptKpiObj.records) ? deptKpiObj : { records: [] }

  // スキーマ検証
  if (!validateLoadedData(result)) {
    console.warn('[IndexedDBStore] Loaded data failed schema validation, returning null')
    return null
  }

  return result as unknown as ImportedData
}

/**
 * 指定年月のデータを全て削除する。
 * 単一トランザクションで月次データ削除 + メタデータ更新を原子的に実行する。
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
  // importHistory も削除
  deleteEntries.push({ storeName: STORE_MONTHLY, key: importHistoryKey(year, month) })

  // lastSession が当該年月の場合のみ条件付き削除
  const conditionalDeletes = [
    {
      storeName: STORE_META,
      key: 'lastSession',
      shouldDelete: (existing: unknown) => {
        if (!existing || typeof existing !== 'object') return false
        const meta = existing as { year?: number; month?: number }
        return meta.year === year && meta.month === month
      },
    },
  ]

  // sessions 一覧から削除対象月を除去（read-modify-write）
  const readModifyOps: ReadModifyWriteOp[] = [
    {
      storeName: STORE_META,
      key: 'sessions',
      modify: (existing) => {
        if (!Array.isArray(existing)) return []
        return (existing as SessionEntry[]).filter((s) => !(s.year === year && s.month === month))
      },
    },
  ]

  await dbAtomicDeleteWithReadModify(deleteEntries, conditionalDeletes, readModifyOps)
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
  dataType: StorageDataType,
): Promise<T | null> {
  const key = monthKey(year, month, dataType)
  const raw = await dbGet<unknown>(STORE_MONTHLY, key)
  const unwrapped = unwrapEnvelope<T>(raw, year, month)
  return unwrapped?.value ?? null
}

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
      entries.push({
        storeName: STORE_MONTHLY,
        key: monthKey(year, month, 'classifiedSales'),
        value: wrapEnvelope(data.classifiedSales, year, month),
      })
      continue
    }
    if (dt === 'categoryTimeSales') {
      entries.push({
        storeName: STORE_MONTHLY,
        key: monthKey(year, month, 'categoryTimeSales'),
        value: wrapEnvelope(data.categoryTimeSales, year, month),
      })
      continue
    }
    if (dt === 'departmentKpi') {
      entries.push({
        storeName: STORE_MONTHLY,
        key: monthKey(year, month, 'departmentKpi'),
        value: wrapEnvelope(data.departmentKpi, year, month),
      })
      continue
    }
    // initialSettings / budget は
    // DataType として存在するがストレージでは個別フィールドとして保存しない（composite type）
    // → STORE_DAY_FIELDS で一致するもののみ保存
    const fieldDef = STORE_DAY_FIELDS.find((f) => f.type === dt)
    if (fieldDef) {
      entries.push({
        storeName: STORE_MONTHLY,
        key: monthKey(year, month, fieldDef.type),
        value: wrapEnvelope(data[fieldDef.field], year, month),
      })
    }
  }

  // 常に stores / suppliers / settings / budget を更新 — envelope 形式
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'stores'),
    value: wrapEnvelope(mapToObj(data.stores), year, month),
  })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'suppliers'),
    value: wrapEnvelope(mapToObj(data.suppliers), year, month),
  })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'settings'),
    value: wrapEnvelope(mapToObj(data.settings), year, month),
  })
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

  // sessions 一覧を原子的に read-modify-write で更新
  await dbBatchPutWithReadModify(entries, [sessionsReadModifyOp(year, month, savedAt)])
}

/** 特定年月のデータ種別ごとのレコード数サマリーを取得する */
export async function getMonthDataSummary(
  year: number,
  month: number,
): Promise<{ dataType: StorageDataType; label: string; recordCount: number }[]> {
  const SUMMARY_TYPES: { type: StorageDataType; label: string }[] = [
    ...STORE_DAY_FIELDS.map((f) => ({ type: f.type, label: DATA_TYPE_LABELS[f.type] ?? f.type })),
    { type: 'classifiedSales', label: '分類別売上' },
    { type: 'categoryTimeSales', label: '分類別時間帯売上' },
    { type: 'departmentKpi', label: '部門KPI' },
    { type: 'stores', label: '店舗' },
    { type: 'suppliers', label: '取引先' },
    { type: 'settings', label: '在庫設定' },
    { type: 'budget', label: '予算' },
  ]

  const results: { dataType: StorageDataType; label: string; recordCount: number }[] = []
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
    if (type === 'stores' || type === 'suppliers' || type === 'settings' || type === 'budget') {
      count = Object.keys(val as Record<string, unknown>).length
    } else {
      // records 配列形式: { records: [...] }
      count = ((val as { records?: unknown[] }).records ?? []).length
    }
    results.push({ dataType: type, label, recordCount: count })
  }
  return results
}
