/**
 * IndexedDB インポート履歴操作
 *
 * @responsibility R:unclassified
 */
import type { ImportHistoryEntry } from '@/domain/models/analysis'
import { dbGet, dbBatchPutWithReadModify, STORE_MONTHLY } from './dbHelpers'
import { importHistoryKey } from './keys'

/**
 * インポート履歴を追加保存する（追記型）。
 * 単一トランザクションで read-modify-write を原子的に実行する。
 * 最新のエントリが先頭に来る。最大20件まで保持。
 */
export async function saveImportHistory(
  year: number,
  month: number,
  entry: ImportHistoryEntry,
): Promise<void> {
  const key = importHistoryKey(year, month)
  await dbBatchPutWithReadModify(
    [],
    [
      {
        storeName: STORE_MONTHLY,
        key,
        modify: (existing) => {
          const history: ImportHistoryEntry[] = Array.isArray(existing)
            ? [...(existing as ImportHistoryEntry[])]
            : []
          history.unshift(entry)
          if (history.length > 20) history.length = 20
          return history
        },
      },
    ],
  )
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
