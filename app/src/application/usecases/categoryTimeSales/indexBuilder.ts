/**
 * 分類別時間帯売上のインデックス構築
 *
 * 生の records[] 配列を (storeId, dateKey) の複合キーでインデックス化する。
 * データインポート時に1回だけ実行される。
 *
 * ## dateKey (YYYYMMDD)
 *
 * 各レコードの year/month/day から YYYYMMDD 形式の数値キーを生成する。
 * これにより月をまたぐ日付範囲クエリが可能になる。
 *
 * ## 後方互換
 *
 * 移行期間中、byStoreDay (day のみキー) も同時に構築する。
 * 既存コードが byStoreDay を参照している場合でも動作を維持する。
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
  const allDays = new Set<number>()
  const byStoreDate = new Map<string, Map<DateKey, CategoryTimeSalesRecord[]>>()
  const byStoreDay = new Map<string, Map<number, CategoryTimeSalesRecord[]>>()

  for (const rec of records) {
    storeIds.add(rec.storeId)

    const dateKey = toDateKeyFromParts(rec.year, rec.month, rec.day)
    allDateKeys.add(dateKey)
    allDays.add(rec.day)

    // ── byStoreDate (dateKey ベース) ──
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

    // ── byStoreDay (後方互換) ──
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
    byStoreDate,
    storeIds,
    allDateKeys,
    recordCount: records.length,
    // 後方互換
    byStoreDay,
    allDays,
  }
}
