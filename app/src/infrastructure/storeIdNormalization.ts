/**
 * Store ID 正規化
 *
 * レコード系データの storeId を最終的な店舗マスタに基づいて正規化する。
 */
import type { ImportedData } from '@/domain/models/storeTypes'

/**
 * レコード系データ（classifiedSales / categoryTimeSales）の storeId を正規化する。
 *
 * ファイル処理順序によっては、classifiedSales 処理時にまだ purchase 由来の
 * 店舗マスタが存在せず、store 名→数値ID の逆引きが失敗して storeId に
 * 店舗名がそのまま入るケースがある。全ファイル処理後に最終的な stores マップ
 * を使って storeId を正規化する。
 */
export function normalizeRecordStoreIds(data: ImportedData): ImportedData {
  if (data.stores.size === 0) return data

  // 店舗名 → 数値ID の逆引きマップを最終 stores から構築
  const nameToId = new Map<string, string>()
  for (const [id, store] of data.stores) {
    nameToId.set(store.name, id)
  }

  // classifiedSales: storeId が店舗名のまま残っているレコードを修正
  let csChanged = false
  const csRecords = data.classifiedSales.records.map((rec) => {
    const resolvedId = nameToId.get(rec.storeId)
    if (resolvedId && resolvedId !== rec.storeId) {
      csChanged = true
      return { ...rec, storeId: resolvedId, storeName: rec.storeName || rec.storeId }
    }
    return rec
  })

  // categoryTimeSales: 同様に storeId を正規化
  let ctsChanged = false
  const ctsRecords = data.categoryTimeSales.records.map((rec) => {
    const resolvedId = nameToId.get(rec.storeId)
    if (resolvedId && resolvedId !== rec.storeId) {
      ctsChanged = true
      return { ...rec, storeId: resolvedId }
    }
    return rec
  })

  if (!csChanged && !ctsChanged) return data

  return {
    ...data,
    classifiedSales: csChanged ? { records: csRecords } : data.classifiedSales,
    categoryTimeSales: ctsChanged ? { records: ctsRecords } : data.categoryTimeSales,
  }
}
