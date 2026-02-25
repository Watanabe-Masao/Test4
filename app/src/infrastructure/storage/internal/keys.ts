/**
 * IndexedDB ストレージキー生成とフィールドマッピング
 */
import type { ImportedData, StorageDataType } from '@/domain/models'

/** 年月×データ種別からストレージキーを生成する */
export function monthKey(year: number, month: number, dataType: StorageDataType): string {
  return `${year}-${String(month).padStart(2, '0')}_${dataType}`
}

/** サマリーキャッシュのストレージキー */
export function summaryKey(year: number, month: number): string {
  return monthKey(year, month, 'summaryCache')
}

/** インポート履歴のキー */
export function importHistoryKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}_importHistory`
}

/** StoreDayRecord 系のフィールド名 → DataType マッピング */
export const STORE_DAY_FIELDS: readonly { field: keyof ImportedData; type: StorageDataType }[] = [
  { field: 'purchase', type: 'purchase' },
  // classifiedSales は配列形式のため STORE_DAY_FIELDS には含めない（個別処理）
  { field: 'interStoreIn', type: 'interStoreIn' },
  { field: 'interStoreOut', type: 'interStoreOut' },
  { field: 'flowers', type: 'flowers' },
  { field: 'directProduce', type: 'directProduce' },
  { field: 'consumables', type: 'consumables' },
]

/** データ種別の日本語ラベル */
export const DATA_TYPE_LABELS: Partial<Record<StorageDataType, string>> = {
  purchase: '仕入',
  classifiedSales: '分類別売上',
  interStoreIn: '店間入',
  interStoreOut: '店間出',
  flowers: '花',
  directProduce: '産直',
  consumables: '消耗品',
}
