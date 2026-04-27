/**
 * IndexedDB 月次データ読み込み
 *
 * MonthlyData 形式で読み込む。
 * public API は DataRepository (MonthlyData) → IndexedDBRepository 経由。
 *
 * @responsibility R:unclassified
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { StorageDataType } from '@/domain/models/storeTypes'
import type { BudgetData, InventoryConfig, Store } from '@/domain/models/record'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'
import { openDB, dbGet, STORE_MONTHLY } from './dbHelpers'
import { monthKey, STORE_DAY_FIELDS, DATA_TYPE_LABELS } from './keys'
import { unwrapEnvelope, budgetFromSerializable, validateLoadedData } from './serialization'

/**
 * 指定年月の MonthlyData を IndexedDB から読み込む。
 * 単一 readonly トランザクションで全キーを一括取得し、一貫スナップショットを保証する。
 * 保存されていない場合は null を返す。
 * 基本的なスキーマ検証を行い、不整合があれば null を返す。
 */
/** loadMonthlyDataInternal の戻り値 */
export interface LoadedMonthlyData {
  readonly data: MonthlyData
}

export async function loadMonthlyDataInternal(
  year: number,
  month: number,
): Promise<LoadedMonthlyData | null> {
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

  // 当該年月にデータが保存されているか判定: いずれかのキーに値があれば存在とみなす
  const rawStoresEntry = rawData.get('stores')
  if (rawStoresEntry === undefined) {
    const hasAnyData = Array.from(rawData.values()).some((v) => v !== undefined)
    if (!hasAnyData) return null
    // stores キーのみ欠損しているが他にデータがある場合は続行（stores は空 Map になる）
    console.warn(`[monthlyDataLoad] ${year}-${month}: stores key missing but other data exists`)
  }

  const base = createEmptyMonthlyData({ year: 0, month: 0, importedAt: '' })
  const result: Record<string, unknown> = { ...base }

  // StoreDayIndex 系 — envelope 対応（新旧どちらの形式も読める）
  for (const { field } of STORE_DAY_FIELDS) {
    const raw = rawData.get(field)
    const unwrapped = unwrapEnvelope<Record<string, unknown>>(raw, year, month)
    if (unwrapped && typeof unwrapped.value === 'object') {
      const val = unwrapped.value
      // 旧形式（storeId → day → entry マップ）を新形式（{ records: [] }）に変換
      if (!('records' in val) || !Array.isArray(val.records)) {
        result[field] = { records: [] }
      } else {
        result[field] = val
      }
    }
  }

  // provenance: 最初に見つかった envelope origin を保持
  let envelopeOrigin: import('@/domain/models/DataOrigin').DataOrigin | null = null
  const fallbackOrigin: import('@/domain/models/DataOrigin').DataOrigin = {
    year,
    month,
    importedAt: new Date().toISOString(),
  }

  // stores — envelope unwrap
  const storesUnwrapped = unwrapEnvelope<Record<string, Store>>(rawStoresEntry, year, month)
  if (storesUnwrapped?.origin && !envelopeOrigin) envelopeOrigin = storesUnwrapped.origin
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
  if (csUnwrapped?.origin && !envelopeOrigin) envelopeOrigin = csUnwrapped.origin
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
  // (useLoadComparisonData が実際の年月から classifiedSales を自動ロードする)

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

  // Set origin from envelope provenance or fallback
  result.origin = envelopeOrigin ?? fallbackOrigin
  return { data: result as unknown as MonthlyData }
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
