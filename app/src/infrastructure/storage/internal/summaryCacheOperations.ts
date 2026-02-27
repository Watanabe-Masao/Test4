/**
 * IndexedDB StoreDaySummaryCache 操作
 */
import type { StoreDaySummaryCache } from '@/domain/models'
import { dbGet, dbBatchPut, STORE_MONTHLY } from './dbHelpers'
import { summaryKey } from './keys'

/**
 * StoreDaySummaryCache を IndexedDB に保存する。
 * サマリーは再生成可能なため独立トランザクションで十分。
 */
export async function saveStoreDaySummaryCache(
  cache: StoreDaySummaryCache,
  year: number,
  month: number,
): Promise<void> {
  const key = summaryKey(year, month)
  await dbBatchPut([
    {
      storeName: STORE_MONTHLY,
      key,
      value: cache,
    },
  ])
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
