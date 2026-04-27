/**
 * classifyChanges — 差分分類（純粋関数）
 *
 * incoming レコードと既存レコードを比較し、
 * add / update / delete に分類して ImportOperation を返す。
 *
 * INV-RS-05: add + update + skip + delete はスコープ内を網羅
 * INV-RS-08: 純粋関数（副作用なし、同じ入力に同じ出力）
 * INV-RS-13: deletePolicy 'upsert-only' のとき deletes は常に空
 *
 * @responsibility R:unclassified
 */

import type { DatedRecord } from '../models/DataTypes'
import type {
  ImportScope,
  ImportOperation,
  RecordAdd,
  RecordUpdate,
  RecordDelete,
  StoredRecord,
  RecordStorageDataType,
} from '../models/ScopeResolution'
import { naturalKey } from './naturalKey'
import { recordsEqual } from './recordsEqual'

/**
 * incoming レコードと既存レコードを比較し、変更を分類する。
 *
 * @param scope - インポートスコープ（deletePolicy を参照）
 * @param incomingRecords - 新しく取り込むレコード
 * @param existingRecords - DB に既存のレコード（queryScope 結果）
 * @returns ImportOperation — add/update/delete の分類結果
 */
export function classifyChanges(
  scope: ImportScope,
  incomingRecords: readonly DatedRecord[],
  existingRecords: readonly StoredRecord[],
): ImportOperation {
  const dataType: RecordStorageDataType = scope.dataType
  const incomingByKey = new Map<string, DatedRecord>()
  const duplicateKeys: string[] = []
  for (const r of incomingRecords) {
    const key = naturalKey(dataType, r)
    if (incomingByKey.has(key)) {
      duplicateKeys.push(key)
    }
    incomingByKey.set(key, r)
  }
  if (duplicateKeys.length > 0) {
    throw new Error(
      `classifyChanges: incoming に重複キーが ${duplicateKeys.length} 件あります。` +
        ` 先頭: ${duplicateKeys[0]}`,
    )
  }

  const existingByKey = new Map<string, StoredRecord>()
  for (const r of existingRecords) {
    existingByKey.set(r._naturalKey, r)
  }

  const adds: RecordAdd[] = []
  const updates: RecordUpdate[] = []
  const deletes: RecordDelete[] = []

  for (const [key, record] of incomingByKey) {
    const existing = existingByKey.get(key)
    if (!existing) {
      adds.push({ kind: 'add', naturalKey: key, record })
    } else if (!recordsEqual(record, existing)) {
      updates.push({ kind: 'update', naturalKey: key, record, previousRecord: existing })
    }
    // else: skip（同値）
  }

  // 削除は replace-scope の場合のみ
  if (scope.deletePolicy === 'replace-scope') {
    for (const [key, existing] of existingByKey) {
      if (!incomingByKey.has(key)) {
        deletes.push({ kind: 'delete', naturalKey: key, previousRecord: existing })
      }
    }
  }

  return { scope, adds, updates, deletes }
}
