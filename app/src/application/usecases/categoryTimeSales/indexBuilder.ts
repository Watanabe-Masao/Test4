/**
 * 分類別時間帯売上のインデックス構築
 *
 * 生の records[] 配列を (storeId, dateKey) の複合キーでインデックス化する。
 * データインポート時に1回だけ実行される。
 *
 * ## dateKey ('YYYY-MM-DD')
 *
 * 各レコードの year/month/day から 'YYYY-MM-DD' 形式の ISO 8601 文字列キーを生成する。
 * 辞書順ソートが日付順と一致するため、月をまたぐ範囲クエリが可能。
 */
import type { CategoryTimeSalesRecord, CategoryTimeSalesData } from '@/domain/models'
import type { CategoryTimeSalesIndex } from '@/domain/models'
import { EMPTY_CTS_INDEX, toDateKeyFromParts } from '@/domain/models'
import type { DateKey } from '@/domain/models'

/**
 * CategoryTimeSalesData からインデックスを構築する。
 *
 * @param data パース済みの分類別時間帯売上データ（records に year/month/day を持つ）
 * @returns (storeId, dateKey) でインデックス化された構造
 */
export function buildCategoryTimeSalesIndex(
  data: CategoryTimeSalesData,
): CategoryTimeSalesIndex {
  const records = data.records
  if (records.length === 0) return EMPTY_CTS_INDEX

  const storeIds = new Set<string>()
  const allDateKeys = new Set<DateKey>()
  const byStoreDate = new Map<string, Map<DateKey, CategoryTimeSalesRecord[]>>()

  for (const rec of records) {
    storeIds.add(rec.storeId)

    const dateKey = toDateKeyFromParts(rec.year, rec.month, rec.day)
    allDateKeys.add(dateKey)

    let dateMap = byStoreDate.get(rec.storeId)
    if (!dateMap) {
      dateMap = new Map()
      byStoreDate.set(rec.storeId, dateMap)
    }
    let dateRecords = dateMap.get(dateKey)
    if (!dateRecords) {
      dateRecords = []
      dateMap.set(dateKey, dateRecords)
    }
    dateRecords.push(rec)
  }

  return {
    byStoreDate,
    storeIds,
    allDateKeys,
    recordCount: records.length,
  }
}
