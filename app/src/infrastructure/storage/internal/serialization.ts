/**
 * IndexedDB シリアライズ / デシリアライズ / バリデーション
 */
import type { DataOrigin, DataEnvelope } from '@/domain/models'
import type { BudgetData } from '@/domain/models'
import { isEnvelope } from '@/domain/models'
import { hashData } from '@/domain/utilities/hash'
import { STORE_DAY_FIELDS } from './keys'

// ─── NaN / Infinity サニタイズ ────────────────────────────

/**
 * JSON シリアライズで失われる不正な数値（NaN, ±Infinity）を 0 に正規化する。
 * IndexedDB は structured clone なので NaN を保持できるが、
 * 下流の計算で予期せぬ結果を引き起こすため、保存前に除去する。
 */
export function sanitizeNumericValues<T>(value: T): T {
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
export function wrapEnvelope<T>(
  value: T,
  year: number,
  month: number,
  sourceFile?: string,
): DataEnvelope<T> {
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
export function unwrapEnvelope<T>(
  raw: unknown,
  year: number,
  month: number,
): { value: T; origin: DataOrigin | null } | null {
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
export function mapToObj<V>(map: ReadonlyMap<string, V>): Record<string, V> {
  const obj: Record<string, V> = {}
  for (const [k, v] of map) obj[k] = v
  return obj
}

/** BudgetData.daily (Map<number,number>) → plain object (Record<string,number>) */
export function budgetToSerializable(b: BudgetData): object {
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

export function budgetFromSerializable(obj: Record<string, unknown>): BudgetData | null {
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
      if (
        Number.isFinite(day) &&
        day >= 1 &&
        day <= 31 &&
        typeof v === 'number' &&
        Number.isFinite(v)
      ) {
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

// ─── スキーマ検証 ────────────────────────────────────────

/** 数値フィールドが有限数であることを検証する */
function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val)
}

/** records 配列形式 { records: [...] } であることを検証する */
function isValidStoreDayIndex(data: unknown): boolean {
  if (data == null) return true
  if (typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  // 新形式: { records: [...] }
  if ('records' in obj) {
    return Array.isArray(obj.records)
  }
  // 旧形式（マイグレーション前のデータ）: storeId → day → entry
  for (const days of Object.values(obj)) {
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
export function validateLoadedData(result: Record<string, unknown>): boolean {
  // StoreDayIndex 系: object であり、各エントリも object であること
  for (const { field } of STORE_DAY_FIELDS) {
    if (!isValidStoreDayIndex(result[field])) return false
  }
  // Map 系: Map インスタンスであること
  if (!(result.stores instanceof Map)) return false
  if (!(result.suppliers instanceof Map)) return false
  if (!(result.settings instanceof Map)) return false
  if (!(result.budget instanceof Map)) return false
  // classifiedSales: records 配列を持ち、各レコードが妥当であること
  const cs = result.classifiedSales as { records?: unknown } | undefined
  if (cs && !Array.isArray(cs.records)) return false
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
  if (cts && !Array.isArray(cts.records)) return false
  if (cts && Array.isArray(cts.records) && cts.records.length > 0) {
    const records = cts.records
    const indicesToCheck = [0, Math.floor(records.length / 2), records.length - 1]
    for (const idx of new Set(indicesToCheck)) {
      if (!isValidCTSRecord(records[idx])) return false
    }
  }
  // departmentKpi: records 配列を持つこと
  const dkpi = result.departmentKpi as { records?: unknown } | undefined
  if (dkpi && !Array.isArray(dkpi.records)) return false
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
