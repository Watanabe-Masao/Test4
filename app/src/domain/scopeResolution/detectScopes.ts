/**
 * detectScopes — パースされたレコードからインポート影響範囲を検出する
 *
 * 純粋関数。副作用なし。
 *
 * 入力: dataType と records のペア配列
 * 出力: ImportScope 配列（dataType × year × month ごとに1つ）
 *
 * @responsibility R:unclassified
 */

import type { DatedRecord } from '../models/DataTypes'
import type { ImportScope, RecordStorageDataType } from '../models/ScopeResolution'

/** detectScopes の入力1件 */
export interface ParsedRecordGroup {
  readonly dataType: RecordStorageDataType
  readonly records: readonly DatedRecord[]
}

/**
 * パースされたレコード群からインポートスコープを検出する。
 *
 * 1. レコードを dataType × (year, month) でグループ化
 * 2. dayFrom = min(day), dayTo = max(day)
 * 3. storeIds = incoming の storeId 集合
 * 4. deletePolicy = 'upsert-only'（デフォルト）
 *
 * INV-RS-01: dayFrom <= dayTo（空グループは除外されるため保証される）
 * INV-RS-14: storeIds は常に非空配列（空グループは除外されるため保証される）
 */
export function detectScopes(groups: readonly ParsedRecordGroup[]): readonly ImportScope[] {
  // dataType × year × month でグループ化
  const buckets = new Map<string, { records: DatedRecord[]; dataType: RecordStorageDataType }>()

  for (const group of groups) {
    for (const record of group.records) {
      const key = `${group.dataType}\t${record.year}\t${record.month}`
      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = { records: [], dataType: group.dataType }
        buckets.set(key, bucket)
      }
      bucket.records.push(record)
    }
  }

  const scopes: ImportScope[] = []

  for (const bucket of buckets.values()) {
    const { records, dataType } = bucket
    if (records.length === 0) continue

    let dayFrom = records[0].day
    let dayTo = records[0].day
    const storeIdSet = new Set<string>()
    const year = records[0].year
    const month = records[0].month

    for (const r of records) {
      if (r.day < dayFrom) dayFrom = r.day
      if (r.day > dayTo) dayTo = r.day
      storeIdSet.add(r.storeId)
    }

    scopes.push({
      dataType,
      year,
      month,
      dayFrom,
      dayTo,
      storeIds: [...storeIdSet],
      deletePolicy: 'upsert-only',
    })
  }

  return scopes
}
