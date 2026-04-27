/**
 * レコード同値判定
 *
 * メタフィールド（_id, _dataType, _importLogId, _naturalKey）を除外し、
 * キーをソートした JSON.stringify で deep comparison する。
 *
 * @responsibility R:unclassified
 */

import type { DatedRecord } from '../models/DataTypes'

/** メタフィールドとして除外するキーの prefix */
const META_PREFIX = '_'

/**
 * メタフィールドを除外したオブジェクトを返す。
 * _id, _dataType, _importLogId, _naturalKey 等を除く。
 */
function stripMeta(record: DatedRecord): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(record)) {
    if (!key.startsWith(META_PREFIX)) {
      result[key] = record[key as keyof typeof record]
    }
  }
  return result
}

/**
 * キーをソートした JSON.stringify。
 * ネストしたオブジェクト・配列も再帰的にキーソートする。
 *
 * JSON.stringify との差異:
 * - undefined → "null"（JSON.stringify は undefined を返すが、ここでは "null" に統一）
 * - NaN → "null"（JSON.stringify と同じ。NaN と null は同値扱いになる）
 */
export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number') {
    // NaN, Infinity → "null"（JSON.stringify 互換）
    if (!Number.isFinite(value)) return 'null'
    return JSON.stringify(value)
  }
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return '[' + value.map((v) => stableStringify(v)).join(',') + ']'
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
  return '{' + parts.join(',') + '}'
}

/**
 * 2つの DatedRecord がビジネスデータとして等価かを判定する。
 * メタフィールド（_ prefix）は比較対象外。
 *
 * INV-RS-16: 対称的かつ推移的。
 */
export function recordsEqual(a: DatedRecord, b: DatedRecord): boolean {
  return stableStringify(stripMeta(a)) === stableStringify(stripMeta(b))
}
