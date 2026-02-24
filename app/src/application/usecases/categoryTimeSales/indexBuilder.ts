/**
 * 分類別時間帯売上のインデックス構築
 *
 * 生の records[] 配列を (storeId, day) の複合キーでインデックス化する。
 * データインポート時に1回だけ実行される。
 */
import type { CategoryTimeSalesRecord, CategoryTimeSalesData } from '@/domain/models'
import type { CategoryTimeSalesIndex } from '@/domain/models'
import { EMPTY_CTS_INDEX } from '@/domain/models'

/**
 * CategoryTimeSalesData からインデックスを構築する。
 *
 * @param data パース済みの分類別時間帯売上データ
 * @returns (storeId, day) でインデックス化された構造
 */
export function buildCategoryTimeSalesIndex(
  data: CategoryTimeSalesData,
): CategoryTimeSalesIndex {
  const records = data.records
  if (records.length === 0) return EMPTY_CTS_INDEX

  const storeIds = new Set<string>()
  const allDays = new Set<number>()
  const byStoreDay = new Map<string, Map<number, CategoryTimeSalesRecord[]>>()

  for (const rec of records) {
    storeIds.add(rec.storeId)
    allDays.add(rec.day)

    let dayMap = byStoreDay.get(rec.storeId)
    if (!dayMap) {
      dayMap = new Map()
      byStoreDay.set(rec.storeId, dayMap)
    }

    let dayRecords = dayMap.get(rec.day)
    if (!dayRecords) {
      dayRecords = []
      dayMap.set(rec.day, dayRecords)
    }

    dayRecords.push(rec)
  }

  return {
    byStoreDay,
    storeIds,
    allDays,
    recordCount: records.length,
  }
}
