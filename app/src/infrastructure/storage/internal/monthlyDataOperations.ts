/**
 * IndexedDB 月次データ操作
 *
 * MonthlyData の保存・読み込み・削除・サマリー取得。
 * 全書き込み操作は単一トランザクションで原子的に実行される。
 */
import type { ReadModifyWriteOp } from './dbHelpers'
import {
  dbBatchDelete,
  dbGetAllKeys,
  dbAtomicDeleteWithReadModify,
  STORE_MONTHLY,
  STORE_META,
} from './dbHelpers'
import { monthKey, summaryKey, importHistoryKey, STORE_DAY_FIELDS } from './keys'
import type { SessionEntry } from './metaOperations'
import { rawFileStore } from '../rawFileStore'

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

  // rawFileStore / datasetRegistry のメタデータも削除
  // rawFile のキーパターン: rawFile:{year}-{month}:{dataType} および rawFile:meta:{year}-{month}
  // dataset のキーパターン: dataset:{year}-{month}
  deleteEntries.push({ storeName: STORE_META, key: `dataset:${year}-${month}` })
  deleteEntries.push({ storeName: STORE_META, key: `rawFile:meta:${year}-${month}` })

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

  // rawFile の個別 Blob キー（rawFile:{year}-{month}:{dataType}）も削除する。
  // メタキーは上の atomic delete で消済みだが、個別 Blob は dataType が動的なため別途削除。
  rawFileStore.clearMonth(year, month).catch((e) => {
    console.warn('[clearMonthData] rawFileStore.clearMonth failed:', e)
  })
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

  // STORE_META から rawFile:* と dataset:* キーも全削除
  const metaKeys = await dbGetAllKeys(STORE_META)
  for (const key of metaKeys) {
    if (key.startsWith('rawFile:') || key.startsWith('dataset:')) {
      deleteEntries.push({ storeName: STORE_META, key })
    }
  }

  await dbBatchDelete(deleteEntries)
}

// ── サブモジュール re-export ──

export { saveMonthlyDataInternal, saveDataSlice } from './monthlyDataSave'
export { loadMonthlyDataInternal, loadMonthlySlice, getMonthDataSummary } from './monthlyDataLoad'
